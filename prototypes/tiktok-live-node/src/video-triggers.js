import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Manifesto interno de segurança: usado apenas se o arquivo editável estiver ausente ou inválido.
const DEFAULT_TRIGGERS = [
  { id: 'boas-vindas', video: 'bob-boas-vindas-v1.mp4', words: ['oi', 'olá', 'cheguei', 'primeira vez'] },
  { id: 'hamburguer', video: 'bob-hamburguer-v1.mp4', words: ['hambúrguer', 'hamburguer', 'siri cascudo', 'sanduíche'] },
  { id: 'fenda-biquini', video: 'bob-fenda-biquini-v1.mp4', words: ['fenda do biquíni', 'fenda do biquini', 'fundo do mar'] },
  { id: 'patrick', video: 'bob-patrick-v1.mp4', words: ['patrick', 'estrela do mar', 'estrela-do-mar'] },
  {
    id: 'convite-ia',
    video: 'bob-convite-ia-v1.mp4',
    ambient: true,
    words: ['como perguntar', 'como falar com você', 'como faço uma pergunta'],
  },
];

export const DEFAULT_VIDEO_COOLDOWN_SECONDS = 60;

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  return ['1', 'true', 'yes', 'sim', 'on'].includes(String(value).trim().toLowerCase());
}

function parseInteger(value, fallback, { min, max }) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function getVideoTriggerConfig(env = process.env) {
  return {
    enabled: parseBoolean(env.VIDEO_TRIGGERS_ENABLED, false),
    triggersFile: String(env.VIDEO_TRIGGERS_FILE || 'config/video-triggers.json').trim(),
    assetsDirectory: String(env.VIDEO_ASSETS_DIRECTORY || 'assets/mvp6').trim(),
    cooldownSeconds: parseInteger(env.VIDEO_TRIGGER_COOLDOWN_SECONDS, DEFAULT_VIDEO_COOLDOWN_SECONDS, {
      min: 0,
      max: 3600,
    }),
    ambientEnabled: parseBoolean(env.VIDEO_AMBIENT_ENABLED, false),
  };
}

// Minúsculas, sem acento e com pontuação/hífen virando separador.
// "Estrela-do-Mar!" e "estrela do mar" passam a ser o mesmo texto comparável.
export function normalizeTriggerText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// Compara por palavra/expressão inteira: " frase " dentro de " comentario ".
// Impede falso positivo por pedaço de outra palavra (ex.: "hamburgueria" não casa "hamburguer").
export function containsWholePhrase(normalizedComment, normalizedPhrase) {
  if (!normalizedComment || !normalizedPhrase) return false;
  return ` ${normalizedComment} `.includes(` ${normalizedPhrase} `);
}

function normalizeTrigger(raw, index, logger) {
  const id = String(raw?.id ?? '').trim();
  const video = String(raw?.video ?? '').trim();
  const words = Array.isArray(raw?.words) ? raw.words : null;

  if (!id || !video || !words) {
    logger?.warn?.(`[VÍDEO] gatilho #${index} ignorado: precisa de id, video e lista words.`);
    return null;
  }

  const phrases = [...new Set(
    words
      .filter((word) => typeof word === 'string')
      .map((word) => normalizeTriggerText(word))
      .filter(Boolean),
  )];

  if (!phrases.length) {
    logger?.warn?.(`[VÍDEO] gatilho "${id}" ignorado: nenhuma palavra válida.`);
    return null;
  }

  return {
    id,
    video,
    ambient: raw?.ambient === true,
    words: words.filter((word) => typeof word === 'string' && word.trim()),
    phrases,
  };
}

export function loadVideoTriggers({
  filePath = 'config/video-triggers.json',
  cwd = process.cwd(),
  cooldownSeconds = DEFAULT_VIDEO_COOLDOWN_SECONDS,
  logger = console,
} = {}) {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);
  let source = resolvedPath;
  let fallbackUsed = false;
  let rawTriggers;
  let fileCooldownSeconds;

  try {
    const parsed = JSON.parse(readFileSync(resolvedPath, 'utf8'));
    if (!Array.isArray(parsed?.triggers) || !parsed.triggers.length) {
      throw new Error('o campo triggers precisa ser uma lista não vazia');
    }
    rawTriggers = parsed.triggers;
    fileCooldownSeconds = parsed.cooldownSeconds;
  } catch (error) {
    logger?.warn?.(
      `[VÍDEO] não foi possível carregar ${resolvedPath}; usando gatilhos internos. ` +
        `${error instanceof Error ? error.message : error}`,
    );
    rawTriggers = DEFAULT_TRIGGERS;
    source = 'gatilhos-internos';
    fallbackUsed = true;
  }

  const triggers = rawTriggers
    .map((raw, index) => normalizeTrigger(raw, index, logger))
    .filter(Boolean);

  if (!triggers.length) {
    logger?.warn?.('[VÍDEO] nenhum gatilho válido no arquivo; usando gatilhos internos.');
    return {
      triggers: DEFAULT_TRIGGERS.map((raw, index) => normalizeTrigger(raw, index, logger)).filter(Boolean),
      cooldownMs: cooldownSeconds * 1000,
      source: 'gatilhos-internos',
      fallbackUsed: true,
    };
  }

  const effectiveCooldown = Number.isFinite(Number(fileCooldownSeconds))
    ? Math.max(0, Number(fileCooldownSeconds))
    : cooldownSeconds;

  return { triggers, cooldownMs: effectiveCooldown * 1000, source, fallbackUsed };
}

