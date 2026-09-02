import { ControlEvent, TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';
import {
  generateAiReply,
  getAiConfig,
  getSafeAiKeyInfo,
  isAiConfigured,
  validateAiAuthentication,
} from './ai.js';
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

console.log('Live IA — Protótipo TikTok LIVE');
console.log(`Tentando conectar em @${username}...`);
console.log(`Modo IA: comentários iniciados por ${aiConfig.trigger} ou ${aiConfig.trigger.replace(/^\W+/, '')}`);
console.log(`Modelo IA: ${aiConfig.model}`);
console.log(
  `TTS: ${ttsConfig.enabled ? 'ativado' : 'desativado'} | provedor=${ttsConfig.provider} voz=${ttsConfig.voice || 'automática-pt-BR'} velocidade=${ttsConfig.rate}`,
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

console.log('Pressione Ctrl+C para encerrar.\n');

// A versão 2.4.4 acessa propriedades de options durante a construção.
// Mantemos o lote inicial desativado para trabalhar apenas com eventos novos da LIVE.
const connection = new TikTokLiveConnection(username, {
  processInitialData: false,
});

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
let aiBusy = false;

async function maybeGenerateAiReply(user, comment) {
  const matchedTrigger = matchAiTrigger(comment);

  if (!matchedTrigger) {
    return;
  }

  const trimmedComment = comment.trimStart();
  const selectedText = trimmedComment.slice(matchedTrigger.length).trim();

  if (!selectedText) {
    console.log(`[DECISÃO IA] @${user}: ignorado — gatilho sem mensagem.`);
    return;
  }

  if (aiBusy) {
    console.log(`[DECISÃO IA] @${user}: ignorado — IA já está processando outro comentário.`);
    return;
  }

  console.log(`[DECISÃO IA] @${user}: selecionado.`);
  console.log(`[ENTRADA IA] @${user}: ${selectedText}`);

  aiBusy = true;
  const aiStartedAt = performance.now();

  try {
    const result = await generateAiReply({ user, comment: selectedText });
    const latencyMs = Math.round(performance.now() - aiStartedAt);

    if (result.fallbackUsed) {
      console.log(`[FALLBACK IA] principal=${result.requestedModel} utilizado=${result.model}`);
    }

    console.log(`[RESPOSTA IA] modelo=${result.model} latencia_ms=${latencyMs}`);
    console.log(`[RESPOSTA IA] @${user}: ${result.text}`);
    await speakText(result.text);
  } catch (error) {
    const latencyMs = Math.round(performance.now() - aiStartedAt);
    console.error(
      `[ERRO IA] latencia_ms=${latencyMs} | ${error instanceof Error ? error.message : error}`,
    );
  } finally {
    aiBusy = false;
  }
}

connection.on(WebcastEvent.CHAT, (data) => {
  const user = data?.user?.uniqueId || data?.user?.nickname || data?.uniqueId || 'usuario-desconhecido';
  const [field, comment] = extractChatText(data);

  if (field && !detectedChatTextField) {
    detectedChatTextField = field;
    console.log(`[INFO CHAT] campo de texto detectado: ${field}`);
  }

  console.log(`[COMENTÁRIO] @${user}: ${comment || '(texto vazio)'}`);

  if (comment) {
    void maybeGenerateAiReply(user, comment);
  }
});

connection.on(WebcastEvent.MEMBER, (data) => {
  const user = data?.user?.uniqueId || data?.user?.nickname || data?.uniqueId || 'usuario-desconhecido';
  console.log(`[ENTRADA] @${user}`);
});

connection.on(WebcastEvent.GIFT, (data) => {
  const user = data?.user?.uniqueId || data?.user?.nickname || data?.uniqueId || 'usuario-desconhecido';
  const giftId = data?.giftId ?? 'desconhecido';
  console.log(`[PRESENTE] @${user} | giftId=${giftId}`);
});

connection.on(WebcastEvent.LIKE, (data) => {
  const user = data?.user?.uniqueId || data?.user?.nickname || data?.uniqueId || 'usuario-desconhecido';
  const count = data?.likeCount ?? data?.totalLikeCount ?? '?';
  console.log(`[LIKE] @${user} | quantidade=${count}`);
});

try {
  const state = await connection.connect();
  console.log(`Conectado. roomId=${state.roomId}\n`);
} catch (error) {
  console.error('\nFalha ao conectar na TikTok LIVE.');
  console.error(error instanceof Error ? error.message : error);
  console.error('\nConfirme se o usuário está realmente AO VIVO e tente novamente.');
  process.exit(1);
}

async function shutdown() {
  console.log('\nEncerrando conexão...');
  try {
    await connection.disconnect();
  } catch {
    // Nada a fazer no encerramento do protótipo.
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
