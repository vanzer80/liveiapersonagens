import { resolve } from 'node:path';

import { createSceneController, SCENE_STATES, SCENE_VARIANTS } from './scene.js';
import { createScenePreview, openPreviewBrowser } from './scene-preview.js';
import { speakText } from './tts.js';

try {
  process.loadEnvFile?.('.env');
} catch {
  // .env opcional.
}

const assetsDirectory = resolve('assets', 'mvp4');
const thinkingMs = Math.max(500, Number(process.env.SCENE_THINKING_MS || 3000));
const initialIdleMs = Math.max(500, Number(process.env.SCENE_INITIAL_IDLE_MS || 2000));
const finalIdleMs = Math.max(500, Number(process.env.SCENE_FINAL_IDLE_MS || 3000));
const exitAfterTest = ['1', 'true', 'yes', 'sim', 'on'].includes(
  String(process.env.SCENE_PREVIEW_EXIT_AFTER_TEST || '').trim().toLowerCase(),
);
const testText = process.argv.slice(2).join(' ').trim()
  || 'Olá! Este é um teste do personagem interativo. Se você está me ouvindo, a cena e a voz estão funcionando juntas.';

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

const controller = createSceneController({
  assetsDirectory,
  variant: SCENE_VARIANTS.SPONGEBOB,
});
const preview = createScenePreview({ assetsDirectory });

async function requireApprovedAssets() {
  const missing = [];
  for (const state of [SCENE_STATES.IDLE, SCENE_STATES.THINKING, SCENE_STATES.SPEAKING]) {
    const selection = await controller.resolveAsset(state);
    if (!selection.asset || selection.fallbackUsed || selection.state !== state) {
      missing.push(selection.missingAsset || `${state}`);
    }
  }
  if (missing.length) {
    console.error('\n[CENA] Não é possível executar o teste integrado: faltam ativos aprovados.');
    console.error(`[CENA] Pasta esperada: ${assetsDirectory}`);
    for (const item of missing) console.error(`[CENA] ausente: ${item}`);
    console.error('\nCopie para essa pasta exatamente:');
    console.error('  spongebob-idle-v1.mp4');
    console.error('  spongebob-thinking-v1.mp4');
    console.error('  spongebob-speaking-v1.mp4');
    process.exitCode = 1;
    return false;
  }
  return true;
}

async function show(state, metadata = {}) {
  const selection = await controller.transitionTo(state, metadata);
  preview.setScene(selection);
  return selection;
}

// Ponte provisória do smoke test: detecta o momento em que o adaptador TTS
// anuncia que iniciará o playback. O contrato definitivo deverá expor um
// callback/evento explícito no próprio adaptador, sem depender de logs.
function createPlaybackSignal() {
  let resolveStart;
  const started = new Promise((resolveStarted) => {
    resolveStart = resolveStarted;
  });

  const originalLog = console.log;
  let triggered = false;

  console.log = (...args) => {
    originalLog(...args);
    if (!triggered && String(args[0] || '').startsWith('[TTS] reproduzindo')) {
      triggered = true;
      resolveStart(performance.now());
    }
  };

  return {
    started,
    restore() {
      console.log = originalLog;
    },
  };
}

async function run() {
  if (!(await requireApprovedAssets())) return;

  const { url } = await preview.start();
  openPreviewBrowser(url);

  console.log('\nMVP 4 — teste local integrado Bob Esponja');
  console.log('Fluxo: idle -> thinking -> speaking + TTS -> idle');
  console.log('O áudio embutido dos MP4s fica mutado no navegador.');
  console.log('Sincronização: speaking muda quando o TTS informa início real de reprodução.\n');

  await show(SCENE_STATES.IDLE, { reason: 'test-start' });
  await wait(initialIdleMs);

  await show(SCENE_STATES.THINKING, { reason: 'simulated-question' });
  await wait(thinkingMs);

  console.log(`[TESTE CENA] TTS de teste: ${testText}`);

  const playbackSignal = createPlaybackSignal();
  let playbackStartedAt = null;
  let speakingStartedAt = null;
  let ttsResult;

  try {
    const ttsPromise = speakText(testText, { force: true });
    playbackStartedAt = await Promise.race([
      playbackSignal.started,
      ttsPromise.then(() => null),
    ]);

    if (playbackStartedAt !== null) {
      await show(SCENE_STATES.SPEAKING, { reason: 'tts-playback-start' });
      speakingStartedAt = performance.now();
    }

    ttsResult = await ttsPromise;
  } finally {
    playbackSignal.restore();
  }

  const speakingVisibleMs = speakingStartedAt === null
    ? 0
    : Math.round(performance.now() - speakingStartedAt);
  const speakingStartLagMs = playbackStartedAt === null || speakingStartedAt === null
    ? null
    : Math.round(speakingStartedAt - playbackStartedAt);

  await show(SCENE_STATES.IDLE, {
    reason: ttsResult?.ok ? 'tts-finished' : 'tts-failed',
  });
  await wait(finalIdleMs);

  console.log('\n[TESTE CENA] sequência concluída.');
  console.log('[TESTE CENA] sync_mode=tts-playback-signal');
  if (speakingStartLagMs !== null) {
    console.log(`[TESTE CENA] speaking_inicio_apos_playback_ms=${speakingStartLagMs}`);
  }
  console.log(`[TESTE CENA] speaking_visivel_ms=${speakingVisibleMs}`);
  if (ttsResult?.ok) {
    console.log(`[TESTE CENA] TTS ok | voz=${ttsResult.voice} idioma=${ttsResult.culture} geracao_ms=${ttsResult.generationLatencyMs} reproducao_ms=${ttsResult.playbackDurationMs}`);
  } else {
    console.error(`[TESTE CENA] TTS falhou | ${ttsResult?.error || 'sem resultado'}`);
  }
  console.log(`[TESTE CENA] estado_final=${controller.getState()}`);

  if (exitAfterTest) {
    await preview.stop();
    return;
  }

  console.log('\nA prévia ficará aberta em idle. Pressione Ctrl+C para encerrar.');
  await new Promise(() => {});
}

async function shutdown() {
  try {
    await preview.stop();
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await run();
