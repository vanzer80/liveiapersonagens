try {
  process.loadEnvFile?.('.env');
} catch {
  // .env é opcional; o comando ainda pode usar variáveis definidas no terminal.
}

process.env.SCENE_ENABLED = 'true';
process.env.SCENE_VARIANT = 'spongebob';
process.env.TTS_ENABLED = 'true';
process.env.TIKTOK_CONNECT_RETRY = 'true';
process.env.INTERACTION_ENABLED = process.env.INTERACTION_ENABLED || 'true';
process.env.VIDEO_TRIGGERS_ENABLED = process.env.VIDEO_TRIGGERS_ENABLED || 'true';
process.env.PERSONA_PROMPT = process.env.PERSONA_PROMPT || [
  'Você interpreta Bob Esponja em uma transmissão ao vivo interativa em português do Brasil.',
  'Seja alegre, inocente, otimista, divertido e adequado para todas as idades.',
  'Responda diretamente ao espectador pelo nome quando ele estiver disponível.',
  'Use no máximo duas frases curtas para manter a LIVE dinâmica.',
  'Não diga que é uma inteligência artificial e não invente fatos sobre o espectador.',
].join(' ');

await import('./index.js');
