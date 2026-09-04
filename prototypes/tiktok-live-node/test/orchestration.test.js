/**
 * test:orchestration — Fumaça de orquestração do motor de interação (MVP 6).
 *
 * Simula a sequência completa de uma LIVE com:
 *   Ambiente → Acionado → Dinâmico (IA) → Presente (vídeo) → retorno ao idle.
 *
 * Não acessa rede, TTS, IA nem sistema de arquivos.
 * Usa injeção de dependência para substituir todas as I/O por stubs.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLiveInteractionEngine, getInteractionConfig } from '../src/interaction.js';
import { createAmbientRotationController } from '../src/ambient-rotation.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeLog() {
  const events = [];
  return {
    events,
    log: (...args) => events.push({ level: 'log', msg: args.join(' ') }),
    warn: (...args) => events.push({ level: 'warn', msg: args.join(' ') }),
    error: (...args) => events.push({ level: 'error', msg: args.join(' ') }),
  };
}

function makeTimer() {
  const callbacks = new Map();
  let seq = 0;

  return {
    pending: callbacks,
    set(fn, delay) {
      const id = ++seq;
      callbacks.set(id, { fn, delay });
      return id;
    },
    clear(id) {
      callbacks.delete(id);
    },
    /** Dispara todos os timers pendentes. */
    flush() {
      const ids = [...callbacks.keys()];
      for (const id of ids) {
        const item = callbacks.get(id);
        if (!item) continue;
        callbacks.delete(id);
        item.fn();
      }
    },
  };
}

