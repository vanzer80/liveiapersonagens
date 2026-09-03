import assert from 'node:assert/strict';
import test from 'node:test';
import {
  encodePowerShellCommand,
  getTtsConfig,
  normalizeTextForSpeech,
  parseTtsMetadata,
  speakText,
} from '../src/tts.js';

test('codifica o script completo no formato esperado pelo Windows PowerShell', () => {
  const script = "$texto = 'Olá'\nWrite-Output $texto";
  const encoded = encodePowerShellCommand(script);

  assert.equal(Buffer.from(encoded, 'base64').toString('utf16le'), script);
});

test('normaliza Markdown, emoji e URL sem perder o sentido', () => {
  const input = '**Olá** `pessoal`! Veja [o projeto](https://example.com/projeto) 🚀 https://example.com';
  assert.equal(normalizeTextForSpeech(input), 'Olá pessoal! Veja o projeto link');
});

test('remove bloco de código e normaliza espaços', () => {
  const input = 'Resposta: ```js\nconst segredo = 1;\n``` tudo certo.';
  assert.equal(normalizeTextForSpeech(input), 'Resposta: tudo certo.');
});

test('interpreta metadados de voz gravados em UTF-8', () => {
  assert.deepEqual(parseTtsMetadata('\uFEFF{"voice":"Microsoft Maria","culture":"pt-BR"}\r\n'), {
    voice: 'Microsoft Maria',
    culture: 'pt-BR',
  });
});

test('rejeita metadados sem identificação da voz', () => {
  assert.throws(() => parseTtsMetadata('{"culture":"pt-BR"}'), /Metadados inesperados/);
});

test('usa configuração padrão segura quando TTS não foi habilitado', () => {
  const previous = {
    enabled: process.env.TTS_ENABLED,
    provider: process.env.TTS_PROVIDER,
    voice: process.env.TTS_VOICE,
    rate: process.env.TTS_RATE,
  };

  delete process.env.TTS_ENABLED;
  delete process.env.TTS_PROVIDER;
  delete process.env.TTS_VOICE;
  delete process.env.TTS_RATE;

  try {
    assert.deepEqual(getTtsConfig(), {
      enabled: false,
      provider: 'windows-sapi',
      voice: '',
      rate: 0,
      error: null,
    });
  } finally {
    if (previous.enabled === undefined) delete process.env.TTS_ENABLED;
    else process.env.TTS_ENABLED = previous.enabled;
    if (previous.provider === undefined) delete process.env.TTS_PROVIDER;
    else process.env.TTS_PROVIDER = previous.provider;
    if (previous.voice === undefined) delete process.env.TTS_VOICE;
    else process.env.TTS_VOICE = previous.voice;
    if (previous.rate === undefined) delete process.env.TTS_RATE;
    else process.env.TTS_RATE = previous.rate;
  }
});

test('marca velocidade inválida sem derrubar o processo', () => {
  const previous = process.env.TTS_RATE;
  process.env.TTS_RATE = '11';

  try {
    assert.deepEqual(getTtsConfig(), {
      enabled: false,
      provider: 'windows-sapi',
      voice: '',
      rate: 0,
      error: 'TTS_RATE deve ser um número inteiro entre -10 e 10.',
    });
  } finally {
    if (previous === undefined) delete process.env.TTS_RATE;
    else process.env.TTS_RATE = previous;
  }
});

test('TTS desativado não tenta executar o provedor', async () => {
  const previous = process.env.TTS_ENABLED;
  process.env.TTS_ENABLED = 'false';

  try {
    assert.deepEqual(await speakText('frase de teste'), {
      ok: true,
      skipped: true,
      reason: 'disabled',
    });
  } finally {
    if (previous === undefined) delete process.env.TTS_ENABLED;
    else process.env.TTS_ENABLED = previous;
  }
});

test('configuração inválida vira erro de TTS sem lançar exceção', async () => {
  const previousRate = process.env.TTS_RATE;
  const previousError = console.error;
  process.env.TTS_RATE = 'rápido';
  console.error = () => {};

  try {
    const result = await speakText('frase de teste', { force: true });
    assert.equal(result.ok, false);
    assert.match(result.error, /entre -10 e 10/);
  } finally {
    console.error = previousError;
    if (previousRate === undefined) delete process.env.TTS_RATE;
    else process.env.TTS_RATE = previousRate;
  }
});
