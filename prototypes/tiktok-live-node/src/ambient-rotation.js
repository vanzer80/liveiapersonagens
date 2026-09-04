import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Rotação de vídeos de ambiente do MVP 6.
 *
 * Controla a sequência (ou aleatoriedade controlada) dos clipes curtos que
 * servem de "apresentação contínua" da LIVE, alternando entre os vídeos
 * enquanto não há interação prioritária.
 *
 * Funciona com qualquer quantidade de vídeos configurados:
 *   - 0 vídeos → retorna null sempre (sistema cai de volta para TTS de ambiente).
 *   - N vídeos → percorre todos, evita repetição imediata, reinicia no final.
 *
 * Não cria fila independente: o chamador é responsável por inserir o clip
 * devolvido por next() na fila única de interação.
 */

export const DEFAULT_AMBIENT_ROTATION_COOLDOWN_SECONDS = 5;

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  return ['1', 'true', 'yes', 'sim', 'on'].includes(String(value).trim().toLowerCase());
}

function parseInteger(value, fallback, { min, max }) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function getAmbientRotationConfig(env = process.env) {
  return {
    enabled: parseBoolean(env.AMBIENT_ROTATION_ENABLED, false),
    rotationFile: String(env.AMBIENT_ROTATION_FILE || 'config/ambient-rotation.json').trim(),
    assetsDirectory: String(env.VIDEO_ASSETS_DIRECTORY || 'assets/mvp6').trim(),
    cooldownSeconds: parseInteger(
      env.AMBIENT_ROTATION_COOLDOWN_SECONDS,
      DEFAULT_AMBIENT_ROTATION_COOLDOWN_SECONDS,
      { min: 0, max: 3600 },
    ),
    shuffled: parseBoolean(env.AMBIENT_ROTATION_SHUFFLED, false),
  };
}

export function loadAmbientRotation({
  filePath = 'config/ambient-rotation.json',
  cwd = process.cwd(),
  cooldownSeconds = DEFAULT_AMBIENT_ROTATION_COOLDOWN_SECONDS,
  logger = console,
} = {}) {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);

  try {
    const parsed = JSON.parse(readFileSync(resolvedPath, 'utf8'));
    const rawClips = Array.isArray(parsed?.clips) ? parsed.clips : [];
    const fileCooldown = parsed?.cooldownSeconds;
    const fileShuffled = parsed?.shuffled === true;

    const clips = rawClips
      .map((item, index) => {
        const file = typeof item === 'string' ? item.trim() : String(item?.file ?? '').trim();
        const id = typeof item === 'string' ? `ambient-${index + 1}` : String(item?.id ?? `ambient-${index + 1}`).trim();
        if (!file) {
          logger.warn?.(`[ROTAÇÃO] entrada #${index} ignorada: sem nome de arquivo.`);
          return null;
        }
        return { id, file };
      })
      .filter(Boolean);

    const effectiveCooldown = Number.isFinite(Number(fileCooldown))
      ? Math.max(0, Number(fileCooldown))
      : cooldownSeconds;

    return {
      clips,
      cooldownMs: effectiveCooldown * 1000,
      shuffled: fileShuffled,
      source: resolvedPath,
      fallbackUsed: false,
    };
  } catch (error) {
    logger.warn?.(
      `[ROTAÇÃO] não foi possível carregar ${resolvedPath}; rotação desativada. ` +
        `${error instanceof Error ? error.message : error}`,
    );
    return {
      clips: [],
      cooldownMs: cooldownSeconds * 1000,
      shuffled: false,
      source: 'desativado',
      fallbackUsed: true,
    };
  }
}

/**
 * Valida quais arquivos da rotação existem fisicamente.
 * Não derruba o processo: apenas informa quais estão ausentes.
 */
export function validateAmbientAssets({
  clips = [],
  assetsDirectory = 'assets/mvp6',
  cwd = process.cwd(),
  exists = (candidate) => existsSync(candidate),
} = {}) {
  const directory = path.isAbsolute(assetsDirectory)
    ? assetsDirectory
    : path.resolve(cwd, assetsDirectory);

  const missing = [];
  const present = [];

  for (const clip of clips) {
    const target = path.resolve(directory, clip.file);
    if (exists(target)) present.push(clip.file);
    else missing.push(clip.file);
  }

  return { directory, present, missing, ok: missing.length === 0 };
}

/**
 * Cria o controlador de rotação.
 *
 * next() devolve o próximo clip disponível (respeitando arquivos ausentes e
 * cooldown) ou null quando não há clips configurados/disponíveis.
 *
 * Não usa setTimeout nem setInterval internamente: o temporizador externo
 * (no engine de interação) é responsável pelo cadência.
 */
export function createAmbientRotationController({
  clips = [],
  presentFiles = new Set(),
  cooldownMs = DEFAULT_AMBIENT_ROTATION_COOLDOWN_SECONDS * 1000,
  shuffled = false,
  now = () => Date.now(),
  logger = console,
} = {}) {
  // Filtra imediatamente os clips cujos arquivos não existem.
  const available = clips.filter((clip) => presentFiles.has(clip.file));

  if (!available.length) {
    return {
      clips: [],
      hasClips: false,
      next: () => null,
      markPlayed: () => {},
      reset: () => {},
    };
  }

  // Constrói a sequência: order aleatória ou original.
  let sequence = shuffled ? shuffle([...available]) : [...available];
  let cursor = 0;
  const lastPlayedAt = new Map();
  let lastPlayedId = null;

  function buildSequence() {
    const base = shuffled ? shuffle([...available]) : [...available];
    // Garante que o primeiro item da nova sequência não seja igual ao último tocado.
    if (base.length > 1 && lastPlayedId && base[0].id === lastPlayedId) {
      base.push(base.shift());
    }
    return base;
  }

  function next() {
    if (!sequence.length) return null;

    // Percorre até encontrar um clip disponível e fora de cooldown.
    for (let attempt = 0; attempt < sequence.length; attempt++) {
      if (cursor >= sequence.length) {
        sequence = buildSequence();
        cursor = 0;
      }

      const candidate = sequence[cursor];
      cursor++;

      const firedAt = lastPlayedAt.get(candidate.id);
      if (firedAt !== undefined && now() - firedAt < cooldownMs) {
        logger.log?.(
          `[ROTAÇÃO] ${candidate.file} em cooldown | restam ${Math.ceil((cooldownMs - (now() - firedAt)) / 1000)}s`,
        );
        continue;
      }

      return candidate;
    }

    // Todos em cooldown (ex.: só um clip e acabou de tocar).
    return null;
  }

  function markPlayed(id) {
    lastPlayedId = id;
    lastPlayedAt.set(id, now());
  }

  function reset() {
    lastPlayedAt.clear();
    lastPlayedId = null;
    cursor = 0;
    sequence = buildSequence();
  }

  return {
    clips: available,
    hasClips: available.length > 0,
    next,
    markPlayed,
    reset,
  };
}

// Fisher-Yates shuffle (sem mutação do array original).
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
