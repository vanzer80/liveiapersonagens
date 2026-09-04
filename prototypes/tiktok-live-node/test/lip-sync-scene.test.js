import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { resolve } from 'node:path';

import { createScenePreview } from '../src/scene-preview.js';
import { SCENE_STATES, SCENE_VARIANTS } from '../src/scene.js';

describe('Integração de Cena e Prévia com Lip Sync', () => {
  const assetsDir = resolve('assets', 'mvp4');
  const mediaDir = resolve('assets', 'mvp6');
  const lipsyncDir = resolve('assets', 'mvp7', 'lipsync');

  test('setScene sem lip-sync mantém lipSync.enabled como false', () => {
    const preview = createScenePreview({
      assetsDirectory: assetsDir,
      mediaDirectory: mediaDir,
      lipsyncDirectory: lipsyncDir,
    });

    const state = preview.setScene({
      variant: SCENE_VARIANTS.SPONGEBOB,
      currentState: SCENE_STATES.SPEAKING,
      asset: 'spongebob-speaking-v1.mp4',
      metadata: { lipSyncEnabled: false },
    });

    assert.equal(state.state, SCENE_STATES.SPEAKING);
    assert.equal(state.lipSync.enabled, false);
    assert.equal(state.lipSync.timeline, null);
  });

  test('setScene com lip-sync ativo e estado speaking ativa o compositor labial', () => {
    const preview = createScenePreview({
      assetsDirectory: assetsDir,
      mediaDirectory: mediaDir,
      lipsyncDirectory: lipsyncDir,
    });

    const sampleTimeline = [
      { startMs: 0, endMs: 200, viseme: 'MBP' },
      { startMs: 200, endMs: 500, viseme: 'A' },
      { startMs: 500, endMs: 700, viseme: 'REST' },
    ];

    const startedAt = Date.now();
    const state = preview.setScene({
      variant: SCENE_VARIANTS.SPONGEBOB,
      currentState: SCENE_STATES.SPEAKING,
      asset: 'spongebob-speaking-v1.mp4',
      metadata: {
        lipSyncEnabled: true,
        timeline: sampleTimeline,
        startedAt,
      },
    });

    assert.equal(state.state, SCENE_STATES.SPEAKING);
    assert.equal(state.lipSync.enabled, true);
    assert.deepEqual(state.lipSync.timeline, sampleTimeline);
    assert.equal(state.lipSync.startedAt, startedAt);
    assert.equal(state.lipSync.baseAssetUrl, '/lipsync/bob-neutral-base.png');
  });

  test('retorno ao idle desativa o lipSync automaticamente', () => {
    const preview = createScenePreview({
      assetsDirectory: assetsDir,
      mediaDirectory: mediaDir,
      lipsyncDirectory: lipsyncDir,
    });

    // 1. Entra em speaking com lip sync
    preview.setScene({
      variant: SCENE_VARIANTS.SPONGEBOB,
      currentState: SCENE_STATES.SPEAKING,
      asset: 'spongebob-speaking-v1.mp4',
      metadata: {
        lipSyncEnabled: true,
        timeline: [{ startMs: 0, endMs: 500, viseme: 'A' }],
      },
    });

    // 2. Volta para idle
    const state = preview.setScene({
      variant: SCENE_VARIANTS.SPONGEBOB,
      currentState: SCENE_STATES.IDLE,
      asset: 'spongebob-idle-v1.mp4',
      metadata: { reason: 'tts-playback-end' },
    });

    assert.equal(state.state, SCENE_STATES.IDLE);
    assert.equal(state.lipSync.enabled, false);
    assert.equal(state.lipSync.timeline, null);
  });

  test('playMedia desativa o lipSync e preserva reprodução de clipe', async () => {
    const preview = createScenePreview({
      assetsDirectory: assetsDir,
      mediaDirectory: mediaDir,
      lipsyncDirectory: lipsyncDir,
    });

    // Dispara playMedia com arquivo inválido para retorno imediato
    const result = await preview.playMedia({ file: '' });
    assert.equal(result.ok, false);

    const state = preview.getState();
    assert.equal(state.lipSync.enabled, false);
  });

  test('servidor HTTP serve arquivos estáticos de /lipsync/* com Content-Type image/png', async () => {
    const preview = createScenePreview({
      assetsDirectory: assetsDir,
      mediaDirectory: mediaDir,
      lipsyncDirectory: lipsyncDir,
      port: 0, // porta dinâmica
    });

    const { url } = await preview.start();
    try {
      const response = await fetch(`${url}/lipsync/mouth-rest.png`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'image/png');
      const arrayBuffer = await response.arrayBuffer();
      assert.ok(arrayBuffer.byteLength > 1000);
    } finally {
      await preview.stop();
    }
  });

  test('setScene com timeline vazia mantém lipSync desativado (fallback para speaking tradicional)', () => {
    const preview = createScenePreview({
      assetsDirectory: assetsDir,
      mediaDirectory: mediaDir,
      lipsyncDirectory: lipsyncDir,
    });

    const state = preview.setScene({
      variant: SCENE_VARIANTS.SPONGEBOB,
      currentState: SCENE_STATES.SPEAKING,
      asset: 'spongebob-speaking-v1.mp4',
      metadata: {
        lipSyncEnabled: true,
        timeline: [], // timeline vazia
      },
    });

    assert.equal(state.state, SCENE_STATES.SPEAKING);
    assert.equal(state.lipSync.enabled, false);
    assert.equal(state.lipSync.timeline, null);
  });

  test('setScene com timeline nula mantém lipSync desativado (fallback para speaking tradicional)', () => {
    const preview = createScenePreview({
      assetsDirectory: assetsDir,
      mediaDirectory: mediaDir,
      lipsyncDirectory: lipsyncDir,
    });

    const state = preview.setScene({
      variant: SCENE_VARIANTS.SPONGEBOB,
      currentState: SCENE_STATES.SPEAKING,
      asset: 'spongebob-speaking-v1.mp4',
      metadata: {
        lipSyncEnabled: true,
        timeline: null,
      },
    });

    assert.equal(state.state, SCENE_STATES.SPEAKING);
    assert.equal(state.lipSync.enabled, false);
  });
});
