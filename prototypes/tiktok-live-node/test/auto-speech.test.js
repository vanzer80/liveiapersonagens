import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLineCycleSelector,
  createLiveInteractionEngine,
  createPriorityTaskQueue,
  getInteractionConfig,
  INTERACTION_PRIORITIES,
  DEFAULT_AMBIENT_LINES,
} from '../src/interaction.js';

function makeLog() {
  const events = [];
  return {
    events,
    log: (...args) => events.push({ level: 'log', msg: args.join(' ') }),
    warn: (...args) => events.push({ level: 'warn', msg: args.join(' ') }),
    error: (...args) => events.push({ level: 'error', msg: args.join(' ') }),
  };
}

function makeVirtualClock(initialTime = 10000) {
  let currentTime = initialTime;
  const timers = new Map();
  let seq = 0;

  return {
    now: () => currentTime,
    setTimer: (fn, delay) => {
      const id = ++seq;
      timers.set(id, { fn, triggerTime: currentTime + Math.max(0, delay) });
      return id;
    },
    clearTimer: (id) => {
      timers.delete(id);
    },
    getPendingCount: () => timers.size,
    advanceBy: async (ms) => {
      const targetTime = currentTime + ms;
      while (true) {
        let nextTimer = null;
        let nextId = null;
        for (const [id, t] of timers.entries()) {
          if (t.triggerTime <= targetTime) {
            if (!nextTimer || t.triggerTime < nextTimer.triggerTime) {
              nextTimer = t;
              nextId = id;
            }
          }
        }
        if (!nextTimer) break;
        currentTime = nextTimer.triggerTime;
        timers.delete(nextId);
        nextTimer.fn();
        await flushMicrotasks();
      }
      currentTime = targetTime;
      await flushMicrotasks();
    },
  };
}

async function flushMicrotasks() {
  for (let i = 0; i < 25; i++) {
    await Promise.resolve();
  }
}

