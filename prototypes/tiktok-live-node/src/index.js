import { TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';

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
console.log('Pressione Ctrl+C para encerrar.\n');

const connection = new TikTokLiveConnection(username);

connection.on(WebcastEvent.CHAT, (data) => {
  const user = data?.user?.uniqueId || data?.user?.nickname || 'usuario-desconhecido';
  const comment = data?.comment ?? '';
  console.log(`[COMENTÁRIO] @${user}: ${comment}`);
});

connection.on(WebcastEvent.MEMBER, (data) => {
  const user = data?.user?.uniqueId || data?.user?.nickname || 'usuario-desconhecido';
  console.log(`[ENTRADA] @${user}`);
});

connection.on(WebcastEvent.GIFT, (data) => {
  const user = data?.user?.uniqueId || data?.user?.nickname || 'usuario-desconhecido';
  const giftId = data?.giftId ?? 'desconhecido';
  console.log(`[PRESENTE] @${user} | giftId=${giftId}`);
});

connection.on(WebcastEvent.LIKE, (data) => {
  const user = data?.user?.uniqueId || data?.user?.nickname || 'usuario-desconhecido';
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
