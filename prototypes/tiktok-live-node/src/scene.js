import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

export const SCENE_STATES = Object.freeze({
  IDLE: 'idle',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
});

export const SCENE_VARIANTS = Object.freeze({
  SPONGEBOB: 'spongebob',
  INFLUENCER: 'influencer',
});

export const DEFAULT_SCENE_VARIANT = SCENE_VARIANTS.SPONGEBOB;

export const DEFAULT_SCENE_ASSETS = Object.freeze({
  [SCENE_VARIANTS.SPONGEBOB]: Object.freeze({
    idle: 'spongebob-idle-v1.mp4',
    thinking: 'spongebob-thinking-v1.mp4',
    speaking: 'spongebob-speaking-v1.mp4',
  }),
  [SCENE_VARIANTS.INFLUENCER]: Object.freeze({
    idle: 'influencer-idle-v1.mp4',
    thinking: 'influencer-thinking-v1.mp4',
    speaking: 'influencer-speaking-v1.mp4',
  }),
});

function isKnownState(state) {
  return Object.values(SCENE_STATES).includes(state);
}

function isKnownVariant(variant, assetsByVariant) {
  return Boolean(variant && assetsByVariant[variant]);
}

export function createSceneController({
  assetsDirectory = resolve('assets', 'mvp4'),
  variant = DEFAULT_SCENE_VARIANT,
  assetsByVariant = DEFAULT_SCENE_ASSETS,
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
  let currentVariant = isKnownVariant(variant, assetsByVariant)
    ? variant
    : DEFAULT_SCENE_VARIANT;

  function getVariantAssets() {
    return assetsByVariant[currentVariant] || assetsByVariant[DEFAULT_SCENE_VARIANT];
  }

  async function resolveAsset(state) {
    const assets = getVariantAssets();
    const requestedState = isKnownState(state) ? state : SCENE_STATES.IDLE;
    const requestedFile = assets[requestedState] || assets.idle;
    const requestedPath = resolve(assetsDirectory, requestedFile);

    if (await exists(requestedPath)) {
      return {
        variant: currentVariant,
        requestedState,
        state: requestedState,
        asset: requestedPath,
        fallbackUsed: false,
      };
    }

    const fallbackPath = resolve(assetsDirectory, assets.idle);
    const fallbackExists = await exists(fallbackPath);

    if (requestedState !== SCENE_STATES.IDLE) {
      logger.warn?.(
        `[CENA] ativo ausente para ${currentVariant}/${requestedState}; usando idle da mesma variante.`,
      );
    } else {
      logger.warn?.(
        `[CENA] ativo idle ausente para ${currentVariant}; prévia visual indisponível.`,
      );
    }

    return {
      variant: currentVariant,
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
      `[CENA] variante=${currentVariant} ${previousState} -> ${currentState} | ativo=${selection.asset || 'nenhum'}${selection.fallbackUsed ? ' fallback=true' : ''}`,
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

  function getVariant() {
    return currentVariant;
  }

  function setVariant(nextVariant) {
    if (!isKnownVariant(nextVariant, assetsByVariant)) {
      logger.warn?.(
        `[CENA] variante desconhecida "${nextVariant}"; mantendo ${currentVariant}.`,
      );
      return currentVariant;
    }

    if (nextVariant !== currentVariant) {
      logger.log?.(`[CENA] variante ${currentVariant} -> ${nextVariant}`);
      currentVariant = nextVariant;
      currentState = SCENE_STATES.IDLE;
    }

    return currentVariant;
  }

  return {
    getState,
    getVariant,
    resolveAsset,
    reset,
    setVariant,
    transitionTo,
  };
}
