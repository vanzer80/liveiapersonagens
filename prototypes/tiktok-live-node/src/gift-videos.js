import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { normalizeTriggerText } from './video-triggers.js';

/**
 * Roteamento de presente → vídeo pré-gravado.
 *
 * Se o presente recebido (identificado por giftName ou giftId) tiver um vídeo
 * configurado E o arquivo existir, o roteador devolve o vídeo para reprodução.
 *
 * Caso contrário, devolve null e o chamador usa o agradecimento dinâmico por TTS
 * (comportamento anterior, preservado integralmente).
 *
 * Nunca gera TTS e vídeo ao mesmo tempo para o mesmo evento de presente.
 */

export function getGiftVideoConfig(env = process.env) {
  return {
    enabled: ['1', 'true', 'yes', 'sim', 'on'].includes(
      String(env.GIFT_VIDEOS_ENABLED ?? 'true').trim().toLowerCase(),
    ),
    giftsFile: String(env.GIFT_VIDEOS_FILE || 'config/gift-videos.json').trim(),
    assetsDirectory: String(env.VIDEO_ASSETS_DIRECTORY || 'assets/mvp6').trim(),
  };
}

function normalizeGiftMatcher(entry, index, logger) {
  const id = String(entry?.id ?? '').trim();
  const video = String(entry?.video ?? '').trim();

  if (!id || !video) {
    logger?.warn?.(`[PRESENTE] entrada de vídeo #${index} ignorada: precisa de id e video.`);
    return null;
  }

  const rawNames = Array.isArray(entry.giftNames) ? entry.giftNames : [];
  const rawIds = Array.isArray(entry.giftIds) ? entry.giftIds : [];

  const normalizedNames = [...new Set(
    rawNames
      .filter((n) => typeof n === 'string')
      .map((n) => normalizeTriggerText(n))
      .filter(Boolean),
  )];

  const normalizedIds = [...new Set(
    rawIds
      .filter((gid) => typeof gid === 'string' || typeof gid === 'number')
      .map((gid) => String(gid).trim())
      .filter(Boolean),
  )];

  if (!normalizedNames.length && !normalizedIds.length) {
    logger?.warn?.(`[PRESENTE] entrada "${id}" ignorada: precisa de ao menos um giftName ou giftId.`);
    return null;
  }

  return {
    id,
    video,
    normalizedNames,
    normalizedIds,
    cooldownMs: Number.isFinite(Number(entry?.cooldownSeconds))
      ? Math.max(0, Number(entry.cooldownSeconds)) * 1000
      : 60000,
  };
}

export function loadGiftVideos({
  filePath = 'config/gift-videos.json',
  cwd = process.cwd(),
  logger = console,
} = {}) {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);

  try {
    const parsed = JSON.parse(readFileSync(resolvedPath, 'utf8'));
    const rawGifts = Array.isArray(parsed?.gifts) ? parsed.gifts : [];

    const entries = rawGifts
      .map((entry, index) => normalizeGiftMatcher(entry, index, logger))
      .filter(Boolean);

    return { entries, source: resolvedPath, fallbackUsed: false };
  } catch (error) {
    logger.warn?.(
      `[PRESENTE] não foi possível carregar ${resolvedPath}; usando fallback TTS. ` +
        `${error instanceof Error ? error.message : error}`,
    );
    return { entries: [], source: 'desativado', fallbackUsed: true };
  }
}

/**
 * Verifica quais arquivos de vídeo de presente existem fisicamente.
 */
export function validateGiftVideoAssets({
  entries = [],
  assetsDirectory = 'assets/mvp6',
  cwd = process.cwd(),
  exists = (candidate) => existsSync(candidate),
} = {}) {
  const directory = path.isAbsolute(assetsDirectory)
    ? assetsDirectory
    : path.resolve(cwd, assetsDirectory);

  const present = [];
  const missing = [];

  for (const entry of entries) {
    const target = path.resolve(directory, entry.video);
    if (exists(target)) present.push(entry.video);
    else missing.push(entry.video);
  }

  return { directory, present, missing, ok: missing.length === 0 };
}

/**
 * Cria o roteador de presente → vídeo.
 *
 * findVideo(giftName, giftId?) → { id, video } | null
 *
 * Retorna null quando nenhum vídeo está configurado, o arquivo não existe ou
 * o presente está em cooldown. Nesse caso, o chamador deve usar o TTS dinâmico.
 */
export function createGiftVideoRouter({
  entries = [],
  presentFiles = new Set(),
  now = () => Date.now(),
  logger = console,
} = {}) {
  const lastFiredAt = new Map();

  // Filtra imediatamente entradas cujo vídeo não existe localmente.
  const available = entries.filter((entry) => presentFiles.has(entry.video));

  if (!available.length) {
    return {
      hasEntries: false,
      findVideo: () => null,
      markFired: () => {},
    };
  }

  return {
    hasEntries: true,
    findVideo(giftName, giftId = null) {
      const normalizedName = normalizeTriggerText(String(giftName || ''));
      const strId = giftId != null ? String(giftId).trim() : null;

      for (const entry of available) {
        // Tenta casar por ID primeiro (mais específico), depois por nome.
        const idMatch = strId && entry.normalizedIds.includes(strId);
        const nameMatch = entry.normalizedNames.some(
          (n) => normalizedName && (normalizedName === n || normalizedName.includes(n)),
        );

        if (!idMatch && !nameMatch) continue;

        const firedAt = lastFiredAt.get(entry.id);
        if (firedAt !== undefined && now() - firedAt < entry.cooldownMs) {
          logger.log?.(
            `[PRESENTE] vídeo=${entry.id} em cooldown | restam ${Math.ceil((entry.cooldownMs - (now() - firedAt)) / 1000)}s`,
          );
          return null;
        }

        return { id: entry.id, video: entry.video };
      }

      return null;
    },
    markFired(id) {
      lastFiredAt.set(id, now());
    },
  };
}
