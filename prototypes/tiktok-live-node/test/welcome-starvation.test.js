import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createLiveInteractionEngine,
  createPriorityTaskQueue,
  getInteractionConfig,
} from '../src/interaction.js';

const silentLogger = { log() {}, warn() {}, error() {} };

function waitForQueue() {
  return new Promise((resolve) => setImmediate(resolve));
}

test('um tipo sozinho não pode ocupar a fila inteira', () => {
  const queue = createPriorityTaskQueue({
    maxPending: 12,
    maxPendingPerKind: 3,
    now: () => 0,
    logger: silentLogger,
  });

  let liberar;
  queue.enqueue({ kind: 'bloqueio', priority: 100, run: async () => new Promise((r) => { liberar = r; }) });

  const aceitos = [];
  for (let i = 0; i < 5; i += 1) {
    aceitos.push(queue.enqueue({ kind: 'question', priority: 80, run: async () => {} }).accepted);
  }

  assert.deepEqual(aceitos, [true, true, true, false, false], 'perguntas param no limite do tipo');

  // Com lugar reservado, a entrada continua sendo aceita mesmo com prioridade menor.
  const entrada = queue.enqueue({ kind: 'member', priority: 60, run: async () => {} });
  assert.equal(entrada.accepted, true);
  assert.equal(typeof liberar, 'function');
});

test('item que esperou demais passa na frente de prioridade maior', async () => {
  let agora = 0;
  const ordem = [];
  let liberar;
  const queue = createPriorityTaskQueue({
    maxPending: 12,
    maxPendingPerKind: 99,
    starvationMs: 100,
    now: () => agora,
    logger: silentLogger,
  });

  queue.enqueue({
    kind: 'bloqueio',
    priority: 80,
    run: async () => { ordem.push('bloqueio'); await new Promise((r) => { liberar = r; }); },
  });
  await waitForQueue();

  queue.enqueue({ kind: 'member', priority: 60, run: async () => { ordem.push('member'); } });
  agora = 10;
  queue.enqueue({ kind: 'question', priority: 80, run: async () => { ordem.push('q1'); } });
  agora = 500;
  queue.enqueue({ kind: 'question', priority: 80, run: async () => { ordem.push('q2'); } });

  liberar();
  await waitForQueue();
  await waitForQueue();
  await waitForQueue();
  await waitForQueue();

  assert.deepEqual(ordem, ['bloqueio', 'member', 'q1', 'q2']);
});

test('a saudação de entrada é falada mesmo com o chat cheio de perguntas', async () => {
  const falado = [];
  const config = {
    enabled: true,
    welcomeEnabled: true,
    welcomeBatchMs: 10000,
    welcomeCooldownMs: 15000,
    welcomeMaxNames: 3,
    openingEnabled: false,
    openingDelayMs: 0,
    ambientEnabled: false,
    ambientMinSilenceMs: 30000,
    ambientMaxSilenceMs: 45000,
    maxPending: 12,
    maxPendingPerKind: 4,
    starvationMs: 50,
  };

  const engine = createLiveInteractionEngine({
    config,
    speak: async (text, metadata) => {
      falado.push(metadata?.interactionKind || 'fala');
      await new Promise((r) => setTimeout(r, 5));
    },
    answerQuestion: async () => {
      falado.push('question');
      await new Promise((r) => setTimeout(r, 5));
    },
    logger: silentLogger,
  });

  // Chat movimentado: com AI_RESPOND_ALL todo comentário vira pergunta (prioridade 80).
  for (let i = 0; i < 30; i += 1) engine.onQuestion({ user: `pessoa${i}`, comment: `c${i}` });
  await waitForQueue();

  engine.onMember({ id: 'v1', name: 'Maria' });
  const enfileirada = engine.flushMembers();
  assert.equal(enfileirada.accepted, true, 'a entrada precisa caber na fila');

  await new Promise((r) => setTimeout(r, 400));

  assert.ok(falado.includes('member'), 'a saudação precisa ser falada, não apenas enfileirada');
  engine.stop();
});

test('a configuração traz limites de anti-inanição com padrões seguros', () => {
  const config = getInteractionConfig({});
  assert.equal(config.starvationMs, 20000);
  assert.equal(config.maxPendingPerKind, 4);
});
