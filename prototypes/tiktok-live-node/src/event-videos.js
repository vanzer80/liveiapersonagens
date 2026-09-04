import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_EVENT_VIDEOS = {
  opening: [
    { id: 'opening-boas-vindas', video: 'bob-boas-vindas-v1.mp4' },
  ],
  ambient: Array.from({ length: 9 }, (_, index) => ({
    id: `ambient-${String(index + 1).padStart(2, '0')}`,
    video: `bob-ambient-${String(index + 1).padStart(2, '0')}-live-final-v1.mp4`,
  })),
  gifts: [
    {
      id: 'gift-rose-sandy',
      video: 'bob-gift-rosa-sandy-v1.mp4',
      names: ['rose', 'rosa', 'rosinha'],
      giftIds: [],
    },
  ],
};

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  return ['1', 'true', 'yes', 'sim', 'on'].includes(String(value).trim().toLowerCase());
}

function parseInteger(value, fallback, { min, max }) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function getEventVideoConfig(env = process.env) {
  return {
    enabled: parseBoolean(env.EVENT_VIDEOS_ENABLED, true),
    file: String(env.EVENT_VIDEOS_FILE || 'config/event-videos.json').trim(),
    openingEnabled: parseBoolean(env.VIDEO_OPENING_ENABLED, true),
    ambientEnabled: parseBoolean(env.VIDEO_AMBIENT_ENABLED, false),
    ambientIntervalMs: parseInteger(env.VIDEO_AMBIENT_INTERVAL_MS, 1000, {
      min: 250,
      max: 10000,
    }),
    giftEnabled: parseBoolean(env.GIFT_VIDEOS_ENABLED, true),
  };
}

export function normalizeEventName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function normalizeVideoItem(raw, index, group, logger) {
  const id = String(raw?.id ?? '').trim();
  const video = String(raw?.video ?? '').trim();

  if (!id || !video) {
    logger?.warn?.(`[EVENTO VÍDEO] ${group} #${index} ignorado: precisa de id e video.`);
    return null;
  }

  return { id, video };
}

function normalizeGiftItem(raw, index, logger) {
  const base = normalizeVideoItem(raw, index, 'gift', logger);
  if (!base) return null;

  const names = Array.isArray(raw?.names)
    ? [...new Set(raw.names.map(normalizeEventName).filter(Boolean))]
    : [];
  const giftIds = Array.isArray(raw?.giftIds)
    ? [...new Set(raw.giftIds.map((value) => String(value ?? '').trim()).filter(Boolean))]
    : [];

  if (!names.length && !giftIds.length) {
    logger?.warn?.(
      `[EVENTO VÍDEO] gift "${base.id}" ignorado: informe ao menos names ou giftIds.`,
    );
    return null;
  }

  return { ...base, names, giftIds };
}

function normalizeLibrary(parsed, logger) {
  const opening = Array.isArray(parsed?.opening)
    ? parsed.opening.map((item, index) => normalizeVideoItem(item, index, 'opening', logger)).filter(Boolean)
    : [];
  const ambient = Array.isArray(parsed?.ambient)
    ? parsed.ambient.map((item, index) => normalizeVideoItem(item, index, 'ambient', logger)).filter(Boolean)
    : [];
  const gifts = Array.isArray(parsed?.gifts)
    ? parsed.gifts.map((item, index) => normalizeGiftItem(item, index, logger)).filter(Boolean)
    : [];

  return { opening, ambient, gifts };
}

export function loadEventVideos({
  filePath = 'config/event-videos.json',
  cwd = process.cwd(),
  logger = console,
} = {}) {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);

  try {
    const parsed = JSON.parse(readFileSync(resolvedPath, 'utf8'));
    const library = normalizeLibrary(parsed, logger);
    if (!library.opening.length && !library.ambient.length && !library.gifts.length) {
      throw new Error('nenhum evento de vídeo válido foi encontrado');
    }

    return {
      ...library,
      source: resolvedPath,
      fallbackUsed: false,
    };
  } catch (error) {
    logger?.warn?.(
      `[EVENTO VÍDEO] não foi possível carregar ${resolvedPath}; usando manifesto interno. ` +
        `${error instanceof Error ? error.message : error}`,
    );
    return {
      ...normalizeLibrary(DEFAULT_EVENT_VIDEOS, logger),
      source: 'eventos-internos',
      fallbackUsed: true,
    };
  }
}

export function listEventVideos(library = {}) {
  const values = [
    ...(library.opening || []),
    ...(library.ambient || []),
    ...(library.gifts || []),
  ];
  const unique = new Map();
  for (const item of values) {
    if (item?.video && !unique.has(item.video)) unique.set(item.video, item);
  }
  return [...unique.values()];
}

export function validateEventVideoAssets({
  library = {},
  assetsDirectory = 'assets/mvp6',
  cwd = process.cwd(),
  exists = (candidate) => existsSync(candidate),
} = {}) {
  const directory = path.isAbsolute(assetsDirectory)
    ? assetsDirectory
    : path.resolve(cwd, assetsDirectory);
  const present = [];
  const missing = [];

  for (const item of listEventVideos(library)) {
    const target = path.resolve(directory, item.video);
    if (exists(target)) present.push(item.video);
    else missing.push(item.video);
  }

  return { directory, present, missing, ok: missing.length === 0 };
}

export function matchGiftVideo({ giftName, giftId, gifts = [] } = {}) {
  const normalizedName = normalizeEventName(giftName);
  const normalizedId = String(giftId ?? '').trim();

  if (normalizedId) {
    const byId = gifts.find((item) => item.giftIds?.includes(normalizedId));
    if (byId) return byId;
  }

  if (!normalizedName) return null;
  return gifts.find((item) => item.names?.includes(normalizedName)) || null;
}

export function createAmbientVideoRotation({ clips = [] } = {}) {
  let cursor = 0;

  return {
    next({ available = () => true } = {}) {
      if (!clips.length) return null;

      for (let offset = 0; offset < clips.length; offset += 1) {
        const index = (cursor + offset) % clips.length;
        const clip = clips[index];
        if (!available(clip)) continue;
        cursor = (index + 1) % clips.length;
        return clip;
      }

      return null;
    },
    reset() {
      cursor = 0;
    },
  };
}
