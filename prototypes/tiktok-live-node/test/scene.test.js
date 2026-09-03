import assert from 'node:assert/strict';
import test from 'node:test';

import { createSceneController, SCENE_STATES } from '../src/scene.js';

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

test('starts in idle', () => {
  const controller = createSceneController({ exists: async () => true });
  assert.equal(controller.getState(), SCENE_STATES.IDLE);
});

test('transitions idle -> thinking -> speaking -> idle when assets exist', async () => {
  const controller = createSceneController({
    assetsDirectory: '/virtual-assets',
    exists: async () => true,
    logger: createMemoryLogger(),
  });

  const thinking = await controller.transitionTo(SCENE_STATES.THINKING);
  assert.equal(thinking.previousState, SCENE_STATES.IDLE);
  assert.equal(thinking.currentState, SCENE_STATES.THINKING);
  assert.equal(thinking.fallbackUsed, false);

  const speaking = await controller.transitionTo(SCENE_STATES.SPEAKING);
  assert.equal(speaking.previousState, SCENE_STATES.THINKING);
  assert.equal(speaking.currentState, SCENE_STATES.SPEAKING);

  const idle = await controller.reset();
  assert.equal(idle.previousState, SCENE_STATES.SPEAKING);
  assert.equal(idle.currentState, SCENE_STATES.IDLE);
});

test('missing non-idle asset falls back to idle without throwing', async () => {
  const logger = createMemoryLogger();
  const controller = createSceneController({
    assetsDirectory: '/virtual-assets',
    exists: async (path) => path.endsWith('mvp4-idle-v1.mp4'),
    logger,
  });

  const result = await controller.transitionTo(SCENE_STATES.SPEAKING);

  assert.equal(result.requestedState, SCENE_STATES.SPEAKING);
  assert.equal(result.currentState, SCENE_STATES.IDLE);
  assert.equal(result.fallbackUsed, true);
  assert.ok(result.asset.endsWith('mvp4-idle-v1.mp4'));
  assert.equal(controller.getState(), SCENE_STATES.IDLE);
  assert.ok(logger.entries.some(([level]) => level === 'warn'));
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

test('unknown state safely resolves to idle', async () => {
  const controller = createSceneController({
    assetsDirectory: '/virtual-assets',
    exists: async () => true,
    logger: createMemoryLogger(),
  });

  const result = await controller.transitionTo('unexpected-state');
  assert.equal(result.requestedState, SCENE_STATES.IDLE);
  assert.equal(result.currentState, SCENE_STATES.IDLE);
});