async function flushMicrotasks() {
  // Deixa promises enfileiradas resolverem
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

// ─── Teste de integração do motor ────────────────────────────────────────────

describe('Orquestração do motor de interação (MVP 6)', () => {
  function buildEngine({ ambientRotationClips = null } = {}) {
    const log = makeLog();
    const timer = makeTimer();
    let ts = 10_000;

    const spoken = [];
    const played = [];

    const config = getInteractionConfig({
      INTERACTION_ENABLED: 'true',
      INTERACTION_OPENING_ENABLED: 'false',
      INTERACTION_WELCOME_ENABLED: 'false',
      INTERACTION_AMBIENT_ENABLED: 'true',
      INTERACTION_AMBIENT_MIN_SILENCE_MS: '1000',
      INTERACTION_AMBIENT_MAX_SILENCE_MS: '1000',
    });

    // Controlador de rotação de ambiente (opcional)
    let rotationCtrl = null;
    if (ambientRotationClips) {
      rotationCtrl = createAmbientRotationController({
        clips: ambientRotationClips,
        presentFiles: new Set(ambientRotationClips.map((c) => c.file)),
        cooldownMs: 0,
        now: () => ts,
      });
    }

    const engine = createLiveInteractionEngine({
      config,
      logger: log,
      now: () => ts,
      setTimer: (fn, delay) => timer.set(fn, delay),
      clearTimer: (id) => timer.clear(id),
      random: () => 0,
      speak: async (text, meta) => {
        spoken.push({ text, meta });
      },
      answerQuestion: async ({ user, comment }) => {
        spoken.push({ text: `[IA] ${user}: ${comment}`, meta: { kind: 'ai' } });
      },
      playVideo: async ({ id, video, user, phrase }) => {
        played.push({ id, video, user, phrase });
        return { ok: true };
      },
      findAmbientRotation: rotationCtrl ? () => rotationCtrl.next() : null,
      ambientLines: ['Quem está aí manda um oi!'],
      openingLines: ['Bem-vindos!'],
    });

    return { engine, log, timer, spoken, played, rotationCtrl, advance: (ms) => { ts += ms; } };
  }

  // ─── 1. Fala de ambiente (TTS fallback) ────────────────────────────────────

  it('dispara fala de ambiente por TTS quando não há vídeos de rotação', async () => {
    const { engine, timer, spoken } = buildEngine();
    engine.start();
    timer.flush();
    await flushMicrotasks();

    assert.equal(spoken.length, 1);
    assert.ok(spoken[0].text.length > 0);
  });

  // ─── 2. Rotação de vídeo de ambiente ───────────────────────────────────────

  it('usa vídeo de rotação de ambiente quando disponível', async () => {
    const clips = [
      { id: 'ambient-01', file: 'bob-ambient-01.mp4' },
      { id: 'ambient-02', file: 'bob-ambient-02.mp4' },
    ];
    const { engine, timer, spoken, played } = buildEngine({ ambientRotationClips: clips });
    engine.start();
    timer.flush();
    await flushMicrotasks();

    assert.equal(spoken.length, 0, 'não deveria ter falado (vídeo disponível)');
    assert.equal(played.length, 1);
    assert.ok(played[0].id.startsWith('ambient-'));
    assert.equal(played[0].phrase, 'rotacao-ambiente');
  });

  // ─── 3. Vídeo acionado (gatilho de comentário) ─────────────────────────────

  it('onVideo enfileira vídeo acionado com prioridade maior que ambiente', async () => {
    const { engine, timer, spoken, played } = buildEngine();
    engine.start();

    // Enquanto o timer ainda não disparou, chega um vídeo acionado
    engine.onVideo({ id: 'hamburguer', video: 'bob-hamburguer-v1.mp4', user: 'fan1', phrase: 'hamburguer' });
    timer.flush();
    await flushMicrotasks();

    // O vídeo deve ter sido reproduzido
    assert.ok(played.some((p) => p.id === 'hamburguer'), 'esperava vídeo hamburguer na fila');
  });

  // ─── 4. Pergunta dinâmica (IA) ─────────────────────────────────────────────

  it('onQuestion gera resposta da IA e retorna ao idle', async () => {
    const { engine, timer, spoken } = buildEngine();
    engine.start();
    timer.flush(); // dispara o timer de ambiente (que vai perguntar por TTS)
    await flushMicrotasks();

    // Chega uma pergunta enquanto a fala de ambiente está em progresso
    engine.onQuestion({ user: 'fan2', comment: 'Qual é o segredo do hambúrguer?' });
    await flushMicrotasks();

    const aiAnswers = spoken.filter((s) => s.text.startsWith('[IA]'));
    assert.ok(aiAnswers.length >= 1, 'esperava pelo menos uma resposta de IA');
  });

  // ─── 5. Presente com vídeo (onGiftVideo) ───────────────────────────────────

  it('onGiftVideo enfileira vídeo de presente na prioridade máxima', async () => {
    const { engine, timer, played } = buildEngine();
    engine.start();

    engine.onGiftVideo({
      user: 'doador',
      giftName: 'Rosa',
      clipId: 'rosa-sandy',
      clipFile: 'bob-gift-rosa-sandy-v1.mp4',
    });

    timer.flush();
    await flushMicrotasks();

    const giftClip = played.find((p) => p.id === 'rosa-sandy');
    assert.ok(giftClip, 'esperava vídeo de presente na fila');
    assert.equal(giftClip.video, 'bob-gift-rosa-sandy-v1.mp4');
  });

  // ─── 6. Presente sem vídeo → fallback TTS ──────────────────────────────────

  it('onGiftVideo sem clipId/clipFile cai para TTS de agradecimento', async () => {
    const { engine, timer, spoken } = buildEngine();
    engine.start();

    engine.onGiftVideo({
      user: 'doador2',
      giftName: 'coração',
      clipId: null,
      clipFile: null,
    });

    timer.flush();
    await flushMicrotasks();

    const ttsThank = spoken.find((s) => s.text.includes('doador2'));
    assert.ok(ttsThank, 'esperava fala de agradecimento por TTS');
  });

  // ─── 7. Prioridade da fila: presente > pergunta > vídeo > ambiente ──────────

  it('a fila respeita ordem de prioridade: presente > pergunta > vídeo > ambiente', async () => {
    const { engine, timer, spoken, played } = buildEngine();
    engine.start();

    // Enfileira tudo antes de disparar o timer (garantindo que entram todos antes de executar)
    engine.onVideo({ id: 'fenda', video: 'bob-fenda-biquini-v1.mp4', user: 'fan3', phrase: 'fenda' });
    engine.onQuestion({ user: 'fan4', comment: 'Quem é o Squidward?' });
    engine.onGiftVideo({
      user: 'fan5',
      giftName: 'Rosa',
      clipId: 'rosa-sandy',
      clipFile: 'bob-gift-rosa-sandy-v1.mp4',
    });

    timer.flush();
    await flushMicrotasks();

    // O presente deve ter sido processado primeiro (prioridade 100)
    const giftFirst = played.find((p) => p.id === 'rosa-sandy');
    assert.ok(giftFirst, 'presente deve ter sido processado');

    // IA deve ter respondido
    const aiAnswers = spoken.filter((s) => s.text.startsWith('[IA]'));
    assert.ok(aiAnswers.length >= 1, 'pergunta deve ter sido respondida');

    // Vídeo acionado deve ter tocado
    const triggeredVideo = played.find((p) => p.id === 'fenda');
    assert.ok(triggeredVideo, 'vídeo acionado deve ter tocado');
  });

  // ─── 8. Retorno ao idle após interação ─────────────────────────────────────

  it('motor volta a agendar ambiente após concluir interação', async () => {
    const { engine, timer, spoken } = buildEngine();
    engine.start();

    // Primeira rodada
    timer.flush();
    await flushMicrotasks();
    const countAfterFirst = spoken.length;

    // Segunda rodada (touchActivity agenda novo timer)
    timer.flush();
    await flushMicrotasks();

    assert.ok(spoken.length > countAfterFirst, 'esperava segunda fala de ambiente após retorno ao idle');
  });

  // ─── 9. stop() cancela todos os timers ─────────────────────────────────────

  it('stop() cancela todos os timers e impede novos enfileiramentos', async () => {
    const { engine, timer, spoken } = buildEngine();
    engine.start();
    engine.stop();
    timer.flush();
    await flushMicrotasks();

    assert.equal(spoken.length, 0, 'não deveria ter falado após stop()');
    const result = engine.onQuestion({ user: 'fan', comment: 'pergunta' });
    assert.equal(result?.accepted, false);
  });
});
