import assert from 'node:assert/strict';
import test from 'node:test';

import { createLiveSceneRuntime, getLiveSceneConfig } from '../src/live-scene.js';
import { createSceneController, SCENE_STATES, SCENE_VARIANTS } from '../src/scene.js';

function createPreviewDouble() {
  const selections = [];
  let starts = 0;
  let stops = 0;

  return {
    selections,
    get starts() {
      return starts;
    },
    get stops() {
      return stops;
    },
    async start() {
      starts += 1;
      return { url: 'http://127.0.0.1:3333' };
    },
    setScene(selection) {
      selections.push(selection);
    },
    async stop() {
      stops += 1;
    },
  };
}

function createEnabledRuntime({ exists = async () => true } = {}) {
  const config = {
    enabled: true,
    variant: SCENE_VARIANTS.SPONGEBOB,
    assetsDirectory: '/virtual-assets',
  };
  const controller = createSceneController({
    assetsDirectory: config.assetsDirectory,
    variant: config.variant,
    exists,
    logger: { log() {}, warn() {} },
  });
  const preview = createPreviewDouble();
  const runtime = createLiveSceneRuntime({
    config,
    controller,
    preview,
    browserOpener() {},
    logger: { log() {} },
  });

  return { controller, preview, runtime };
}

test('live scene is opt-in and defaults to the Bob variant', () => {
  const config = getLiveSceneConfig({});
  assert.equal(config.enabled, false);
  assert.equal(config.variant, SCENE_VARIANTS.SPONGEBOB);
});

test('starts the preview with the approved Bob asset family in idle', async () => {
  const { preview, runtime } = createEnabledRuntime();

  const result = await runtime.start();

  assert.equal(result.enabled, true);
  assert.equal(result.url, 'http://127.0.0.1:3333');
  assert.equal(preview.starts, 1);
  assert.equal(preview.selections.at(-1).currentState, SCENE_STATES.IDLE);
  assert.ok(preview.selections.at(-1).asset.endsWith('spongebob-idle-v1.mp4'));
});

test('drives thinking, speaking and idle from a real TTS playback lifecycle', async () => {
  const { preview, runtime } = createEnabledRuntime();
  await runtime.start();
  await runtime.showThinking({ user: 'viewer' });

  const result = await runtime.speak('resposta', {
    speaker: async (_text, { onPlaybackStart, onPlaybackEnd }) => {
      await onPlaybackStart({ voice: 'teste' });
      await onPlaybackEnd({ playbackDurationMs: 1000 });
      return { ok: true, playbackDurationMs: 1000 };
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(
    preview.selections.map((selection) => selection.currentState),
    [SCENE_STATES.IDLE, SCENE_STATES.THINKING, SCENE_STATES.SPEAKING, SCENE_STATES.IDLE],
  );
  assert.equal(runtime.getState(), SCENE_STATES.IDLE);
});

test('returns to idle when TTS fails before playback starts', async () => {
  const { preview, runtime } = createEnabledRuntime();
  await runtime.start();
  await runtime.showThinking({ user: 'viewer' });

  const result = await runtime.speak('resposta', {
    speaker: async () => ({ ok: false, error: 'falha simulada' }),
  });

  assert.equal(result.ok, false);
  assert.equal(preview.selections.at(-1).currentState, SCENE_STATES.IDLE);
  assert.equal(runtime.getState(), SCENE_STATES.IDLE);
});

test('refuses to start the live scene when an approved asset is missing', async () => {
  const { preview, runtime } = createEnabledRuntime({
    exists: async (path) => !path.endsWith('spongebob-speaking-v1.mp4'),
  });

  await assert.rejects(runtime.start(), /Ativos visuais ausentes/);
  assert.equal(preview.starts, 0);
});
