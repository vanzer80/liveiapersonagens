import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAmbientVideoRotation,
  getEventVideoConfig,
  listEventVideos,
  loadEventVideos,
  matchGiftVideo,
  normalizeEventName,
  validateEventVideoAssets,
} from '../src/event-videos.js';

const silentLogger = { log() {}, warn() {}, error() {} };

test('carrega abertura, nove ambientes e presente Rosa', () => {
  const library = loadEventVideos({
    filePath: 'config/event-videos.json',
    logger: silentLogger,
  });

  assert.equal(library.fallbackUsed, false);
  assert.equal(library.opening.length, 1);
  assert.equal(library.ambient.length, 9);
  assert.equal(library.gifts.length, 1);
  assert.equal(listEventVideos(library).length, 11);
});

test('normaliza nome do presente sem acentos e caixa', () => {
  assert.equal(normalizeEventName(' RÓSA! '), 'rosa');
  assert.equal(normalizeEventName('Rosinha'), 'rosinha');
});

test('mapeia Rose, Rosa e Rosinha para o vídeo da Sandy', () => {
  const library = loadEventVideos({
    filePath: 'config/event-videos.json',
    logger: silentLogger,
  });

  for (const name of ['Rose', 'Rosa', 'Rosinha', 'ROSA']) {
    assert.equal(
      matchGiftVideo({ giftName: name, gifts: library.gifts })?.video,
      'bob-gift-rosa-sandy-v1.mp4',
    );
  }
});

test('giftId tem precedência quando configurado', () => {
  const gifts = [
    {
      id: 'gift-por-id',
      video: 'por-id.mp4',
      names: ['outro'],
      giftIds: ['5655'],
    },
  ];

  assert.equal(matchGiftVideo({ giftName: 'qualquer', giftId: 5655, gifts })?.id, 'gift-por-id');
});

test('rotação percorre nove clipes e volta ao primeiro', () => {
  const library = loadEventVideos({
    filePath: 'config/event-videos.json',
    logger: silentLogger,
  });
  const rotation = createAmbientVideoRotation({ clips: library.ambient });

  const selected = Array.from({ length: 10 }, () => rotation.next()?.video);

  assert.deepEqual(
    selected.slice(0, 9),
    Array.from({ length: 9 }, (_, index) =>
      `bob-ambient-${String(index + 1).padStart(2, '0')}-live-final-v1.mp4`
    ),
  );
  assert.equal(selected[9], 'bob-ambient-01-live-final-v1.mp4');
});

test('rotação pula arquivo indisponível', () => {
  const clips = [
    { id: '1', video: 'um.mp4' },
    { id: '2', video: 'dois.mp4' },
  ];
  const rotation = createAmbientVideoRotation({ clips });

  assert.equal(rotation.next({ available: (clip) => clip.video === 'dois.mp4' })?.video, 'dois.mp4');
});

test('valida presença dos ativos de evento sem derrubar o processo', () => {
  const library = loadEventVideos({
    filePath: 'config/event-videos.json',
    logger: silentLogger,
  });

  const result = validateEventVideoAssets({
    library,
    exists: (candidate) => !candidate.endsWith('bob-gift-rosa-sandy-v1.mp4'),
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ['bob-gift-rosa-sandy-v1.mp4']);
});

test('configuração padrão ativa eventos, abertura, ambiente e presentes', () => {
  const config = getEventVideoConfig({});

  assert.equal(config.enabled, true);
  assert.equal(config.openingEnabled, true);
  assert.equal(config.giftEnabled, true);
  assert.equal(config.ambientEnabled, true);
});
