import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createLiveInteractionEngine,
  createPriorityTaskQueue,
  formatWelcome,
  getInteractionConfig,
  loadInteractionLines,
  sanitizeSpokenName,
  shouldThankGift,
} from '../src/interaction.js';

const enabledConfig = {
  enabled: true,
  linesFile: 'config/live-lines.json',
  openingEnabled: false,
  openingDelayMs: 3000,
  welcomeEnabled: true,
  welcomeBatchMs: 10000,
  welcomeCooldownMs: 15000,
  welcomeMaxNames: 3,
  ambientEnabled: false,
  ambientMinSilenceMs: 30000,
  ambientMaxSilenceMs: 45000,
  maxPending: 12,
};

function waitForQueue() {
  return new Promise((resolve) => setImmediate(resolve));
}

test('configura a interação com limites seguros', () => {
  const config = getInteractionConfig({
    INTERACTION_ENABLED: 'true',
    INTERACTION_WELCOME_BATCH_MS: '1',
    INTERACTION_WELCOME_MAX_NAMES: '99',
    INTERACTION_AMBIENT_SILENCE_MS: '5000',
  });

  assert.equal(config.enabled, true);
  assert.equal(config.welcomeBatchMs, 1000);
  assert.equal(config.welcomeMaxNames, 5);
  assert.equal(config.ambientSilenceMs, 10000);
  assert.equal(config.ambientMinSilenceMs, 10000);
  assert.equal(config.ambientMaxSilenceMs, 10000);
});

test('carrega falas editáveis do arquivo de configuração', () => {
  const lines = loadInteractionLines({
    filePath: 'config/live-lines.json',
    logger: { warn() {} },
  });

  assert.equal(lines.fallbackUsed, false);
  assert.ok(lines.opening.length >= 1);
  assert.ok(lines.ambient.length >= 20);
});

test('usa falas internas se o arquivo editável não existir', () => {
  const lines = loadInteractionLines({
    filePath: 'config/arquivo-inexistente.json',
    logger: { warn() {} },
  });

  assert.equal(lines.fallbackUsed, true);
  assert.ok(lines.ambient.length >= 1);
});

test('limpa nomes antes de pronunciá-los', () => {
  assert.equal(sanitizeSpokenName('@luis_boss-80!'), 'luis boss 80');
  assert.equal(sanitizeSpokenName('💥'), 'pessoal');
});

test('agradece presente em sequência apenas quando a sequência termina', () => {
  assert.equal(shouldThankGift({ giftType: 1, repeatEnd: false }), false);
  assert.equal(shouldThankGift({ giftType: 1, repeatEnd: true }), true);
  assert.equal(shouldThankGift({ giftType: 2, repeatEnd: false }), true);
});

test('agrupa boas-vindas sem narrar uma entrada por vez', () => {
  assert.equal(
    formatWelcome(['Ana', 'Beto', 'Caio', 'Duda'], 4, 3),
    'Olha quem chegou: Ana, Beto, Caio e mais 1 pessoa! Sejam muito bem-vindos à live!',
  );
});

test('fila executa uma fala por vez e prioriza o próximo item', async () => {
  const events = [];
  let releaseFirst;
  const queue = createPriorityTaskQueue({ logger: { error() {} } });

  queue.enqueue({
    kind: 'ambient',
    priority: 10,
    run: async () => {
      events.push('ambient-start');
      await new Promise((resolve) => { releaseFirst = resolve; });
      events.push('ambient-end');
    },
  });
  await waitForQueue();
  queue.enqueue({ kind: 'member', priority: 60, run: async () => events.push('member') });
  queue.enqueue({ kind: 'gift', priority: 100, run: async () => events.push('gift') });
  releaseFirst();
  await waitForQueue();
  await waitForQueue();

  assert.deepEqual(events, ['ambient-start', 'ambient-end', 'gift', 'member']);
});

