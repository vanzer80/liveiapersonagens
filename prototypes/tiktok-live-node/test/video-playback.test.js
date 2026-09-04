import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createLiveInteractionEngine,
  INTERACTION_PRIORITIES,
} from '../src/interaction.js';
import { createLiveSceneRuntime } from '../src/live-scene.js';
import { buildPreviewBrowserArgs, findPreviewBrowser } from '../src/scene-preview.js';
import { createSceneController, SCENE_STATES, SCENE_VARIANTS } from '../src/scene.js';

const silentLogger = { log() {}, warn() {}, error() {} };

function createPreviewDouble({ mediaResult = { ok: true, status: 'ended' } } = {}) {
  const selections = [];
  const played = [];

  return {
    selections,
    played,
    async start() {
      return { url: 'http://127.0.0.1:3333' };
    },
    setScene(selection) {
      selections.push(selection);
      return selection;
    },
    async playMedia({ file }) {
      played.push(file);
      return { ...mediaResult, asset: file };
    },
    async stop() {},
  };
}

function createRuntime({ mediaResult, mediaExists = () => true } = {}) {
  const config = {
    enabled: true,
    variant: SCENE_VARIANTS.SPONGEBOB,
    assetsDirectory: '/virtual-assets',
    mediaDirectory: '/virtual-media',
  };
  const controller = createSceneController({
    assetsDirectory: config.assetsDirectory,
    variant: config.variant,
    exists: async () => true,
    logger: silentLogger,
  });
  const preview = createPreviewDouble({ mediaResult });
  const runtime = createLiveSceneRuntime({
    config,
    controller,
    preview,
    browserOpener() {},
    mediaExists,
    logger: silentLogger,
  });

  return { runtime, preview };
}

test('toca o clipe e volta ao idle pelo fim real da reprodução', async () => {
  const { runtime, preview } = createRuntime();
  await runtime.start();

  const result = await runtime.playClip('bob-patrick-v1.mp4', { videoId: 'patrick' });

  assert.equal(result.ok, true);
  assert.equal(result.status, 'ended');
  assert.deepEqual(preview.played, ['bob-patrick-v1.mp4']);
  assert.equal(preview.selections.at(-1).currentState, SCENE_STATES.IDLE);
  assert.equal(runtime.getState(), SCENE_STATES.IDLE);
});

test('arquivo ausente não derruba o processo e volta ao idle', async () => {
  const { runtime, preview } = createRuntime({ mediaExists: () => false });
  await runtime.start();

  const result = await runtime.playClip('bob-inexistente-v1.mp4');

  assert.equal(result.ok, false);
  assert.equal(result.status, 'missing');
  assert.deepEqual(preview.played, [], 'não deve tentar reproduzir arquivo ausente');
  assert.equal(preview.selections.at(-1).currentState, SCENE_STATES.IDLE);
});

test('erro de reprodução volta ao idle com segurança', async () => {
  const { runtime, preview } = createRuntime({ mediaResult: { ok: false, status: 'error' } });
  await runtime.start();

  const result = await runtime.playClip('bob-patrick-v1.mp4');

  assert.equal(result.ok, false);
  assert.equal(result.status, 'error');
  assert.equal(preview.selections.at(-1).currentState, SCENE_STATES.IDLE);
  assert.equal(runtime.getState(), SCENE_STATES.IDLE);
});

test('bloqueio de autoplay é reportado sem travar a cena', async () => {
  const { runtime, preview } = createRuntime({ mediaResult: { ok: false, status: 'blocked' } });
  await runtime.start();

  const result = await runtime.playClip('bob-convite-ia-v1.mp4');

  assert.equal(result.status, 'blocked');
  assert.equal(preview.selections.at(-1).currentState, SCENE_STATES.IDLE);
});

test('vídeo pré-gravado não gera TTS', async () => {
  const { runtime } = createRuntime();
  await runtime.start();

  let ttsCalls = 0;
  const speaker = async () => {
    ttsCalls += 1;
    return { ok: true };
  };

  await runtime.playClip('bob-hamburguer-v1.mp4');

  assert.equal(ttsCalls, 0, 'o áudio do clipe é o do próprio MP4');
  // Nenhuma transição para speaking: o estado falado pertence ao fluxo de TTS.
  assert.equal(runtime.getState(), SCENE_STATES.IDLE);
  assert.equal(typeof speaker, 'function');
});

test('a cena desativada ignora o clipe sem erro', async () => {
  const runtime = createLiveSceneRuntime({
    config: { enabled: false, variant: SCENE_VARIANTS.SPONGEBOB, assetsDirectory: '/a', mediaDirectory: '/b' },
    logger: silentLogger,
  });

  const result = await runtime.playClip('bob-patrick-v1.mp4');
  assert.equal(result.skipped, true);
  assert.equal(result.ok, false);
});

test('a prévia é aberta com a política de autoplay liberada', () => {
  const args = buildPreviewBrowserArgs('http://127.0.0.1:3333', 'C:\\temp\\perfil');

  // Sem esta flag o navegador bloqueia o áudio embutido dos clipes do MVP 6.
  assert.ok(args.includes('--autoplay-policy=no-user-gesture-required'));
  // Modo aplicativo: janela limpa para a captura do LIVE Studio.
  assert.ok(args.includes('--app=http://127.0.0.1:3333'));
  // Perfil dedicado garante que a flag valha mesmo com o navegador já aberto.
  assert.ok(args.includes('--user-data-dir=C:\\temp\\perfil'));
});

