import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

export const SCENE_STATES = Object.freeze({
  IDLE: 'idle',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
});

export const DEFAULT_SCENE_ASSETS = Object.freeze({
  idle: 'mvp4-idle-v1.mp4',
  thinking: 'mvp4-thinking-v1.mp4',
  speaking: 'mvp4-speaking-v1.mp4',
});

function isKnownState(state) {
  return Object.values(SCENE_STATES).includes(state);
}

export function createSceneController({
  assetsDirectory = resolve('assets', 'mvp4'),
  assets = DEFAULT_SCENE_ASSETS,
  exists = async (path) => {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  },
  logger = console,
} = {}) {
  let currentState = SCENE_STATES.IDLE;

  async function resolveAsset(state) {
    const requestedState = isKnownState(state) ? state : SCENE_STATES.IDLE;
    const requestedFile = assets[requestedState] || assets.idle;
    const requestedPath = resolve(assetsDirectory, requestedFile);

    if (await exists(requestedPath)) {
      return {
        requestedState,
        state: requestedState,
        asset: requestedPath,
        fallbackUsed: false,
      };
    }

    const fallbackPath = resolve(assetsDirectory, assets.idle);
    const fallbackExists = await exists(fallbackPath);

    if (requestedState !== SCENE_STATES.IDLE) {
      logger.warn?.(`[CENA] ativo ausente para ${requestedState}; usando idle.`);
    } else {
      logger.warn?.('[CENA] ativo idle ausente; prévia visual indisponível.');
    }

    return {
      requestedState,
      state: SCENE_STATES.IDLE,
      asset: fallbackExists ? fallbackPath : null,
      fallbackUsed: true,
      missingAsset: requestedPath,
    };
  }

  async function transitionTo(state, metadata = {}) {
    const selection = await resolveAsset(state);
    const previousState = currentState;
    currentState = selection.state;

    logger.log?.(
      `[CENA] ${previousState} -> ${currentState} | ativo=${selection.asset || 'nenhum'}${selection.fallbackUsed ? ' fallback=true' : ''}`,
    );

    return {
      ...selection,
      previousState,
      currentState,
      metadata,
    };
  }

  async function reset(metadata = {}) {
    return transitionTo(SCENE_STATES.IDLE, metadata);
  }

  function getState() {
    return currentState;
  }

  return {
    getState,
    resolveAsset,
    reset,
    transitionTo,
  };
}
