import { getTtsConfig, speakText } from './tts.js';

const text = process.argv.slice(2).join(' ').trim() ||
  'Olá! Este é o teste de voz do Projeto Live IA em português brasileiro.';
const config = getTtsConfig();

console.log('Live IA — Teste controlado de TTS');
console.log(`Provedor TTS: ${config.provider}`);
console.log(`Voz solicitada: ${config.voice || 'automática com preferência por pt-BR'}`);
console.log(`Velocidade: ${config.rate}`);

if (config.error) {
  console.error(`[ERRO TTS] latencia_ms=0 | ${config.error}`);
}

if (!config.enabled) {
  console.log('TTS_ENABLED não está ativo; o teste controlado executará o adaptador mesmo assim.');
}

const result = await speakText(text, { force: true });

if (!result.ok) {
  process.exitCode = 1;
}