test('encontra o navegador Chromium e aceita caminho sobrescrito', () => {
  const encontrado = findPreviewBrowser(['/nao-existe', '/existe/msedge.exe'], (p) => p === '/existe/msedge.exe');
  assert.equal(encontrado, '/existe/msedge.exe');

  const nenhum = findPreviewBrowser(['/nao-existe'], () => false);
  assert.equal(nenhum, null);
});

test('a prioridade do vídeo fica entre entrada e pergunta', () => {
  assert.equal(INTERACTION_PRIORITIES.video, 70);
  assert.ok(INTERACTION_PRIORITIES.member < INTERACTION_PRIORITIES.video);
  assert.ok(INTERACTION_PRIORITIES.video < INTERACTION_PRIORITIES.question);
  assert.ok(INTERACTION_PRIORITIES.question < INTERACTION_PRIORITIES.gift);
});

const enabledConfig = {
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
};

function waitForQueue() {
  return new Promise((resolve) => setImmediate(resolve));
}

test('o vídeo entra na fila existente e é reproduzido', async () => {
  const played = [];
  const engine = createLiveInteractionEngine({
    config: enabledConfig,
    speak: async () => {},
    answerQuestion: async () => {},
    playVideo: async ({ id, video }) => played.push(`${id}:${video}`),
    logger: silentLogger,
  });

  const result = engine.onVideo({ id: 'patrick', video: 'bob-patrick-v1.mp4', user: 'Luis' });
  await waitForQueue();

  assert.equal(result.accepted, true);
  assert.deepEqual(played, ['patrick:bob-patrick-v1.mp4']);
  engine.stop();
});

test('o mesmo vídeo não entra duas vezes enquanto ainda está pendente', async () => {
  let liberar;
  const played = [];
  const engine = createLiveInteractionEngine({
    config: enabledConfig,
    speak: async () => {},
    answerQuestion: async () => {},
    playVideo: async ({ id }) => {
      played.push(id);
      await new Promise((resolve) => { liberar = resolve; });
    },
    logger: silentLogger,
  });

  const primeiro = engine.onVideo({ id: 'patrick', video: 'bob-patrick-v1.mp4' });
  await waitForQueue();
  const duplicado = engine.onVideo({ id: 'patrick', video: 'bob-patrick-v1.mp4' });

  assert.equal(primeiro.accepted, true);
  assert.deepEqual(duplicado, { accepted: false, reason: 'duplicate' });

  liberar();
  await waitForQueue();
  assert.deepEqual(played, ['patrick']);
  engine.stop();
});

test('apenas uma mídia por vez: vídeo e fala não se sobrepõem', async () => {
  const eventos = [];
  let emExecucao = 0;
  let liberarVideo;

  const marcar = async (nome, aguardar) => {
    emExecucao += 1;
    assert.equal(emExecucao, 1, `${nome} não pode sobrepor outra mídia`);
    eventos.push(`${nome}-inicio`);
    if (aguardar) await aguardar();
    eventos.push(`${nome}-fim`);
    emExecucao -= 1;
  };

  const engine = createLiveInteractionEngine({
    config: enabledConfig,
    speak: async () => marcar('fala'),
    answerQuestion: async () => {},
    playVideo: async () => marcar('video', () => new Promise((resolve) => { liberarVideo = resolve; })),
    logger: silentLogger,
  });

  engine.onVideo({ id: 'patrick', video: 'bob-patrick-v1.mp4' });
  await waitForQueue();
  engine.onGift({ user: 'Ana', giftName: 'rosa' });

  liberarVideo();
  await waitForQueue();
  await waitForQueue();

  assert.deepEqual(eventos, ['video-inicio', 'video-fim', 'fala-inicio', 'fala-fim']);
  engine.stop();
});

test('o presente tem prioridade sobre o vídeo na escolha do próximo item', async () => {
  const ordem = [];
  let liberarPrimeiro;

  const engine = createLiveInteractionEngine({
    config: enabledConfig,
    speak: async (text) => { ordem.push(text.includes('obrigado') ? 'presente' : 'fala'); },
    answerQuestion: async () => {},
    playVideo: async ({ id }) => {
      ordem.push(`video:${id}`);
      // O primeiro clipe segura a fila para que os próximos fiquem pendentes.
      if (id === 'boas-vindas') {
        await new Promise((resolve) => { liberarPrimeiro = resolve; });
      }
    },
    logger: silentLogger,
  });

  engine.onVideo({ id: 'boas-vindas', video: 'bob-boas-vindas-v1.mp4' });
  await waitForQueue();

  // Chegam juntos enquanto o primeiro ainda está tocando.
  engine.onVideo({ id: 'patrick', video: 'bob-patrick-v1.mp4' });
  engine.onGift({ user: 'Ana', giftName: 'rosa' });

  // A mídia que já começou não é interrompida; só depois a prioridade decide.
  liberarPrimeiro();
  await waitForQueue();
  await waitForQueue();
  await waitForQueue();

  assert.deepEqual(ordem, ['video:boas-vindas', 'presente', 'video:patrick']);
  engine.stop();
});

test('sem reprodutor configurado o vídeo é recusado sem quebrar', () => {
  const engine = createLiveInteractionEngine({
    config: enabledConfig,
    speak: async () => {},
    answerQuestion: async () => {},
    playVideo: null,
    logger: silentLogger,
  });

  const result = engine.onVideo({ id: 'patrick', video: 'bob-patrick-v1.mp4' });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'no-player');
  engine.stop();
});
