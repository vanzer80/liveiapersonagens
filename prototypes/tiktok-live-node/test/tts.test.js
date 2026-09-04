import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFishTimestampedRequest,
  buildFishTtsRequest,
  encodePowerShellCommand,
  getTtsConfig,
  getWavDurationMs,
  normalizeTextForSpeech,
  parseTtsMetadata,
  sanitizeWavHeader,
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

const TTS_ENV_VARS = [
  'TTS_ENABLED',
  'TTS_PROVIDER',
  'TTS_VOICE',
  'TTS_RATE',
  'FISH_AUDIO_API_KEY',
  'FISH_AUDIO_REFERENCE_ID',
  'FISH_AUDIO_MODEL',
  'FISH_AUDIO_API_URL',
  'FISH_AUDIO_LATENCY',
  'LIP_SYNC_ENABLED',
  'LIP_SYNC_ASSETS_DIRECTORY',
  'LIP_SYNC_MIN_HOLD_MS',
  'LIP_SYNC_AUDIO_OFFSET_MS',
];

function withIsolatedTtsEnv(fn) {
  const previous = {};
  for (const key of TTS_ENV_VARS) {
    previous[key] = process.env[key];
    delete process.env[key];
  }

  try {
    return fn();
  } finally {
    for (const key of TTS_ENV_VARS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test('usa configuração padrão segura quando TTS não foi habilitado', () => {
  withIsolatedTtsEnv(() => {
    assert.deepEqual(getTtsConfig(), {
      enabled: false,
      provider: 'windows-sapi',
      voice: '',
      rate: 0,
      error: null,
      fish: {
        apiUrl: 'https://api.fish.audio/v1/tts',
        apiKey: '',
        referenceId: '',
        model: 's2.1-pro-free',
        latency: 'balanced',
      },
      lipSync: {
        enabled: false,
        assetsDirectory: 'assets/mvp7/lipsync',
        minHoldMs: 65,
        audioOffsetMs: 0,
      },
    });
  });
});

test('marca velocidade inválida sem derrubar o processo', () => {
  withIsolatedTtsEnv(() => {
    process.env.TTS_RATE = '11';
    assert.deepEqual(getTtsConfig(), {
      enabled: false,
      provider: 'windows-sapi',
      voice: '',
      rate: 0,
      error: 'TTS_RATE deve ser um número inteiro entre -10 e 10.',
      fish: {
        apiUrl: 'https://api.fish.audio/v1/tts',
        apiKey: '',
        referenceId: '',
        model: 's2.1-pro-free',
        latency: 'balanced',
      },
      lipSync: {
        enabled: false,
        assetsDirectory: 'assets/mvp7/lipsync',
        minHoldMs: 65,
        audioOffsetMs: 0,
      },
    });
  });
});

test('monta a solicitação Fish Audio sem colocar a chave no corpo', () => {
  const config = {
    fish: {
      apiUrl: 'https://api.fish.audio/v1/tts',
      apiKey: 'segredo-de-teste',
      referenceId: 'referencia-123',
      model: 's2.1-pro-free',
      latency: 'balanced',
    },
  };
  const request = buildFishTtsRequest('Olá ao vivo', config);
  const body = JSON.parse(request.options.body);

  assert.equal(request.options.headers.Authorization, 'Bearer segredo-de-teste');
  assert.equal(request.options.headers.model, 's2.1-pro-free');
  assert.equal(body.reference_id, 'referencia-123');
  assert.equal(body.text, 'Olá ao vivo');
  assert.equal(request.options.body.includes('segredo-de-teste'), false);
});

test('Fish Audio informa claramente quando falta chave ou referência', () => {
  const previous = {
    provider: process.env.TTS_PROVIDER,
    apiKey: process.env.FISH_AUDIO_API_KEY,
    referenceId: process.env.FISH_AUDIO_REFERENCE_ID,
  };
  process.env.TTS_PROVIDER = 'fish-audio';
  delete process.env.FISH_AUDIO_API_KEY;
  delete process.env.FISH_AUDIO_REFERENCE_ID;

  try {
    assert.match(getTtsConfig().error, /FISH_AUDIO_API_KEY ausente/);
    process.env.FISH_AUDIO_API_KEY = 'chave-de-teste';
    assert.match(getTtsConfig().error, /FISH_AUDIO_REFERENCE_ID ausente/);
  } finally {
    if (previous.provider === undefined) delete process.env.TTS_PROVIDER;
    else process.env.TTS_PROVIDER = previous.provider;
    if (previous.apiKey === undefined) delete process.env.FISH_AUDIO_API_KEY;
    else process.env.FISH_AUDIO_API_KEY = previous.apiKey;
    if (previous.referenceId === undefined) delete process.env.FISH_AUDIO_REFERENCE_ID;
    else process.env.FISH_AUDIO_REFERENCE_ID = previous.referenceId;
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

test('sanitizeWavHeader corrige tamanho dos chunks data e RIFF em streaming WAV', () => {
  // Cria um buffer simulando um WAV com chunk data indefinido/streaming (0xFFFFFF00)
  const buf = Buffer.alloc(100);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(92, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.write('data', 36);
  buf.writeUInt32LE(0xFFFFFF00, 40); // tamanho incorreto de streaming

  const sanitized = sanitizeWavHeader(buf);
  // Tamanho real dos dados é 100 - (36 + 8) = 56
  assert.equal(sanitized.readUInt32LE(40), 56);
  assert.equal(sanitized.readUInt32LE(4), 92);
});

test('buildFishTimestampedRequest aponta para /tts/stream/with-timestamp sem expor chave no corpo', () => {
  const config = {
    fish: {
      apiUrl: 'https://api.fish.audio/v1/tts',
      apiKey: 'chave-secreta',
      referenceId: 'voz-teste',
      model: 's2.1-pro-free',
      latency: 'balanced',
    },
  };
  const request = buildFishTimestampedRequest('Texto de teste', config);
  assert.equal(request.url, 'https://api.fish.audio/v1/tts/stream/with-timestamp');
  assert.equal(request.options.headers.Authorization, 'Bearer chave-secreta');
  assert.equal(request.options.headers.model, 's2.1-pro-free');
  const body = JSON.parse(request.options.body);
  assert.equal(body.text, 'Texto de teste');
  assert.equal(body.reference_id, 'voz-teste');
  assert.equal(body.format, 'wav');
  assert.equal(request.options.body.includes('chave-secreta'), false);
});

test('getWavDurationMs calcula duração a partir do cabeçalho WAV', () => {
  const buf = Buffer.alloc(44 + 32000);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(32036, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(16000, 24); // sample rate
  buf.writeUInt32LE(32000, 28); // byte rate (32000 bytes/sec)
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(32000, 40); // 32000 bytes = 1000ms

  const durationMs = getWavDurationMs(buf);
  assert.equal(durationMs, 1000);
});

test('AUDIO_PLAYBACK_START chega ao Node em tempo real antes do término da reprodução', async () => {
  const { spawn } = await import('node:child_process');
  const { writeFile, unlink } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');

  // Cria WAV de 250ms de silêncio para teste seguro e rápido
  const sampleRate = 8000;
  const dataSize = sampleRate * 2 * 0.25;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  const testWav = join(tmpdir(), `test-marker-${Date.now()}.wav`);
  await writeFile(testWav, buf);

  const script = `
$audioPath = '${testWav.replace(/\\/g, '\\\\')}'
$player = [System.Media.SoundPlayer]::new($audioPath)
try {
  $player.Load()
  [Console]::Out.WriteLine('AUDIO_PLAYBACK_START')
  [Console]::Out.Flush()
  $player.PlaySync()
} finally {
  $player.Dispose()
}
`;

  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  let signalReceivedAt = null;
  let closedAt = null;

  await new Promise((resolveTest, rejectTest) => {
    const child = spawn(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      if (chunk.includes('AUDIO_PLAYBACK_START') && signalReceivedAt === null) {
        signalReceivedAt = performance.now();
      }
    });

    child.once('error', rejectTest);
    child.once('close', () => {
      closedAt = performance.now();
      resolveTest();
    });
  });

  await unlink(testWav).catch(() => {});

  assert.ok(signalReceivedAt !== null, 'Marcador AUDIO_PLAYBACK_START deve ser recebido');
  assert.ok(closedAt !== null, 'PowerShell deve encerrar normalmente');
  assert.ok(
    closedAt >= signalReceivedAt,
    `O sinal deve chegar antes do encerramento (sinal=${signalReceivedAt}, fim=${closedAt})`,
  );
});

