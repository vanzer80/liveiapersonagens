import { resolve } from 'node:path';

import { createSceneController, SCENE_STATES, SCENE_VARIANTS } from './scene.js';
import { createScenePreview, openPreviewBrowser } from './scene-preview.js';
import { getTtsConfig, speakText } from './tts.js';

try {
  process.loadEnvFile?.('.env');
} catch {
  // .env opcional.
}

// Forçar lip-sync para o teste controlado
process.env.LIP_SYNC_ENABLED = 'true';

const assetsDirectory = resolve('assets', 'mvp4');
const lipsyncDirectory = resolve(process.env.LIP_SYNC_ASSETS_DIRECTORY || 'assets/mvp7/lipsync');

const cliArgs = process.argv.slice(2).join(' ').trim();
const phrases = cliArgs
  ? [cliArgs]
  : [
      'Oi, eu sou o Bob!',
      'Olá, pessoal! Bem-vindos à nossa live na Fenda do Biquíni!',
      'Bob preparou um hambúrguer para Patrick e foi visitar a Fenda do Biquíni.',
    ];

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

const controller = createSceneController({
  assetsDirectory,
  variant: SCENE_VARIANTS.SPONGEBOB,
});

const preview = createScenePreview({
  assetsDirectory,
  lipsyncDirectory,
});

async function show(state, metadata = {}) {
  const selection = await controller.transitionTo(state, metadata);
  preview.setScene(selection);
  return selection;
}

async function run() {
  const ttsConfig = getTtsConfig();
  console.log('====================================================');
  console.log('Live IA — Teste Controlado de Sincronização Labial');
  console.log('====================================================');
  console.log(`[LIP] enabled=true`);
  console.log(`[LIP] provedor=${ttsConfig.provider}`);
  console.log(`[LIP] voz=${ttsConfig.voice || ttsConfig.fish.referenceId || 'padrão'}`);
  console.log(`[LIP] ativos_boca=${lipsyncDirectory}`);
  console.log(`[LIP] total_frases=${phrases.length}\n`);

  const { url } = await preview.start();
  openPreviewBrowser(url);

  await show(SCENE_STATES.IDLE, { reason: 'test-start' });
  await wait(1500);

  for (let i = 0; i < phrases.length; i += 1) {
    const phrase = phrases[i];
    console.log(`----------------------------------------------------`);
    console.log(`Frase ${i + 1}/${phrases.length}: "${phrase}"`);
    console.log(`----------------------------------------------------`);

    await show(SCENE_STATES.THINKING, { reason: 'ai-processing' });
    await wait(800);

    let startedAcousticAt = null;
    let endedAcousticAt = null;

    const result = await speakText(phrase, {
      force: true,
      onPlaybackStart: async (context) => {
        startedAcousticAt = performance.now();
        console.log(`[LIP] playback_start | visemes=${context.timeline?.length || 0} lipSyncEnabled=${context.lipSyncEnabled}`);
        await show(SCENE_STATES.SPEAKING, {
          ...context,
          reason: 'tts-playback-start',
        });
      },
      onPlaybackEnd: async (context) => {
        endedAcousticAt = performance.now();
        console.log(`[LIP] playback_end | duracao_ms=${context.playbackDurationMs}`);
        await show(SCENE_STATES.IDLE, {
          ...context,
          reason: 'tts-playback-end',
        });
      },
    });

    if (!result.ok) {
      console.error(`[LIP] erro na fala | ${result.error}`);
      await show(SCENE_STATES.IDLE, { reason: 'tts-failed' });
    } else {
      const timelineCount = result.timeline?.length || 0;
      const firstViseme = result.timeline?.[0]?.viseme || 'nenhum';
      const lastViseme = result.timeline?.[timelineCount - 1]?.viseme || 'nenhum';
      const endsInRest = String(lastViseme).toUpperCase() === 'REST';
      console.log(`[LIP] sucesso | geracao_ms=${result.generationLatencyMs} reproducao_ms=${result.playbackDurationMs} visemes=${timelineCount} primeiro=${firstViseme} ultimo=${lastViseme} fallback=false terminou_rest=${endsInRest}`);
    }

    await wait(2000);
  }

  console.log('====================================================');
  console.log('[LIP] Teste de frases concluído com sucesso.');
  console.log('[LIP] Estado final: ' + controller.getState());
  console.log('====================================================');

  const exitAfter = ['1', 'true', 'yes', 'sim', 'on'].includes(
    String(process.env.SCENE_PREVIEW_EXIT_AFTER_TEST || 'true').trim().toLowerCase(),
  );

  if (exitAfter) {
    await preview.stop();
    process.exit(0);
  } else {
    console.log('\nA prévia ficará aberta em idle. Pressione Ctrl+C para encerrar.');
    await new Promise(() => {});
  }
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