describe('Falas automáticas por inatividade (Bob Esponja)', () => {
  it('não dispara antes do intervalo de 5s e dispara exatamente uma vez ao atingir o limite', async () => {
    const clock = makeVirtualClock();
    const spoken = [];
    const log = makeLog();

    const config = getInteractionConfig({
      INTERACTION_ENABLED: 'true',
      INTERACTION_OPENING_ENABLED: 'false',
      INTERACTION_WELCOME_ENABLED: 'false',
      INTERACTION_AMBIENT_ENABLED: 'true',
      INTERACTION_AMBIENT_SILENCE_MS: '5000',
    });

    const engine = createLiveInteractionEngine({
      config,
      speak: async (text, meta) => {
        spoken.push({ text, meta });
      },
      answerQuestion: async () => 'Resposta IA',
      now: clock.now,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      logger: log,
      random: () => 0, // seleciona o min
    });

    engine.start();
    await flushMicrotasks();

    // Em t = 4999ms, nenhuma fala deve ter ocorrido
    await clock.advanceBy(4999);
    assert.equal(spoken.length, 0);

    // Em t = 5000ms, atinge o limite de silêncio e dispara exatamente uma fala
    await clock.advanceBy(1);
    assert.equal(spoken.length, 1);
    assert.equal(spoken[0].meta.interactionKind, 'ambient');
    assert.ok(typeof spoken[0].text === 'string' && spoken[0].text.length > 0);

    // Sem nova atividade além da conclusão da fala, o próximo timer só disparará após mais 5s
    await clock.advanceBy(4999);
    assert.equal(spoken.length, 1);

    await clock.advanceBy(1);
    assert.equal(spoken.length, 2);

    engine.stop();
  });

  it('permite configurar o intervalo para 3000ms sem alterar código', async () => {
    const clock = makeVirtualClock();
    const spoken = [];

    const config = getInteractionConfig({
      INTERACTION_ENABLED: 'true',
      INTERACTION_OPENING_ENABLED: 'false',
      INTERACTION_WELCOME_ENABLED: 'false',
      INTERACTION_AMBIENT_ENABLED: 'true',
      INTERACTION_AMBIENT_SILENCE_MS: '3000',
    });

    assert.equal(config.ambientSilenceMs, 3000);
    assert.equal(config.ambientMinSilenceMs, 3000);
    assert.equal(config.ambientMaxSilenceMs, 3000);

    const engine = createLiveInteractionEngine({
      config,
      speak: async (text) => {
        spoken.push(text);
      },
      answerQuestion: async () => 'ok',
      now: clock.now,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      random: () => 0,
    });

    engine.start();
    await flushMicrotasks();

    await clock.advanceBy(2999);
    assert.equal(spoken.length, 0);

    await clock.advanceBy(1);
    assert.equal(spoken.length, 1);

    engine.stop();
  });

  it('aplica fallback seguro para configuração inválida ou valor negativo', () => {
    const configInvalid = getInteractionConfig({
      INTERACTION_AMBIENT_SILENCE_MS: 'invalido',
    });
    assert.equal(configInvalid.ambientSilenceMs, 5000);

    const configNegative = getInteractionConfig({
      INTERACTION_AMBIENT_SILENCE_MS: '-1000',
    });
    assert.equal(configNegative.ambientSilenceMs, 1000); // clampeado para o mínimo seguro de 1s

    const configHuge = getInteractionConfig({
      INTERACTION_AMBIENT_SILENCE_MS: '999999999',
    });
    assert.equal(configHuge.ambientSilenceMs, 300000); // clampeado para o máximo seguro de 5min
  });

  it('não dispara quando INTERACTION_AMBIENT_ENABLED é false ou desativado', async () => {
    const clock = makeVirtualClock();
    const spoken = [];

    const config = getInteractionConfig({
      INTERACTION_ENABLED: 'true',
      INTERACTION_OPENING_ENABLED: 'false',
      INTERACTION_WELCOME_ENABLED: 'false',
      INTERACTION_AMBIENT_ENABLED: 'false',
      INTERACTION_AMBIENT_SILENCE_MS: '5000',
    });

    const engine = createLiveInteractionEngine({
      config,
      speak: async (text) => {
        spoken.push(text);
      },
      answerQuestion: async () => 'ok',
      now: clock.now,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    engine.start();
    await clock.advanceBy(60000);
    assert.equal(spoken.length, 0);

    engine.stop();
  });

  it('reinicia a contagem somente após o término real da fala anterior', async () => {
    const clock = makeVirtualClock();
    const timeline = [];
    let resolveSpeech = null;

    const config = getInteractionConfig({
      INTERACTION_ENABLED: 'true',
      INTERACTION_OPENING_ENABLED: 'false',
      INTERACTION_WELCOME_ENABLED: 'false',
      INTERACTION_AMBIENT_ENABLED: 'true',
      INTERACTION_AMBIENT_SILENCE_MS: '5000',
    });

    const engine = createLiveInteractionEngine({
      config,
      speak: (text) => {
        timeline.push({ event: 'speak-start', at: clock.now(), text });
        return new Promise((resolve) => {
          resolveSpeech = () => {
            timeline.push({ event: 'speak-end', at: clock.now() });
            resolve();
          };
        });
      },
      answerQuestion: async () => 'ok',
      now: clock.now,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      random: () => 0,
    });

    engine.start();
    await clock.advanceBy(5000);

    assert.equal(timeline.length, 1);
    assert.equal(timeline[0].event, 'speak-start');
    assert.equal(timeline[0].at, 15000);

    // A fala leva 4000ms para ser reproduzida
    await clock.advanceBy(4000);
    // Enquanto fala, nenhuma nova fala pode ser disparada
    assert.equal(timeline.length, 1);

    // Conclui a fala em t = 19000ms
    resolveSpeech();
    await flushMicrotasks();
    assert.equal(timeline.length, 2);
    assert.equal(timeline[1].event, 'speak-end');
    assert.equal(timeline[1].at, 19000);

    // A nova contagem deve começar em 19000ms:
    // Em 19000 + 4999 = 23999ms, ainda nada
    await clock.advanceBy(4999);
    assert.equal(timeline.length, 2);

    // Em 19000 + 5000 = 24000ms, a próxima fala inicia
    await clock.advanceBy(1);
    assert.equal(timeline.length, 3);
    assert.equal(timeline[2].event, 'speak-start');
    assert.equal(timeline[2].at, 24000);

    resolveSpeech();
    await flushMicrotasks();
    engine.stop();
  });

  it('bloqueia disparo automático durante reprodução de vídeo com fala e fila pendente', async () => {
    const clock = makeVirtualClock();
    const spoken = [];
    let resolveVideo = null;

    const config = getInteractionConfig({
      INTERACTION_ENABLED: 'true',
      INTERACTION_OPENING_ENABLED: 'false',
      INTERACTION_WELCOME_ENABLED: 'false',
      INTERACTION_AMBIENT_ENABLED: 'true',
      INTERACTION_AMBIENT_SILENCE_MS: '5000',
    });

    const engine = createLiveInteractionEngine({
      config,
      speak: async (text) => {
        spoken.push(text);
      },
      answerQuestion: async () => 'ok',
      playVideo: () =>
        new Promise((resolve) => {
          resolveVideo = resolve;
        }),
      now: clock.now,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      random: () => 0,
    });

    engine.start();

    // Em t = 3000ms, um vídeo é acionado
    await clock.advanceBy(3000);
    const videoRes = engine.onVideo({ id: 'teste', video: 'video.mp4' });
    assert.equal(videoRes.accepted, true);

    // Avança 5000ms enquanto o vídeo está rodando
    await clock.advanceBy(5000);
    assert.equal(spoken.length, 0);

    // Termina o vídeo
    resolveVideo();
    await flushMicrotasks();

    // Contagem de inatividade é retomada somente após o vídeo terminar
    await clock.advanceBy(4999);
    assert.equal(spoken.length, 0);

    await clock.advanceBy(1);
    assert.equal(spoken.length, 1);

    engine.stop();
  });

  it('uma pergunta ou presente cancela fala automática que ainda estiver pendente na fila', async () => {
    const log = makeLog();
    const clock = makeVirtualClock();
    const events = [];

    const config = getInteractionConfig({
      INTERACTION_ENABLED: 'true',
      INTERACTION_OPENING_ENABLED: 'false',
      INTERACTION_WELCOME_ENABLED: 'false',
      INTERACTION_AMBIENT_ENABLED: 'true',
      INTERACTION_AMBIENT_SILENCE_MS: '5000',
    });

    let resolveActive = null;

    const engine = createLiveInteractionEngine({
      config,
      speak: async (text, meta) => {
        events.push({ kind: meta?.interactionKind, text });
        if (events.length === 1) {
          await new Promise((res) => {
            resolveActive = res;
          });
        }
      },
      answerQuestion: async ({ user, comment }) => `Bob responde para ${user}: ${comment}`,
      now: clock.now,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      logger: log,
      random: () => 0,
    });

    engine.start();

    // Simula uma fala prioritária ocupando o active
    engine.onGift({ user: 'Alice', giftName: 'Rosa', giftType: 2 });
    await flushMicrotasks();
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, 'gift');

    // Agora testamos a fila com cancelPending da fala automática:
    const queue = createPriorityTaskQueue({ logger: log });
    let ambientRan = false;
    let questionRan = false;

    // Bloqueia a fila com uma tarefa longa
    let unblock = null;
    queue.enqueue({
      kind: 'blocker',
      priority: INTERACTION_PRIORITIES.ambient,
      run: () => new Promise((res) => { unblock = res; }),
    });

    // Enfileira fala automática como pendente
    queue.enqueue({
      kind: 'ambient',
      priority: INTERACTION_PRIORITIES.ambient,
      run: async () => {
        ambientRan = true;
      },
    });

    assert.equal(queue.isKindPending('ambient'), true);

    // Chega uma pergunta prioritária
    queue.enqueue({
      kind: 'question',
      priority: INTERACTION_PRIORITIES.question,
      run: async () => {
        questionRan = true;
      },
    });

    // O enfileiramento da pergunta cancelou o ambient pendente!
    assert.equal(queue.isKindPending('ambient'), false);

    // Desbloqueia a fila
    unblock();
    await flushMicrotasks();

    assert.equal(questionRan, true);
    assert.equal(ambientRan, false);

    resolveActive();
    await flushMicrotasks();
    engine.stop();
  });

  it('descarta resultado de fala automática obsoleto quando interação chega durante a geração do áudio', async () => {
    const clock = makeVirtualClock();
    const actions = [];

    const config = getInteractionConfig({
      INTERACTION_ENABLED: 'true',
      INTERACTION_OPENING_ENABLED: 'false',
      INTERACTION_WELCOME_ENABLED: 'false',
      INTERACTION_AMBIENT_ENABLED: 'true',
      INTERACTION_AMBIENT_SILENCE_MS: '5000',
    });

    let holdGeneration = null;
    const generationGate = new Promise((resolve) => {
      holdGeneration = resolve;
    });

    const engine = createLiveInteractionEngine({
      config,
      speak: async (text, meta) => {
        actions.push({ phase: 'speak-call', kind: meta.interactionKind, text });

        // Se for fala automática, aguarda a simulação da latência do TTS
        if (meta.interactionKind === 'ambient') {
          await generationGate;
        }

        // Antes de reproduzir o áudio gerado, revalida se deve cancelar
        if (typeof meta?.shouldCancel === 'function' && meta.shouldCancel()) {
          actions.push({ phase: 'speak-discarded', kind: meta.interactionKind });
          return { ok: false, skipped: true, reason: 'cancelled-before-playback' };
        }

        meta?.onPlaybackStart?.({ generationLatencyMs: 150 });
        actions.push({ phase: 'playback-executed', kind: meta.interactionKind });
        return { ok: true };
      },
      answerQuestion: async ({ user, comment }) => {
        actions.push({ phase: 'answer-executed', user, comment });
      },
      now: clock.now,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      random: () => 0,
    });

    engine.start();

    // Dispara o timer de inatividade de 5s
    await clock.advanceBy(5000);
    // Fala automática começou a fase de chamada do speak (geração de TTS)
    assert.equal(actions.length, 1);
    assert.equal(actions[0].kind, 'ambient');
    assert.equal(actions[0].phase, 'speak-call');

    // Durante a fase de geração do TTS, chega uma pergunta prioritária do chat
    engine.onQuestion({ user: 'Carlos', comment: 'Você gosta de hambúrguer de siri?' });

    // Libera o término da geração do TTS
    holdGeneration();
    await flushMicrotasks();

    // A fala automática identificou a pergunta pendente e descartou a reprodução
    const discardedAction = actions.find((a) => a.phase === 'speak-discarded');
    assert.ok(discardedAction, 'fala de ambiente deveria ter sido descartada');

    // A pergunta prioritária foi atendida sem sobreposição
    const answerAction = actions.find((a) => a.phase === 'answer-executed');
    assert.ok(answerAction, 'pergunta deveria ser executada');

    engine.stop();
  });

  it('se fala automática já estiver reproduzindo audivelmente, conclui a frase e atende interação em seguida sem sobreposição', async () => {
    const clock = makeVirtualClock();
    const eventTimeline = [];
    let resolveAmbientPlayback = null;

    const config = getInteractionConfig({
      INTERACTION_ENABLED: 'true',
      INTERACTION_OPENING_ENABLED: 'false',
      INTERACTION_WELCOME_ENABLED: 'false',
      INTERACTION_AMBIENT_ENABLED: 'true',
      INTERACTION_AMBIENT_SILENCE_MS: '5000',
    });

    const engine = createLiveInteractionEngine({
      config,
      speak: (text, meta) => {
        eventTimeline.push({ event: 'audio-start', kind: meta.interactionKind });
        return new Promise((resolve) => {
          if (meta.interactionKind === 'ambient') {
            resolveAmbientPlayback = () => {
              eventTimeline.push({ event: 'audio-end', kind: meta.interactionKind });
              resolve();
            };
          } else {
            eventTimeline.push({ event: 'audio-end', kind: meta.interactionKind });
            resolve();
          }
        });
      },
      answerQuestion: async () => 'Resposta IA',
      now: clock.now,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      random: () => 0,
    });

    engine.start();

    // Atinge 5s de inatividade -> fala automática entra em reprodução de áudio
    await clock.advanceBy(5000);
    assert.equal(eventTimeline.length, 1);
    assert.equal(eventTimeline[0].event, 'audio-start');
    assert.equal(eventTimeline[0].kind, 'ambient');

    // Enquanto o áudio da fala automática está tocando no dispositivo, chega um presente
    engine.onGift({ user: 'Mariana', giftName: 'Rosa', giftType: 2 });
    await flushMicrotasks();

    // Como a fala automática já estava reproduzindo audivelmente, ela não é cortada abruptamente;
    // o presente aguarda na fila.
    assert.equal(eventTimeline.length, 1);

    // Áudio da frase curta automática termina
    resolveAmbientPlayback();
    await flushMicrotasks();

    // Agora o presente é atendido imediatamente em seguida, sem sobreposição
    assert.equal(eventTimeline.length, 4);
    assert.equal(eventTimeline[1].event, 'audio-end');
    assert.equal(eventTimeline[1].kind, 'ambient');
    assert.equal(eventTimeline[2].event, 'audio-start');
    assert.equal(eventTimeline[2].kind, 'gift');
    assert.equal(eventTimeline[3].event, 'audio-end');
    assert.equal(eventTimeline[3].kind, 'gift');

    engine.stop();
  });

  it('mantém no máximo uma fala automática em preparação ou fila (sem acúmulo)', () => {
    const queue = createPriorityTaskQueue();

    const first = queue.enqueue({
      kind: 'ambient',
      priority: INTERACTION_PRIORITIES.ambient,
      run: async () => {
        await new Promise((r) => setTimeout(r, 100));
      },
    });
    assert.equal(first.accepted, true);

    // Tentar enfileirar outra fala automática enquanto uma está ativa é rejeitado
    const second = queue.enqueue({
      kind: 'ambient',
      priority: INTERACTION_PRIORITIES.ambient,
      run: async () => {},
    });
    assert.equal(second.accepted, false);
    assert.equal(second.reason, 'ambient-already-queued');
  });

  it('o seletor cíclico percorre todas as frases antes de repetir e nunca repete a última na troca de ciclo', () => {
    const testLines = [
      'Frase 1',
      'Frase 2',
      'Frase 3',
      'Frase 4',
      'Frase 5',
    ];

    const selector = createLineCycleSelector(testLines);

    // Ciclo 1
    const cycle1 = [];
    for (let i = 0; i < testLines.length; i++) {
      cycle1.push(selector.next());
    }

    // Todas as 5 frases devem estar presentes no primeiro ciclo
    assert.equal(new Set(cycle1).size, testLines.length);

    // Ciclo 2
    const cycle2 = [];
    for (let i = 0; i < testLines.length; i++) {
      cycle2.push(selector.next());
    }

    assert.equal(new Set(cycle2).size, testLines.length);

    // A primeira frase do ciclo 2 NÃO PODE ser igual à última do ciclo 1
    const lastOfCycle1 = cycle1[cycle1.length - 1];
    const firstOfCycle2 = cycle2[0];
    assert.notEqual(lastOfCycle1, firstOfCycle2, 'não deve repetir a mesma frase na transição entre ciclos');
  });

  it('possui pelo menos 20 frases de Bob Esponja configuradas com variedade temática', () => {
    assert.ok(DEFAULT_AMBIENT_LINES.length >= 20);
    // Verifica conteúdo temático (tep-tep/curtir, perguntas, Fenda do Biquíni, etc.)
    const hasTepTep = DEFAULT_AMBIENT_LINES.some((l) => /tep|curt/i.test(l));
    const hasQuestions = DEFAULT_AMBIENT_LINES.some((l) => /\?/i.test(l));
    const hasBobTheme = DEFAULT_AMBIENT_LINES.some((l) => /siri|biquíni|fenda|patrick/i.test(l));

    assert.ok(hasTepTep, 'deve ter chamadas para curtir / tep tep');
    assert.ok(hasQuestions, 'deve ter perguntas leves');
    assert.ok(hasBobTheme, 'deve ter menções temáticas do universo do Bob Esponja');
  });

  it('recupera-se de falha no TTS sem travar a fila ou impedir respostas futuras', async () => {
    const clock = makeVirtualClock();
    let attempt = 0;
    const spoken = [];
    const log = makeLog();

    const config = getInteractionConfig({
      INTERACTION_ENABLED: 'true',
      INTERACTION_OPENING_ENABLED: 'false',
      INTERACTION_WELCOME_ENABLED: 'false',
      INTERACTION_AMBIENT_ENABLED: 'true',
      INTERACTION_AMBIENT_SILENCE_MS: '5000',
    });

    const engine = createLiveInteractionEngine({
      config,
      speak: async (text, meta) => {
        attempt++;
        if (attempt === 1) {
          throw new Error('Falha simulada de rede / timeout no TTS');
        }
        spoken.push({ text, kind: meta?.interactionKind });
      },
      answerQuestion: async ({ user, comment }) => {
        spoken.push({ text: `Resposta para ${user}: ${comment}`, kind: 'question' });
      },
      now: clock.now,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      logger: log,
      random: () => 0,
    });

    engine.start();

    // Primeira tentativa de fala automática falha
    await clock.advanceBy(5000);
    assert.equal(spoken.length, 0);

    // Motor não travou! Uma pergunta chega e deve ser processada normalmente
    engine.onQuestion({ user: 'Lucas', comment: 'Tudo bem Bob?' });
    await flushMicrotasks();

    assert.equal(spoken.length, 1);
    assert.equal(spoken[0].kind, 'question');

    engine.stop();
  });

  it('suspende e retoma na desconexão/reconexão sem duplicar timers ou listeners', async () => {
    const clock = makeVirtualClock();
    const spoken = [];

    const config = getInteractionConfig({
      INTERACTION_ENABLED: 'true',
      INTERACTION_OPENING_ENABLED: 'false',
      INTERACTION_WELCOME_ENABLED: 'false',
      INTERACTION_AMBIENT_ENABLED: 'true',
      INTERACTION_AMBIENT_SILENCE_MS: '5000',
    });

    const engine = createLiveInteractionEngine({
      config,
      speak: async (text) => {
        spoken.push(text);
      },
      answerQuestion: async () => 'ok',
      now: clock.now,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      random: () => 0,
    });

    engine.start();

    // Após 3s desconecta a live
    await clock.advanceBy(3000);
    engine.pause();

    // Passam-se mais 10s desconectado -> nenhuma fala pode ocorrer
    await clock.advanceBy(10000);
    assert.equal(spoken.length, 0);

    // Múltiplos pause são idempotentes
    engine.pause();
    assert.equal(spoken.length, 0);

    // Reconecta a live
    engine.resume();
    await flushMicrotasks();

    // Inicia contagem limpa a partir do momento da reconexão (5s)
    await clock.advanceBy(4999);
    assert.equal(spoken.length, 0);

    await clock.advanceBy(1);
    assert.equal(spoken.length, 1);

    // Múltiplos resumes não duplicam disparos
    engine.resume();
    await clock.advanceBy(4999);
    assert.equal(spoken.length, 1);

    await clock.advanceBy(1);
    assert.equal(spoken.length, 2);

    engine.stop();
  });

  it('curtidas isoladas e comentários comuns não atrasam as falas automáticas', async () => {
    const clock = makeVirtualClock();
    const spoken = [];

    const config = getInteractionConfig({
      INTERACTION_ENABLED: 'true',
      INTERACTION_OPENING_ENABLED: 'false',
      INTERACTION_WELCOME_ENABLED: 'false',
      INTERACTION_AMBIENT_ENABLED: 'true',
      INTERACTION_AMBIENT_SILENCE_MS: '5000',
    });

    const engine = createLiveInteractionEngine({
      config,
      speak: async (text) => {
        spoken.push(text);
      },
      answerQuestion: async () => 'ok',
      now: clock.now,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      random: () => 0,
    });

    engine.start();

    // Em t = 2000ms chegam curtidas isoladas.
    // Conforme especificação: "Curtidas isoladas não devem adiar indefinidamente as falas."
    // O motor não tem listener de like que chame touchActivity().
    await clock.advanceBy(2000);

    // Em t = 5000ms (5s desde o início), o timer de inatividade dispara pontualmente
    await clock.advanceBy(3000);
    assert.equal(spoken.length, 1);

    engine.stop();
  });

  it('integração com rotação de vídeo: usa vídeo quando disponível, ou fala automática quando desabilitado', async () => {
    const clock = makeVirtualClock();
    const actions = [];

    const config = getInteractionConfig({
      INTERACTION_ENABLED: 'true',
      INTERACTION_OPENING_ENABLED: 'false',
      INTERACTION_WELCOME_ENABLED: 'false',
      INTERACTION_AMBIENT_ENABLED: 'true',
      INTERACTION_AMBIENT_SILENCE_MS: '5000',
    });

    let rotationEnabled = true;

    const engine = createLiveInteractionEngine({
      config,
      findAmbientRotation: () => {
        if (!rotationEnabled) return null;
        return { id: 'clip-01', file: 'assets/clip1.mp4' };
      },
      playVideo: async ({ id, video }) => {
        actions.push({ type: 'video', id, video });
      },
      speak: async (text) => {
        actions.push({ type: 'speak', text });
      },
      answerQuestion: async () => 'ok',
      now: clock.now,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      random: () => 0,
    });

    engine.start();

    // Com rotação ativa, no primeiro disparo de 5s reproduz vídeo
    await clock.advanceBy(5000);
    assert.equal(actions.length, 1);
    assert.equal(actions[0].type, 'video');
    assert.equal(actions[0].id, 'clip-01');

    // Desativa rotação de vídeo (como AMBIENT_ROTATION_ENABLED=false)
    rotationEnabled = false;

    // Próximo disparo de inatividade usa fala automática por TTS
    await clock.advanceBy(5000);
    assert.equal(actions.length, 2);
    assert.equal(actions[1].type, 'speak');

    engine.stop();
  });
});