test('motor agrupa membros e fala uma única mensagem', async () => {
  const spoken = [];
  const engine = createLiveInteractionEngine({
    config: enabledConfig,
    speak: async (text) => spoken.push(text),
    answerQuestion: async () => {},
    logger: { log() {}, error() {} },
  });

  engine.onMember({ id: '1', name: 'Ana' });
  engine.onMember({ id: '2', name: 'Beto' });
  engine.flushMembers();
  await waitForQueue();

  assert.equal(spoken.length, 1);
  assert.match(spoken[0], /Ana e Beto/);
  engine.stop();
});

test('motor não acumula duas perguntas pendentes do mesmo usuário', async () => {
  let releaseFirst;
  const answered = [];
  const engine = createLiveInteractionEngine({
    config: enabledConfig,
    speak: async () => {},
    answerQuestion: async ({ comment }) => {
      answered.push(comment);
      await new Promise((resolve) => { releaseFirst = resolve; });
    },
    logger: { log() {}, error() {} },
  });

  const first = engine.onQuestion({ user: 'Ana', comment: 'primeira' });
  await waitForQueue();
  const duplicate = engine.onQuestion({ user: 'Ana', comment: 'segunda' });
  assert.equal(first.accepted, true);
  assert.deepEqual(duplicate, { accepted: false, reason: 'duplicate' });
  releaseFirst();
  await waitForQueue();
  assert.deepEqual(answered, ['primeira']);
  engine.stop();
});

test('fala de ambiente só entra depois do período de silêncio', async () => {
  const scheduled = [];
  const spoken = [];
  let currentTime = 0;
  const engine = createLiveInteractionEngine({
    config: {
      ...enabledConfig,
      ambientEnabled: true,
      ambientMinSilenceMs: 35000,
      ambientMaxSilenceMs: 35000,
    },
    ambientLines: ['Fala de teste para o silêncio.'],
    speak: async (text) => spoken.push(text),
    answerQuestion: async () => {},
    logger: { log() {}, error() {} },
    now: () => currentTime,
    setTimer: (handler, delay) => {
      const timer = { handler, delay, cancelled: false };
      scheduled.push(timer);
      return timer;
    },
    clearTimer: (timer) => { timer.cancelled = true; },
  });

  engine.start();
  assert.equal(scheduled[0].delay, 35000);
  assert.deepEqual(spoken, []);

  currentTime = 35000;
  scheduled[0].handler();
  await waitForQueue();
  assert.deepEqual(spoken, ['Fala de teste para o silêncio.']);
  engine.stop();
});

test('fala de abertura começa somente quando o motor é iniciado', async () => {
  const scheduled = [];
  const spoken = [];
  const engine = createLiveInteractionEngine({
    config: {
      ...enabledConfig,
      openingEnabled: true,
      openingDelayMs: 3000,
    },
    openingLines: ['A LIVE começou de verdade.'],
    speak: async (text) => spoken.push(text),
    answerQuestion: async () => {},
    logger: { log() {}, error() {} },
    setTimer: (handler, delay) => {
      const timer = { handler, delay, cancelled: false };
      scheduled.push(timer);
      return timer;
    },
    clearTimer: (timer) => { timer.cancelled = true; },
  });

  assert.deepEqual(scheduled, []);
  engine.start();
  assert.equal(scheduled[0].delay, 3000);
  scheduled[0].handler();
  await waitForQueue();
  assert.deepEqual(spoken, ['A LIVE começou de verdade.']);
  engine.stop();
});


