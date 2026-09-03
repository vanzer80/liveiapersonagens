import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createLiveInteractionEngine,
  createPriorityTaskQueue,
  formatWelcome,
  getInteractionConfig,
  sanitizeSpokenName,
} from '../src/interaction.js';

const enabledConfig = {
  enabled: true,
  welcomeEnabled: true,
  welcomeBatchMs: 10000,
  welcomeCooldownMs: 15000,
  welcomeMaxNames: 3,
  ambientEnabled: false,
  ambientSilenceMs: 35000,
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
});

test('limpa nomes antes de pronunciá-los', () => {
  assert.equal(sanitizeSpokenName('@luis_boss-80!'), 'luis boss 80');
  assert.equal(sanitizeSpokenName('💥'), 'pessoal');
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
    config: { ...enabledConfig, ambientEnabled: true, ambientSilenceMs: 35000 },
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
