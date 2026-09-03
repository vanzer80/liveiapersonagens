import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSceneController,
  DEFAULT_SCENE_VARIANT,
  SCENE_STATES,
  SCENE_VARIANTS,
} from '../src/scene.js';

function createMemoryLogger() {
  const entries = [];
  return {
    entries,
    log(message) {
      entries.push(['log', message]);
    },
    warn(message) {
      entries.push(['warn', message]);
    },
  };
}

test('starts in idle using the default visual variant', () => {
  const controller = createSceneController({ exists: async () => true });
  assert.equal(controller.getState(), SCENE_STATES.IDLE);
  assert.equal(controller.getVariant(), DEFAULT_SCENE_VARIANT);
});

test('transitions idle -> thinking -> speaking -> idle when assets exist', async () => {
  const controller = createSceneController({
    assetsDirectory: '/virtual-assets',
    variant: SCENE_VARIANTS.INFLUENCER,
    exists: async () => true,
    logger: createMemoryLogger(),
  });

  const thinking = await controller.transitionTo(SCENE_STATES.THINKING);
  assert.equal(thinking.previousState, SCENE_STATES.IDLE);
  assert.equal(thinking.currentState, SCENE_STATES.THINKING);
  assert.equal(thinking.variant, SCENE_VARIANTS.INFLUENCER);
  assert.equal(thinking.fallbackUsed, false);

  const speaking = await controller.transitionTo(SCENE_STATES.SPEAKING);
  assert.equal(speaking.previousState, SCENE_STATES.THINKING);
  assert.equal(speaking.currentState, SCENE_STATES.SPEAKING);

  const idle = await controller.reset();
  assert.equal(idle.previousState, SCENE_STATES.SPEAKING);
  assert.equal(idle.currentState, SCENE_STATES.IDLE);
});

test('missing influencer asset falls back only to influencer idle', async () => {
  const logger = createMemoryLogger();
  const controller = createSceneController({
    assetsDirectory: '/virtual-assets',
    variant: SCENE_VARIANTS.INFLUENCER,
    exists: async (path) => path.endsWith('influencer-idle-v1.mp4'),
    logger,
  });

  const result = await controller.transitionTo(SCENE_STATES.SPEAKING);

  assert.equal(result.requestedState, SCENE_STATES.SPEAKING);
  assert.equal(result.currentState, SCENE_STATES.IDLE);
  assert.equal(result.variant, SCENE_VARIANTS.INFLUENCER);
  assert.equal(result.fallbackUsed, true);
  assert.ok(result.asset.endsWith('influencer-idle-v1.mp4'));
  assert.equal(controller.getState(), SCENE_STATES.IDLE);
  assert.ok(logger.entries.some(([level]) => level === 'warn'));
});

test('missing SpongeBob asset falls back only to SpongeBob idle', async () => {
  const controller = createSceneController({
    assetsDirectory: '/virtual-assets',
    variant: SCENE_VARIANTS.SPONGEBOB,
    exists: async (path) => path.endsWith('spongebob-idle-v1.mp4'),
    logger: createMemoryLogger(),
  });

  const result = await controller.transitionTo(SCENE_STATES.THINKING);

  assert.equal(result.variant, SCENE_VARIANTS.SPONGEBOB);
  assert.equal(result.currentState, SCENE_STATES.IDLE);
  assert.equal(result.fallbackUsed, true);
  assert.ok(result.asset.endsWith('spongebob-idle-v1.mp4'));
  assert.ok(!result.asset.includes('influencer'));
});

test('switching variant resets state to idle and uses the selected asset family', async () => {
  const controller = createSceneController({
    assetsDirectory: '/virtual-assets',
    variant: SCENE_VARIANTS.INFLUENCER,
    exists: async () => true,
    logger: createMemoryLogger(),
  });

  await controller.transitionTo(SCENE_STATES.SPEAKING);
  assert.equal(controller.getState(), SCENE_STATES.SPEAKING);

  controller.setVariant(SCENE_VARIANTS.SPONGEBOB);

  assert.equal(controller.getVariant(), SCENE_VARIANTS.SPONGEBOB);
  assert.equal(controller.getState(), SCENE_STATES.IDLE);

  const thinking = await controller.transitionTo(SCENE_STATES.THINKING);
  assert.equal(thinking.variant, SCENE_VARIANTS.SPONGEBOB);
  assert.ok(thinking.asset.endsWith('spongebob-thinking-v1.mp4'));
});

test('unknown variant is ignored safely', () => {
  const controller = createSceneController({
    variant: SCENE_VARIANTS.INFLUENCER,
    exists: async () => true,
    logger: createMemoryLogger(),
  });

  const selected = controller.setVariant('unexpected-variant');
  assert.equal(selected, SCENE_VARIANTS.INFLUENCER);
  assert.equal(controller.getVariant(), SCENE_VARIANTS.INFLUENCER);
});

test('missing idle asset returns null visual asset and keeps process-safe state', async () => {
  const controller = createSceneController({
    assetsDirectory: '/virtual-assets',
    exists: async () => false,
    logger: createMemoryLogger(),
  });

  const result = await controller.reset();

  assert.equal(result.currentState, SCENE_STATES.IDLE);
  assert.equal(result.asset, null);
  assert.equal(result.fallbackUsed, true);
});

test('unknown state safely resolves to idle within the current variant', async () => {
  const controller = createSceneController({
    assetsDirectory: '/virtual-assets',
    variant: SCENE_VARIANTS.SPONGEBOB,
    exists: async () => true,
    logger: createMemoryLogger(),
  });

  const result = await controller.transitionTo('unexpected-state');
  assert.equal(result.requestedState, SCENE_STATES.IDLE);
  assert.equal(result.currentState, SCENE_STATES.IDLE);
  assert.equal(result.variant, SCENE_VARIANTS.SPONGEBOB);
  assert.ok(result.asset.endsWith('spongebob-idle-v1.mp4'));
});
