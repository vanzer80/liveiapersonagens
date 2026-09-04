import { ControlEvent, TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';
import {
  generateAiReply,
  getAiConfig,
  getSafeAiKeyInfo,
  isAiConfigured,
  validateAiAuthentication,
} from './ai.js';
import {
  createAmbientRotationController,
  getAmbientRotationConfig,
  loadAmbientRotation,
  validateAmbientAssets,
} from './ambient-rotation.js';
import { routeComment } from './comment-router.js';
import {
  createGiftVideoRouter,
  getGiftVideoConfig,
  loadGiftVideos,
  validateGiftVideoAssets,
} from './gift-videos.js';
import {
  createLiveInteractionEngine,
  getInteractionConfig,
  loadInteractionLines,
  shouldThankGift,
} from './interaction.js';
import { createLiveSceneRuntime, getLiveSceneConfig } from './live-scene.js';
import { getTtsConfig, speakText } from './tts.js';
import {
  createVideoTriggerMatcher,
  getVideoTriggerConfig,
  loadVideoTriggers,
  validateVideoAssets,
} from './video-triggers.js';

const usernameArg = process.argv[2];
const username = (usernameArg || process.env.TIKTOK_USERNAME || '').replace(/^@/, '').trim();

if (!username) {
  console.error('Uso: npm start -- <usuario_tiktok>');
  console.error('Exemplo: npm start -- nome_do_criador');
  console.error('Alternativa: defina TIKTOK_USERNAME no ambiente.');
  process.exit(1);
}

const aiConfig = getAiConfig();
const aiKeyInfo = getSafeAiKeyInfo();
const ttsConfig = getTtsConfig();
const sceneConfig = getLiveSceneConfig();
const interactionConfig = getInteractionConfig();
const interactionLines = loadInteractionLines({ filePath: interactionConfig.linesFile });
const videoConfig = getVideoTriggerConfig();
const videoLibrary = videoConfig.enabled
  ? loadVideoTriggers({
      filePath: videoConfig.triggersFile,
      // Só sobrescreve o JSON quando o .env declara o valor explicitamente.
      cooldownSeconds: videoConfig.cooldownSecondsFromEnv,
    })
  : { triggers: [], cooldownMs: 0, source: 'desativado', fallbackUsed: false };
const videoAssets = videoConfig.enabled
  ? validateVideoAssets({
      triggers: videoLibrary.triggers,
      assetsDirectory: videoConfig.assetsDirectory,
    })
  : { directory: videoConfig.assetsDirectory, present: [], missing: [], ok: true };
const videoMatcher = videoConfig.enabled
  ? createVideoTriggerMatcher({
      triggers: videoLibrary.triggers,
      cooldownMs: videoLibrary.cooldownMs,
    })
  : null;

// Rotação de vídeos de ambiente (MVP 6 — apresentação contínua).
const ambientRotationConfig = getAmbientRotationConfig();
const ambientRotationLibrary = ambientRotationConfig.enabled
  ? loadAmbientRotation({
      filePath: ambientRotationConfig.rotationFile,
      cooldownSeconds: ambientRotationConfig.cooldownSeconds,
    })
  : { clips: [], cooldownMs: 0, source: 'desativado', fallbackUsed: false };
const ambientRotationAssets = ambientRotationConfig.enabled && ambientRotationLibrary.clips.length
  ? validateAmbientAssets({
      clips: ambientRotationLibrary.clips,
      assetsDirectory: ambientRotationConfig.assetsDirectory,
    })
  : { directory: ambientRotationConfig.assetsDirectory, present: [], missing: [], ok: true };
const ambientRotationController = ambientRotationConfig.enabled
  ? createAmbientRotationController({
      clips: ambientRotationLibrary.clips,
      presentFiles: new Set(ambientRotationAssets.present),
      cooldownMs: ambientRotationLibrary.cooldownMs,
      shuffled: ambientRotationConfig.shuffled || ambientRotationLibrary.shuffled,
    })
  : null;

// Vídeos mapeados a presentes (MVP 6 — agradecimento pré-gravado).
const giftVideoConfig = getGiftVideoConfig();
const giftVideoLibrary = giftVideoConfig.enabled
  ? loadGiftVideos({ filePath: giftVideoConfig.giftsFile })
  : { entries: [], source: 'desativado', fallbackUsed: false };
const giftVideoAssets = giftVideoConfig.enabled && giftVideoLibrary.entries.length
  ? validateGiftVideoAssets({
      entries: giftVideoLibrary.entries,
      assetsDirectory: giftVideoConfig.assetsDirectory,
    })
  : { directory: giftVideoConfig.assetsDirectory, present: [], missing: [], ok: true };
const giftVideoRouter = giftVideoConfig.enabled
  ? createGiftVideoRouter({
      entries: giftVideoLibrary.entries,
      presentFiles: new Set(giftVideoAssets.present),
    })
  : null;
const liveScene = createLiveSceneRuntime({ config: sceneConfig });
const connectRetryEnabled = ['1', 'true', 'yes', 'sim', 'on'].includes(
  String(process.env.TIKTOK_CONNECT_RETRY || '').trim().toLowerCase(),
);
const configuredConnectRetryMs = Number(process.env.TIKTOK_CONNECT_RETRY_MS || 5000);
const connectRetryMs = Number.isFinite(configuredConnectRetryMs)
  ? Math.max(1000, configuredConnectRetryMs)
  : 5000;

console.log('Live IA — Protótipo TikTok LIVE');
console.log(`Tentando conectar em @${username}...`);
if (aiConfig.respondAll) {
  console.log('Modo IA: responde a TODOS os comentários (experimental — sem gatilho).');
} else {
  console.log(`Modo IA: comentários iniciados por ${aiConfig.trigger} ou ${aiConfig.trigger.replace(/^\W+/, '')}`);
}
console.log(`Modelo IA: ${aiConfig.model}`);
console.log(
  `TTS: ${ttsConfig.enabled ? 'ativado' : 'desativado'} | provedor=${ttsConfig.provider} ` +
    `voz=${ttsConfig.provider === 'fish-audio' ? `referência-${ttsConfig.fish.referenceId.slice(0, 8) || 'ausente'}` : ttsConfig.voice || 'automática-pt-BR'} ` +
    `velocidade=${ttsConfig.rate}`,
);
console.log(
  `Cena LIVE: ${sceneConfig.enabled ? 'ativada' : 'desativada'} | variante=${sceneConfig.variant}`,
);
console.log(
  `Interação: ${interactionConfig.enabled ? 'ativada' : 'modo básico'} | ` +
    `boas-vindas=${interactionConfig.welcomeEnabled ? 'sim' : 'não'} ` +
    `fala-ambiente=${interactionConfig.ambientEnabled ? `${interactionConfig.ambientMinSilenceMs / 1000}-${interactionConfig.ambientMaxSilenceMs / 1000}s` : 'não'}`,
);
console.log(
  `Falas: ${interactionLines.opening.length} de abertura + ` +
    `${interactionLines.ambient.length} de ambiente | fonte=${interactionLines.source}`,
);
if (videoConfig.enabled) {
  console.log(
    `Vídeos acionáveis: ${videoLibrary.triggers.length} gatilhos | fonte=${videoLibrary.source} ` +
      `cooldown=${Math.round(videoLibrary.cooldownMs / 1000)}s ` +
      `ambiente=${videoConfig.ambientEnabled ? 'sim' : 'não'}`,
  );
  if (videoAssets.missing.length) {
    console.error(
      `[VÍDEO] arquivos ausentes em ${videoAssets.directory}: ${videoAssets.missing.join(', ')}. ` +
        'Os demais gatilhos continuam funcionando.',
    );
  }
} else {
  console.log('Vídeos acionáveis: desativados');
}

if (ambientRotationConfig.enabled) {
  const availableCount = ambientRotationController?.clips?.length ?? 0;
  console.log(
    `Rotação ambiente: ${availableCount} de ${ambientRotationLibrary.clips.length} clipes disponíveis ` +
      `| cooldown=${Math.round(ambientRotationLibrary.cooldownMs / 1000)}s ` +
      `embaralhado=${ambientRotationConfig.shuffled ? 'sim' : 'não'}`,
  );
  if (ambientRotationAssets.missing.length) {
    console.error(
      `[ROTAÇÃO] clipes ausentes em ${ambientRotationAssets.directory}: ` +
        `${ambientRotationAssets.missing.join(', ')}`,
    );
  }
} else {
  console.log('Rotação ambiente: desativada');
}

if (giftVideoConfig.enabled) {
  const availableGiftVideos = giftVideoAssets.present.length;
  console.log(
    `Vídeos de presente: ${availableGiftVideos} de ${giftVideoLibrary.entries.length} disponíveis ` +
      `| fonte=${giftVideoLibrary.source}`,
  );
  if (giftVideoAssets.missing.length) {
    console.error(
      `[PRESENTE] vídeos ausentes em ${giftVideoAssets.directory}: ` +
        `${giftVideoAssets.missing.join(', ')}`,
    );
  }
} else {
  console.log('Vídeos de presente: desativados');
}
if (ttsConfig.error) {
  console.error(`[ERRO TTS] latencia_ms=0 | ${ttsConfig.error}`);
}

if (aiKeyInfo.placeholder) {
  console.log('Chave IA: NÃO configurada — o .env ainda contém cole_sua_chave_aqui');
} else {
  console.log(`Chave IA: ${isAiConfigured() ? 'configurada' : 'NÃO configurada'}`);
}

if (aiKeyInfo.configured) {
  console.log(`Formato da chave: ${aiKeyInfo.formatLooksValid ? 'compatível com OpenRouter' : 'ATENÇÃO — formato inesperado'} (${aiKeyInfo.length} caracteres)`);

  try {
    await validateAiAuthentication();
    console.log('Autenticação OpenRouter: VALIDADA');
  } catch (error) {
    console.error(`Autenticação OpenRouter: FALHOU — ${error instanceof Error ? error.message : error}`);
  }
}

try {
  await liveScene.start();
} catch (error) {
  console.error(`[ERRO CENA LIVE] ${error instanceof Error ? error.message : error}`);
  console.error('A LIVE não será iniciada sem os três ativos visuais configurados.');
  process.exit(1);
}

console.log('Pressione Ctrl+C para encerrar.\n');

// A versão 2.4.4 acessa propriedades de options durante a construção.
// Mantemos o lote inicial desativado para trabalhar apenas com eventos novos da LIVE.
const connection = new TikTokLiveConnection(username, {
  processInitialData: false,
});
let shuttingDown = false;

connection.on(ControlEvent.ERROR, (error) => {
  const info = error?.info || 'sem-info';
  const exception = error?.exception || error;
  console.error('[ERRO CONECTOR]', info, exception);
});

connection.on(ControlEvent.DISCONNECTED, ({ code, reason } = {}) => {
  console.log(`[DESCONECTADO] code=${code ?? '?'} reason=${reason ?? 'sem-motivo'}`);
});

function extractChatText(data) {
  const candidates = [
    ['comment', data?.comment],
    ['content', data?.content],
    ['text', data?.text],
    ['message', data?.message],
    ['msg', data?.msg],
  ];

  return candidates.find(([, value]) => typeof value === 'string' && value.trim().length > 0) || [null, ''];
}

let detectedChatTextField = null;
// Sem o motor de interação não existe fila, então UMA trava única garante
// "uma mídia por vez": vídeo e resposta de IA nunca rodam em paralelo.
let directBusy = false;

async function processAiReply({ user, comment: selectedText }) {
  console.log(`[ENTRADA IA] @${user}: ${selectedText}`);
  const aiStartedAt = performance.now();

  try {
    await liveScene.showThinking({ user, comment: selectedText });
    const result = await generateAiReply({ user, comment: selectedText });
    const latencyMs = Math.round(performance.now() - aiStartedAt);

    if (result.fallbackUsed) {
      console.log(`[FALLBACK IA] principal=${result.requestedModel} utilizado=${result.model}`);
    }

    console.log(`[RESPOSTA IA] modelo=${result.model} latencia_ms=${latencyMs}`);
    console.log(`[RESPOSTA IA] @${user}: ${result.text}`);
    await liveScene.speak(result.text, {
      speaker: speakText,
      metadata: { user, comment: selectedText },
    });
  } catch (error) {
    const latencyMs = Math.round(performance.now() - aiStartedAt);
    console.error(
      `[ERRO IA] latencia_ms=${latencyMs} | ${error instanceof Error ? error.message : error}`,
    );
  } finally {
    try {
      await liveScene.ensureIdle({ reason: 'interaction-finished', user });
    } catch (error) {
      console.error(`[ERRO CENA LIVE] falha ao retornar para idle: ${error instanceof Error ? error.message : error}`);
    }
  }
}

// Reproduz um clipe do MVP 6. O áudio é o do próprio MP4: nenhum TTS é gerado aqui.
async function playTriggeredVideo({ id, video, user = null, phrase = null }) {
  console.log(
    `[VÍDEO] usuario=${user || 'ambiente'} | gatilho=${id} | arquivo=${video}` +
      (phrase ? ` | expressao=${phrase}` : ''),
  );

  const result = await liveScene.playClip(video, { videoId: id, user });

  if (result?.ok) {
    console.log(`[VÍDEO] concluído | gatilho=${id} | arquivo=${video}`);
    // Registra término para o controlador de rotação de ambiente (se aplicável).
    if (phrase === 'rotacao-ambiente' && ambientRotationController) {
      ambientRotationController.markPlayed(id);
    }
  }

  return result;
}

const interactions = createLiveInteractionEngine({
  config: interactionConfig,
  openingLines: interactionLines.opening,
  ambientLines: interactionLines.ambient,
  speak: (text, metadata) => liveScene.speak(text, {
    speaker: speakText,
    metadata,
  }),
  answerQuestion: processAiReply,
  playVideo: videoConfig.enabled ? playTriggeredVideo : null,
  findAmbientVideo:
    videoConfig.enabled && videoConfig.ambientEnabled && videoMatcher
      ? () => {
          const clip = videoMatcher.findAmbient();
          // Marcar aqui evita que o convite toque em TODO beat de silêncio:
          // o caminho de ambiente enfileira logo em seguida.
          if (clip) videoMatcher.markFired(clip.id);
          return clip;
        }
      : null,
  findAmbientRotation:
    ambientRotationConfig.enabled && ambientRotationController?.hasClips
      ? () => ambientRotationController.next()
      : null,
});

function queueTriggeredVideo(user, clip) {
  const { id, video, phrase } = clip;

  if (interactionConfig.enabled) {
    const result = interactions.onVideo({ id, video, user, phrase });
    // O cooldown só começa quando o vídeo realmente entrou na fila.
    if (result?.accepted) videoMatcher.markFired(id);
    return;
  }

  if (directBusy) {
    console.log(`[VÍDEO] gatilho=${id} ignorado — outra mídia já está em reprodução.`);
    return;
  }

  videoMatcher.markFired(id);
  directBusy = true;
  void playTriggeredVideo({ id, video, user, phrase }).finally(() => {
    directBusy = false;
  });
}

function handleComment(user, comment) {
  const decision = routeComment({
    comment,
    trigger: aiConfig.trigger,
    respondAll: aiConfig.respondAll,
    findVideo: videoMatcher ? (text) => videoMatcher.match(text) : null,
  });

  if (decision.kind === 'video') {
    queueTriggeredVideo(user, decision.video);
    return;
  }

  if (decision.kind !== 'ai') {
    if (decision.reason === 'trigger-without-message') {
      console.log(`[DECISÃO IA] @${user}: ignorado — gatilho sem mensagem.`);
    }
    return;
  }

  const selectedText = decision.text;

  console.log(`[DECISÃO IA] @${user}: selecionado | motivo=${decision.reason}`);
  if (interactionConfig.enabled) {
    interactions.onQuestion({ user, comment: selectedText });
    return;
  }

  if (directBusy) {
    console.log(`[DECISÃO IA] @${user}: ignorado — outra mídia já está em reprodução.`);
    return;
  }

  directBusy = true;
  void processAiReply({ user, comment: selectedText }).finally(() => {
    directBusy = false;
  });
}

connection.on(WebcastEvent.CHAT, (data) => {
  const user = data?.user?.uniqueId || data?.user?.nickname || data?.uniqueId || 'usuario-desconhecido';
  const displayName = data?.user?.nickname || user;
  const [field, comment] = extractChatText(data);

  if (field && !detectedChatTextField) {
    detectedChatTextField = field;
    console.log(`[INFO CHAT] campo de texto detectado: ${field}`);
  }

  console.log(`[COMENTÁRIO] @${user}: ${comment || '(texto vazio)'}`);
  interactions.onAudienceActivity();

  if (comment) {
    handleComment(displayName, comment);
  }
});

connection.on(WebcastEvent.MEMBER, (data) => {
  const userId = data?.user?.uniqueId || data?.uniqueId || data?.user?.nickname || 'usuario-desconhecido';
  const displayName = data?.user?.nickname || data?.user?.uniqueId || data?.uniqueId || 'pessoal';
  console.log(`[ENTRADA] @${userId}`);
  interactions.onMember({ id: userId, name: displayName });
});

connection.on(WebcastEvent.GIFT, (data) => {
  const user = data?.user?.uniqueId || data?.user?.nickname || data?.uniqueId || 'usuario-desconhecido';
  const giftId = data?.giftId ?? 'desconhecido';
  const giftType = data?.giftDetails?.giftType ?? data?.giftType;
  const repeatEnd = data?.repeatEnd;
  const repeatCount = data?.repeatCount ?? 1;
  const giftName = data?.giftDetails?.giftName || data?.giftName || 'presente';
  console.log(
    `[PRESENTE] @${user} | giftId=${giftId} nome=${giftName} repeticoes=${repeatCount} ` +
      `sequencia_finalizada=${repeatEnd ?? 'não-aplicável'}`,
  );

  if (!shouldThankGift({ giftType, repeatEnd })) {
    console.log(`[PRESENTE] @${user} | aguardando o fim da sequência antes de agradecer.`);
    return;
  }

  const displayName = data?.user?.nickname || user;

  // Tenta usar vídeo pré-gravado; cai para TTS se não houver mapeamento ou arquivo.
  if (giftVideoRouter?.hasEntries) {
    const clip = giftVideoRouter.findVideo(giftName, String(giftId));
    if (clip) {
      console.log(`[PRESENTE] vídeo=${clip.id} | arquivo=${clip.video} | usuario=${displayName}`);
      giftVideoRouter.markFired(clip.id);
      if (interactionConfig.enabled) {
        interactions.onGiftVideo({
          user: displayName,
          giftName,
          clipId: clip.id,
          clipFile: clip.video,
        });
      } else {
        if (!directMediaBusy) {
          directMediaBusy = true;
          void playTriggeredVideo({ id: clip.id, video: clip.video, user: displayName, phrase: `presente:${giftName}` }).finally(() => {
            directMediaBusy = false;
          });
        }
      }
      return;
    }
  }

  // Fallback padrão: agradecimento dinâmico por TTS.
  interactions.onGift({
    user: displayName,
    giftName,
  });
});

connection.on(WebcastEvent.LIKE, (data) => {
  const user = data?.user?.uniqueId || data?.user?.nickname || data?.uniqueId || 'usuario-desconhecido';
  const count = data?.likeCount ?? data?.totalLikeCount ?? '?';
  console.log(`[LIKE] @${user} | quantidade=${count}`);
});

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\nEncerrando conexão...');
  interactions.stop();
  try {
    await connection.disconnect();
  } catch {
    // Nada a fazer no encerramento do protótipo.
  }
  await liveScene.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function connectToLive() {
  let attempt = 0;

  while (!shuttingDown) {
    attempt += 1;
    try {
      const state = await connection.connect();
      console.log(`Conectado. roomId=${state.roomId}\n`);
      return;
    } catch (error) {
      console.error('\nFalha ao conectar na TikTok LIVE.');
      console.error(error instanceof Error ? error.message : error);

      if (!connectRetryEnabled) {
        console.error('\nConfirme se o usuário está realmente AO VIVO e tente novamente.');
        await liveScene.stop();
        process.exit(1);
      }

      console.log(
        `[CONEXÃO] tentativa=${attempt} | aguardando a LIVE de @${username}; nova tentativa em ${connectRetryMs} ms.`,
      );
      await new Promise((resolveRetry) => setTimeout(resolveRetry, connectRetryMs));
    }
  }
}

await connectToLive();
interactions.start();