// Verifica se os MP4s declarados existem. Não derruba o processo: apenas informa.
export function validateVideoAssets({
  triggers = [],
  assetsDirectory = 'assets/mvp6',
  cwd = process.cwd(),
  exists = (candidate) => existsSync(candidate),
} = {}) {
  const directory = path.isAbsolute(assetsDirectory)
    ? assetsDirectory
    : path.resolve(cwd, assetsDirectory);

  const missing = [];
  const present = [];

  for (const trigger of triggers) {
    const target = path.resolve(directory, trigger.video);
    if (exists(target)) present.push(trigger.video);
    else missing.push(trigger.video);
  }

  return { directory, present, missing, ok: missing.length === 0 };
}

/**
 * Escolhe no máximo UM vídeo para o comentário.
 * Entre os gatilhos que casam, vence a expressão mais específica (mais palavras),
 * empatando pela ordem do arquivo de configuração. Gatilhos em cooldown são ignorados.
 */
export function matchVideoTrigger({
  comment,
  triggers = [],
  lastFiredAt = new Map(),
  now = 0,
  cooldownMs = DEFAULT_VIDEO_COOLDOWN_SECONDS * 1000,
} = {}) {
  const normalizedComment = normalizeTriggerText(comment);
  const blocked = [];
  let best = null;

  triggers.forEach((trigger, order) => {
    let matchedPhrase = null;
    let matchedTokens = 0;

    for (const phrase of trigger.phrases) {
      if (!containsWholePhrase(normalizedComment, phrase)) continue;
      const tokens = phrase.split(' ').length;
      if (tokens > matchedTokens || (tokens === matchedTokens && phrase.length > (matchedPhrase?.length ?? 0))) {
        matchedPhrase = phrase;
        matchedTokens = tokens;
      }
    }

    if (!matchedPhrase) return;

    const firedAt = lastFiredAt.get(trigger.id);
    if (firedAt !== undefined && now - firedAt < cooldownMs) {
      blocked.push({ id: trigger.id, remainingMs: cooldownMs - (now - firedAt) });
      return;
    }

    const candidate = { id: trigger.id, video: trigger.video, phrase: matchedPhrase, ambient: trigger.ambient, tokens: matchedTokens, order };
    if (
      !best ||
      candidate.tokens > best.tokens ||
      (candidate.tokens === best.tokens && candidate.order < best.order)
    ) {
      best = candidate;
    }
  });

  const match = best ? { id: best.id, video: best.video, phrase: best.phrase, ambient: best.ambient } : null;
  return { match, blocked };
}

export function createVideoTriggerMatcher({
  triggers = [],
  cooldownMs = DEFAULT_VIDEO_COOLDOWN_SECONDS * 1000,
  now = () => Date.now(),
  logger = console,
} = {}) {
  const lastFiredAt = new Map();

  return {
    triggers,
    cooldownMs,
    match(comment) {
      const { match, blocked } = matchVideoTrigger({
        comment,
        triggers,
        lastFiredAt,
        now: now(),
        cooldownMs,
      });

      for (const item of blocked) {
        logger?.log?.(
          `[VÍDEO] gatilho=${item.id} em cooldown | restam ${Math.ceil(item.remainingMs / 1000)}s`,
        );
      }

      return match;
    },
    // Chamado apenas quando o vídeo realmente entrou na fila, para não gastar
    // o cooldown com um disparo que foi recusado.
    markFired(id) {
      lastFiredAt.set(id, now());
    },
    findAmbient() {
      const candidate = triggers.find((trigger) => trigger.ambient);
      if (!candidate) return null;
      const firedAt = lastFiredAt.get(candidate.id);
      if (firedAt !== undefined && now() - firedAt < cooldownMs) return null;
      return { id: candidate.id, video: candidate.video, phrase: 'ambiente', ambient: true };
    },
    reset() {
      lastFiredAt.clear();
    },
  };
}
