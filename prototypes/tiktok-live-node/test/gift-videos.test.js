import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createGiftVideoRouter,
  getGiftVideoConfig,
  loadGiftVideos,
  validateGiftVideoAssets,
} from '../src/gift-videos.js';

describe('getGiftVideoConfig', () => {
  it('retorna defaults quando env está vazio', () => {
    const config = getGiftVideoConfig({});
    assert.equal(config.enabled, true);
    assert.equal(config.giftsFile, 'config/gift-videos.json');
    assert.equal(config.assetsDirectory, 'assets/mvp6');
  });

  it('respeita GIFT_VIDEOS_ENABLED=false', () => {
    assert.equal(getGiftVideoConfig({ GIFT_VIDEOS_ENABLED: 'false' }).enabled, false);
    assert.equal(getGiftVideoConfig({ GIFT_VIDEOS_ENABLED: '0' }).enabled, false);
  });

  it('lê GIFT_VIDEOS_FILE', () => {
    assert.equal(
      getGiftVideoConfig({ GIFT_VIDEOS_FILE: 'config/meus-presentes.json' }).giftsFile,
      'config/meus-presentes.json',
    );
  });
});

describe('loadGiftVideos', () => {
  const silentLogger = { warn: () => {}, log: () => {} };

  it('retorna entries vazias quando o arquivo não existe', () => {
    const result = loadGiftVideos({ filePath: 'config/nao-existe.json', logger: silentLogger });
    assert.deepEqual(result.entries, []);
    assert.equal(result.fallbackUsed, true);
  });

  it('carrega o arquivo real de config', () => {
    const cwd = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
    const result = loadGiftVideos({ filePath: 'config/gift-videos.json', cwd, logger: silentLogger });
    assert.equal(result.fallbackUsed, false);
    assert.ok(Array.isArray(result.entries));
    // rosa-sandy deve estar presente
    const entry = result.entries.find((e) => e.id === 'rosa-sandy');
    assert.ok(entry, 'esperava entrada rosa-sandy');
    assert.equal(entry.video, 'bob-gift-rosa-sandy-v1.mp4');
  });
});

describe('validateGiftVideoAssets', () => {
  it('reporta presentes e ausentes', () => {
    const entries = [
      { id: 'a', video: 'presente.mp4', normalizedNames: [], normalizedIds: [], cooldownMs: 60000 },
      { id: 'b', video: 'ausente.mp4', normalizedNames: [], normalizedIds: [], cooldownMs: 60000 },
    ];
    const result = validateGiftVideoAssets({
      entries,
      assetsDirectory: '/dir',
      exists: (p) => p.endsWith('presente.mp4'),
    });
    assert.deepEqual(result.present, ['presente.mp4']);
    assert.deepEqual(result.missing, ['ausente.mp4']);
    assert.equal(result.ok, false);
  });
});

describe('createGiftVideoRouter', () => {
  const makeEntry = (overrides = {}) => ({
    id: 'rosa-sandy',
    video: 'bob-gift-rosa-sandy-v1.mp4',
    normalizedNames: ['rosa', 'rose'],
    normalizedIds: ['12345'],
    cooldownMs: 60000,
    ...overrides,
  });

  it('hasEntries=false quando arquivo não existe', () => {
    const router = createGiftVideoRouter({ entries: [makeEntry()], presentFiles: new Set() });
    assert.equal(router.hasEntries, false);
    assert.equal(router.findVideo('rosa'), null);
  });

  it('hasEntries=true quando arquivo existe', () => {
    const router = createGiftVideoRouter({
      entries: [makeEntry()],
      presentFiles: new Set(['bob-gift-rosa-sandy-v1.mp4']),
      cooldownMs: 60000,
    });
    assert.equal(router.hasEntries, true);
  });

  it('casa por nome normalizado', () => {
    const router = createGiftVideoRouter({
      entries: [makeEntry()],
      presentFiles: new Set(['bob-gift-rosa-sandy-v1.mp4']),
    });
    const result = router.findVideo('Rosa');
    assert.ok(result);
    assert.equal(result.id, 'rosa-sandy');
    assert.equal(result.video, 'bob-gift-rosa-sandy-v1.mp4');
  });

  it('casa por giftId', () => {
    const router = createGiftVideoRouter({
      entries: [makeEntry()],
      presentFiles: new Set(['bob-gift-rosa-sandy-v1.mp4']),
    });
    const result = router.findVideo('qualquer-presente', '12345');
    assert.ok(result);
    assert.equal(result.id, 'rosa-sandy');
  });

  it('retorna null quando nome não bate', () => {
    const router = createGiftVideoRouter({
      entries: [makeEntry()],
      presentFiles: new Set(['bob-gift-rosa-sandy-v1.mp4']),
    });
    assert.equal(router.findVideo('coração', '99999'), null);
  });

  it('respeita cooldown', () => {
    let ts = 0;
    const router = createGiftVideoRouter({
      entries: [makeEntry({ cooldownMs: 5000 })],
      presentFiles: new Set(['bob-gift-rosa-sandy-v1.mp4']),
      now: () => ts,
    });
    const first = router.findVideo('rosa');
    assert.ok(first);
    router.markFired(first.id);
    // Ainda dentro do cooldown
    assert.equal(router.findVideo('rosa'), null);
    // Avança tempo
    ts = 5001;
    assert.ok(router.findVideo('rosa'));
  });

  it('markFired bloqueia chamadas subsequentes no cooldown', () => {
    let ts = 0;
    const router = createGiftVideoRouter({
      entries: [makeEntry({ cooldownMs: 10000 })],
      presentFiles: new Set(['bob-gift-rosa-sandy-v1.mp4']),
      now: () => ts,
    });
    router.findVideo('rosa');
    router.markFired('rosa-sandy');
    assert.equal(router.findVideo('rosa'), null);
  });
});
