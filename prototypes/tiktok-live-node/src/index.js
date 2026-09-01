import { ControlEvent, TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';

const usernameArg = process.argv[2];
const username = (usernameArg || process.env.TIKTOK_USERNAME || '').replace(/^@/, '').trim();

if (!username) {
  console.error('Uso: npm start -- <usuario_tiktok>');
  console.error('Exemplo: npm start -- nome_do_criador');
  console.error('Alternativa: defina TIKTOK_USERNAME no ambiente.');
  process.exit(1);
}

console.log('Live IA — Protótipo TikTok LIVE');
console.log(`Tentando conectar em @${username}...`);
console.log('Modo diagnóstico: somente eventos novos após a conexão.');
console.log('Pressione Ctrl+C para encerrar.\n');

// A versão 2.4.4 acessa propriedades de options durante a construção.
// Desativamos o lote inicial para separar comentários novos do histórico da LIVE.
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

let rawChatDumps = 0;

// Diagnóstico de baixo nível: confirma o payload que a biblioteca decodificou.
connection.on(ControlEvent.DECODED_DATA, (eventName, data) => {
  const normalizedName = String(eventName || '');
  const looksLikeChat = /chat|comment/i.test(normalizedName) || typeof data?.comment === 'string';

  if (looksLikeChat) {
    const user = data?.user?.uniqueId || data?.user?.nickname || data?.uniqueId || 'usuario-desconhecido';
    const comment = data?.comment ?? '(sem campo comment)';
    console.log(`[DEBUG CHAT] evento=${normalizedName} @${user}: ${comment}`);

    if (rawChatDumps < 3) {
      rawChatDumps += 1;
      console.log(`[DEBUG CHAT RAW ${rawChatDumps}] campos=${Object.keys(data || {}).join(', ')}`);
      console.dir(data, { depth: 6, colors: true, maxArrayLength: 20 });
    }
  }
});

connection.on(WebcastEvent.CHAT, (data) => {
  const user = data?.user?.uniqueId || data?.user?.nickname || data?.uniqueId || 'usuario-desconhecido';

  const candidates = [data?.comment, data?.content, data?.text, data?.message, data?.msg];
  const comment = candidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';

  console.log(`[COMENTÁRIO] @${user}: ${comment || '(texto vazio)'}`);

  if (!comment) {
    console.log(`[CHAT SEM TEXTO] campos=${Object.keys(data || {}).join(', ')}`);
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