test('abertura usa vídeo quando existe e não chama TTS', async () => {
  const scheduled = [];
  const spoken = [];
  const videos = [];
  const engine = createLiveInteractionEngine({
    config: {
      ...enabledConfig,
      openingEnabled: true,
      openingDelayMs: 3000,
    },
    openingLines: ['fallback que não deve ser falado'],
    findOpeningVideo: () => ({ id: 'opening', video: 'abertura.mp4' }),
    playVideo: async (clip) => videos.push(clip),
    speak: async (text) => spoken.push(text),
    answerQuestion: async () => {},
    logger: { log() {}, error() {} },
    setTimer: (handler, delay) => {
      const timer = { handler, delay, cancelled: false };
      scheduled.push(timer);
      return timer;
    },
    clearTimer: (timer) => { timer.cancelled = true; },
  });

  engine.start();
  scheduled[0].handler();
  await waitForQueue();

  assert.equal(spoken.length, 0);
  assert.equal(videos.length, 1);
  assert.equal(videos[0].video, 'abertura.mp4');
  engine.stop();
});

test('ambiente usa vídeo e não cai para TTS quando a rotação está habilitada', async () => {
  const scheduled = [];
  const spoken = [];
  const videos = [];
  let currentTime = 0;
  const engine = createLiveInteractionEngine({
    config: {
      ...enabledConfig,
      ambientEnabled: true,
      ambientMinSilenceMs: 10000,
      ambientMaxSilenceMs: 10000,
    },
    ambientLines: ['fallback que não deve ser falado'],
    findAmbientVideo: () => ({ id: 'ambient-01', video: 'ambient-01.mp4' }),
    playVideo: async (clip) => videos.push(clip),
    speak: async (text) => spoken.push(text),
    answerQuestion: async () => {},
    logger: { log() {}, error() {} },
    now: () => currentTime,
    setTimer: (handler, delay) => {
      const timer = { handler, delay, cancelled: false };
      scheduled.push(timer);
      return timer;
    },
    clearTimer: (timer) => { timer.cancelled = true; },
  });

  engine.start();
  currentTime = 10000;
  scheduled[0].handler();
  await waitForQueue();

  assert.equal(spoken.length, 0);
  assert.equal(videos.length, 1);
  assert.equal(videos[0].video, 'ambient-01.mp4');
  engine.stop();
});

test('ambiente sem clipe disponível não usa TTS automático', async () => {
  const scheduled = [];
  const spoken = [];
  let currentTime = 0;
  const engine = createLiveInteractionEngine({
    config: {
      ...enabledConfig,
      ambientEnabled: true,
      ambientMinSilenceMs: 10000,
      ambientMaxSilenceMs: 10000,
    },
    ambientLines: ['não deve ser falado'],
    findAmbientVideo: () => null,
    playVideo: async () => {},
    speak: async (text) => spoken.push(text),
    answerQuestion: async () => {},
    logger: { log() {}, error() {} },
    now: () => currentTime,
    setTimer: (handler, delay) => {
      const timer = { handler, delay, cancelled: false };
      scheduled.push(timer);
      return timer;
    },
    clearTimer: (timer) => { timer.cancelled = true; },
  });

  engine.start();
  currentTime = 10000;
  scheduled[0].handler();
  await waitForQueue();

  assert.deepEqual(spoken, []);
  engine.stop();
});

test('vídeo de presente entra com prioridade máxima', async () => {
  const events = [];
  let releaseActive;
  const engine = createLiveInteractionEngine({
    config: enabledConfig,
    speak: async (text, metadata) => {
      events.push(metadata?.interactionKind || text);
      if (metadata?.interactionKind === 'member') {
        await new Promise((resolve) => { releaseActive = resolve; });
      }
    },
    answerQuestion: async () => events.push('question'),
    playVideo: async ({ id }) => events.push(id),
    logger: { log() {}, error() {} },
  });

  engine.onMember({ id: '1', name: 'Ana' });
  engine.flushMembers();
  await waitForQueue();

  engine.onVideo({ id: 'normal-video', video: 'normal.mp4' });
  engine.onGiftVideo({
    id: 'gift-rose-sandy',
    video: 'bob-gift-rosa-sandy-v1.mp4',
    user: 'Beto',
    giftName: 'Rose',
  });

  releaseActive();
  await waitForQueue();
  await waitForQueue();

  assert.deepEqual(events, ['member', 'gift-rose-sandy', 'normal-video']);
  engine.stop();
});
