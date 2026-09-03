import { ControlEvent, TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';
import {
  generateAiReply,
  getAiConfig,
  getSafeAiKeyInfo,
  isAiConfigured,
  validateAiAuthentication,
} from './ai.js';
import { createLiveInteractionEngine, getInteractionConfig } from './interaction.js';
import { createLiveSceneRuntime, getLiveSceneConfig } from './live-scene.js';
import { getTtsConfig, speakText } from './tts.js';

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
console.log(`Modo IA: comentários iniciados por ${aiConfig.trigger} ou ${aiConfig.trigger.replace(/^\W+/, '')}`);
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
    `fala-ambiente=${interactionConfig.ambientEnabled ? `${interactionConfig.ambientSilenceMs / 1000}s` : 'não'}`,
);
if (ttsConfig.error) {
  console.error(`[ERRO TTS] latencia_ms=0 | ${ttsConfig.error}`);
}

if (aiKeyInfo.placeholderDetected) {
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

function matchAiTrigger(comment) {
  const configured = aiConfig.trigger.trim();
  const withoutPunctuation = configured.replace(/^\W+/, '');
  const candidates = [...new Set([configured, withoutPunctuation].filter(Boolean))];
  const normalizedComment = comment.trimStart().toLowerCase();

  for (const candidate of candidates) {
    const normalizedCandidate = candidate.toLowerCase();
    if (
      normalizedComment === normalizedCandidate ||
      normalizedComment.startsWith(`${normalizedCandidate} `)
    ) {
      return candidate;
    }
  }

  return null;
}

let detectedChatTextField = null;
let directAiBusy = false;

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

const interactions = createLiveInteractionEngine({
  config: interactionConfig,
  speak: (text, metadata) => liveScene.speak(text, {
    speaker: speakText,
    metadata,
  }),
  answerQuestion: processAiReply,
});
interactions.start();

function maybeQueueAiReply(user, comment) {
  const matchedTrigger = matchAiTrigger(comment);

  if (!matchedTrigger) return;

  const trimmedComment = comment.trimStart();
  const selectedText = trimmedComment.slice(matchedTrigger.length).trim();

  if (!selectedText) {
    console.log(`[DECISÃO IA] @${user}: ignorado — gatilho sem mensagem.`);
    return;
  }

  console.log(`[DECISÃO IA] @${user}: selecionado.`);
  if (interactionConfig.enabled) {
    interactions.onQuestion({ user, comment: selectedText });
    return;
  }

  if (directAiBusy) {
    console.log(`[DECISÃO IA] @${user}: ignorado — IA já está processando outro comentário.`);
    return;
  }

  directAiBusy = true;
  void processAiReply({ user, comment: selectedText }).finally(() => {
    directAiBusy = false;
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
    maybeQueueAiReply(displayName, comment);
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
  console.log(`[PRESENTE] @${user} | giftId=${giftId}`);
  interactions.onGift({
    user: data?.user?.nickname || user,
    giftName: data?.giftDetails?.giftName || data?.giftName || 'presente',
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
