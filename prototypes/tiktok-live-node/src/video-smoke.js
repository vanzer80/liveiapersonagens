import { createLiveSceneRuntime, getLiveSceneConfig } from './live-scene.js';
import {
  getVideoTriggerConfig,
  loadVideoTriggers,
  validateVideoAssets,
} from './video-triggers.js';

try {
  process.loadEnvFile?.('.env');
} catch {
  // .env é opcional para este teste local.
}

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

// A cena é forçada porque este comando existe justamente para inspecionar o vídeo.
const sceneConfig = { ...getLiveSceneConfig(), enabled: true };
const videoConfig = getVideoTriggerConfig();
const library = loadVideoTriggers({
  filePath: videoConfig.triggersFile,
  cooldownSeconds: videoConfig.cooldownSeconds,
});
const assets = validateVideoAssets({
  triggers: library.triggers,
  assetsDirectory: sceneConfig.mediaDirectory,
});

const requested = String(process.argv[2] || '').trim().toLowerCase();

function printCatalog() {
  console.log('\nVídeos disponíveis:');
  for (const trigger of library.triggers) {
    const status = assets.missing.includes(trigger.video) ? 'AUSENTE' : 'ok';
    console.log(`  ${trigger.id.padEnd(16)} ${trigger.video.padEnd(28)} [${status}]`);
  }
  console.log('\nUso: npm run test:videos -- <id>');
  console.log('Exemplo: npm run test:videos -- patrick\n');
}

console.log('Live IA — teste local dos vídeos acionáveis (MVP 6)');
console.log(`Pasta dos clipes: ${assets.directory}`);
console.log(`Gatilhos carregados: ${library.triggers.length} | fonte=${library.source}`);

if (assets.missing.length) {
  console.error(`[VÍDEO] ausentes: ${assets.missing.join(', ')}`);
}

if (!requested || requested === 'list') {
  printCatalog();
  process.exit(0);
}

const selected = library.triggers.find(
  (trigger) => trigger.id.toLowerCase() === requested || trigger.video.toLowerCase() === requested,
);

if (!selected) {
  console.error(`\n[ERRO] gatilho "${requested}" não encontrado.`);
  printCatalog();
  process.exit(1);
}

const scene = createLiveSceneRuntime({ config: sceneConfig });
let shuttingDown = false;

async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  await scene.stop().catch(() => {});
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

try {
  const started = await scene.start();
  console.log(`\nPrévia aberta em ${started.url}`);
  console.log('IMPORTANTE: se não ouvir som, clique UMA vez na janela da prévia e rode de novo.');
  console.log('Mantendo o Bob em idle por 3 segundos antes de acionar o clipe...\n');

  await delay(3000);

  console.log(`[TESTE VÍDEO] acionando gatilho=${selected.id} arquivo=${selected.video}`);
  const startedAt = performance.now();
  const result = await scene.playClip(selected.video, { videoId: selected.id, user: 'teste-local' });
  const elapsedMs = Math.round(performance.now() - startedAt);

  console.log(`[TESTE VÍDEO] status=${result.status} ok=${result.ok} duracao_ms=${elapsedMs}`);
  console.log(`[TESTE VÍDEO] estado_final=${scene.getState()}`);

  if (result.status === 'blocked') {
    console.error(
      '[TESTE VÍDEO] o navegador bloqueou o áudio. Clique uma vez na prévia e execute novamente.',
    );
  }

  console.log('\nMantendo a prévia em idle por 3 segundos para conferência visual...');
  await delay(3000);
  await shutdown(result.ok ? 0 : 1);
} catch (error) {
  console.error(`[TESTE VÍDEO] falhou: ${error instanceof Error ? error.message : error}`);
  await shutdown(1);
}
