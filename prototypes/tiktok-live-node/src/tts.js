import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildVisemeTimeline, consolidateFishAlignment } from './lip-sync.js';

try {
  process.loadEnvFile?.('.env');
} catch {
  // .env é opcional; variáveis também podem ser definidas diretamente no terminal.
}

const DEFAULT_PROVIDER = 'windows-sapi';
const FISH_PROVIDER = 'fish-audio';
const DEFAULT_FISH_API_URL = 'https://api.fish.audio/v1/tts';
const DEFAULT_FISH_MODEL = 's2.1-pro-free';

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  return ['1', 'true', 'yes', 'sim', 'on'].includes(String(value).trim().toLowerCase());
}

function parseRate(value) {
  const rawRate = String(value ?? '0').trim() || '0';
  const rate = Number(rawRate);

  if (!Number.isInteger(rate) || rate < -10 || rate > 10) {
    return {
      rate: 0,
      error: 'TTS_RATE deve ser um número inteiro entre -10 e 10.',
    };
  }

  return { rate, error: null };
}

function normalizeFishApiKey(value) {
  return String(value || '')
    .trim()
    .replace(/^FISH_AUDIO_API_KEY\s*=\s*/iu, '')
    .replace(/^Bearer\s+/iu, '')
    .trim();
}

export function getTtsConfig(env = process.env) {
  const rateConfig = parseRate(env.TTS_RATE);
  const provider = (env.TTS_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase();
  const fishApiKey = normalizeFishApiKey(env.FISH_AUDIO_API_KEY);
  const fishReferenceId = String(env.FISH_AUDIO_REFERENCE_ID || '').trim();
  let error = rateConfig.error;

  if (!error && provider === FISH_PROVIDER) {
    if (!fishApiKey || fishApiKey === 'cole_sua_chave_aqui') {
      error = 'FISH_AUDIO_API_KEY ausente. Preencha a chave no arquivo .env.';
    } else if (!fishReferenceId) {
      error = 'FISH_AUDIO_REFERENCE_ID ausente. Informe a voz autorizada no arquivo .env.';
    }
  }

  return {
    enabled: parseBoolean(env.TTS_ENABLED, false),
    provider,
    voice: (env.TTS_VOICE || '').trim(),
    rate: rateConfig.rate,
    error,
    fish: {
      apiUrl: String(env.FISH_AUDIO_API_URL || DEFAULT_FISH_API_URL).trim(),
      apiKey: fishApiKey,
      referenceId: fishReferenceId,
      model: String(env.FISH_AUDIO_MODEL || DEFAULT_FISH_MODEL).trim(),
      latency: String(env.FISH_AUDIO_LATENCY || 'balanced').trim(),
    },
    lipSync: {
      enabled: parseBoolean(env.LIP_SYNC_ENABLED, false),
      assetsDirectory: String(env.LIP_SYNC_ASSETS_DIRECTORY || 'assets/mvp7/lipsync').trim(),
      minHoldMs: Math.max(30, Number(env.LIP_SYNC_MIN_HOLD_MS) || 65),
      audioOffsetMs: Number(env.LIP_SYNC_AUDIO_OFFSET_MS) || 0,
    },
  };
}

export function normalizeTextForSpeech(value) {
  return String(value || '')
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/giu, '$1')
    .replace(/https?:\/\/\S+/giu, ' link ')
    .replace(/```[\s\S]*?```/gu, ' ')
    .replace(/`([^`]+)`/gu, '$1')
    .replace(/[*_~#>|]+/gu, ' ')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function encodePowerShellCommand(script) {
  return Buffer.from(String(script), 'utf16le').toString('base64');
}

function runPowerShell(script, extraEnv = {}, onSignal = null) {
  return new Promise((resolve, reject) => {
    const encodedCommand = encodePowerShellCommand(script);
    const child = spawn(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', encodedCommand],
      {
        env: { ...process.env, ...extraEnv },
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (typeof onSignal === 'function' && chunk.includes('AUDIO_PLAYBACK_START')) {
        onSignal();
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.once('error', (error) => {
      if (error?.code === 'ENOENT') {
        reject(new Error('PowerShell do Windows não foi encontrado. Este provedor exige Windows.'));
        return;
      }
      reject(error);
    });

    child.once('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `PowerShell encerrou com código ${code}.`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

const GENERATE_WAV_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Speech

$text = [Environment]::GetEnvironmentVariable('LIVEIA_TTS_TEXT')
$outputPath = [Environment]::GetEnvironmentVariable('LIVEIA_TTS_OUTPUT')
$metadataPath = [Environment]::GetEnvironmentVariable('LIVEIA_TTS_METADATA')
$requestedVoice = [Environment]::GetEnvironmentVariable('LIVEIA_TTS_VOICE')
$rate = [int][Environment]::GetEnvironmentVariable('LIVEIA_TTS_RATE')

$synth = [System.Speech.Synthesis.SpeechSynthesizer]::new()
try {
  $installed = @($synth.GetInstalledVoices() | Where-Object { $_.Enabled })
  if ($installed.Count -eq 0) {
    throw 'Nenhuma voz TTS habilitada foi encontrada no Windows.'
  }

  if (-not [string]::IsNullOrWhiteSpace($requestedVoice)) {
    $match = $installed | Where-Object { $_.VoiceInfo.Name -eq $requestedVoice } | Select-Object -First 1
    if ($null -eq $match) {
      $available = ($installed | ForEach-Object { $_.VoiceInfo.Name }) -join ', '
      throw "Voz '$requestedVoice' não encontrada. Vozes disponíveis: $available"
    }
    $synth.SelectVoice($match.VoiceInfo.Name)
  }
  else {
    $ptBr = $installed | Where-Object { $_.VoiceInfo.Culture.Name -eq 'pt-BR' } | Select-Object -First 1
    if ($null -ne $ptBr) {
      $synth.SelectVoice($ptBr.VoiceInfo.Name)
    }
  }

  $synth.Rate = $rate
  $voiceName = $synth.Voice.Name
  $voiceCulture = $synth.Voice.Culture.Name
  $synth.SetOutputToWaveFile($outputPath)
  $synth.Speak($text)
  $synth.SetOutputToNull()

  $metadata = [ordered]@{
    voice = $voiceName
    culture = $voiceCulture
  } | ConvertTo-Json -Compress

  [System.IO.File]::WriteAllText(
    $metadataPath,
    $metadata,
    [System.Text.UTF8Encoding]::new($false)
  )
}
finally {
  $synth.Dispose()
}
`;

const PLAY_WAV_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$audioPath = [Environment]::GetEnvironmentVariable('LIVEIA_TTS_OUTPUT')
$player = [System.Media.SoundPlayer]::new($audioPath)
try {
  $player.Load()
  [Console]::Out.WriteLine('AUDIO_PLAYBACK_START')
  [Console]::Out.Flush()
  $player.PlaySync()
}
finally {
  $player.Dispose()
}
`;

export function parseTtsMetadata(output) {
  const content = String(output || '').replace(/^\uFEFF/u, '').trim();
  if (!content) throw new Error('O TTS não informou a voz utilizada.');

  try {
    const metadata = JSON.parse(content);
    if (!metadata?.voice) throw new Error('metadata-without-voice');
    return metadata;
  } catch {
    throw new Error(`Metadados inesperados do TTS: ${content}`);
  }
}

export function buildFishTtsRequest(text, config = getTtsConfig()) {
  return {
    url: config.fish.apiUrl,
    options: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.fish.apiKey}`,
        'Content-Type': 'application/json',
        model: config.fish.model,
      },
      body: JSON.stringify({
        text,
        reference_id: config.fish.referenceId,
        format: 'wav',
        latency: config.fish.latency,
        normalize: true,
      }),
      signal: AbortSignal.timeout(30000),
    },
  };
}

export function buildFishTimestampedRequest(text, config = getTtsConfig()) {
  const base = String(config.fish.apiUrl || DEFAULT_FISH_API_URL).replace(/\/tts\/?$/i, '');
  const url = `${base}/tts/stream/with-timestamp`;

  return {
    url,
    options: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.fish.apiKey}`,
        'Content-Type': 'application/json',
        model: config.fish.model,
      },
      body: JSON.stringify({
        text,
        reference_id: config.fish.referenceId,
        format: 'wav',
        latency: config.fish.latency,
        normalize: true,
      }),
      signal: AbortSignal.timeout(35000),
    },
  };
}

export function sanitizeWavHeader(audio) {
  if (!Buffer.isBuffer(audio) || audio.length < 44) return audio;
  if (audio.toString('ascii', 0, 4) === 'RIFF' && audio.toString('ascii', 8, 12) === 'WAVE') {
    const copy = Buffer.from(audio);
    let pos = 12;
    while (pos < copy.length - 8) {
      const id = copy.toString('ascii', pos, pos + 4);
      const len = copy.readUInt32LE(pos + 4);
      if (id === 'data') {
        const realDataSize = copy.length - (pos + 8);
        if (len !== realDataSize) {
          copy.writeUInt32LE(realDataSize, pos + 4);
          copy.writeUInt32LE(copy.length - 8, 4);
        }
        break;
      }
      pos += 8 + len;
      if (len % 2 !== 0) pos++;
    }
    return copy;
  }
  return audio;
}

export function getWavDurationMs(audio) {
  if (!Buffer.isBuffer(audio) || audio.length < 44) return 0;
  try {
    const byteRate = audio.readUInt32LE(28);
    let pos = 12;
    while (pos < audio.length - 8) {
      const id = audio.toString('ascii', pos, pos + 4);
      const len = audio.readUInt32LE(pos + 4);
      if (id === 'data') {
        if (byteRate > 0) {
          return Math.round((len / byteRate) * 1000);
        }
        break;
      }
      pos += 8 + len;
      if (len % 2 !== 0) pos++;
    }
  } catch {}
  return 0;
}

export async function fetchFishTtsStreamWithTimestamps(text, config = getTtsConfig()) {
  const request = buildFishTimestampedRequest(text, config);
  const response = await fetch(request.url, request.options);

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = payload?.message || payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Fish Audio recusou stream com timestamps: ${detail}`);
  }

  const audioChunks = [];
  const alignmentByChunk = new Map();
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const eventText of events) {
      const dataLine = eventText.split('\n').find((line) => line.startsWith('data: '));
      if (!dataLine) continue;

      try {
        const event = JSON.parse(dataLine.slice(6));
        if (event.audio_base64) {
          audioChunks.push(Buffer.from(event.audio_base64, 'base64'));
        }
        if (event.alignment !== undefined && event.alignment !== null && typeof event.chunk_seq === 'number') {
          alignmentByChunk.set(event.chunk_seq, {
            content: event.content,
            offset: Number(event.chunk_audio_offset_sec || 0),
            alignment: event.alignment,
          });
        }
      } catch {}
    }
  }

  const audio = sanitizeWavHeader(Buffer.concat(audioChunks));
  if (!audio.length) {
    throw new Error('Fish Audio respondeu sem dados de áudio no stream.');
  }

  const segments = consolidateFishAlignment(alignmentByChunk);
  return { audio, segments, alignmentByChunk };
}

async function generateFishWav(text, audioPath, config) {
  let audio;
  let segments = [];

  if (config.lipSync?.enabled) {
    try {
      const streamResult = await fetchFishTtsStreamWithTimestamps(text, config);
      audio = streamResult.audio;
      segments = streamResult.segments;
      console.log(`[LIP] alignment recebido | segmentos=${segments.length}`);
    } catch (streamError) {
      console.warn(`[LIP] aviso: falha no stream com timestamps (${streamError.message}). Usando /v1/tts padrão.`);
    }
  }

  // Se o stream com timestamps não foi usado ou falhou, usar o endpoint tradicional
  if (!audio) {
    const request = buildFishTtsRequest(text, config);
    const response = await fetch(request.url, request.options);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const detail = payload?.message || payload?.error?.message || `HTTP ${response.status}`;
      throw new Error(`Fish Audio recusou a síntese: ${detail}`);
    }

    audio = sanitizeWavHeader(Buffer.from(await response.arrayBuffer()));
    if (!audio.length) throw new Error('Fish Audio respondeu sem dados de áudio.');
  }

  await writeFile(audioPath, audio);

  const durationMs = getWavDurationMs(audio);
  let timeline = null;

  if (config.lipSync?.enabled) {
    timeline = buildVisemeTimeline({
      segments,
      text,
      audioDurationMs: durationMs,
      minHoldMs: config.lipSync.minHoldMs,
    });
    console.log(`[LIP] timeline gerada | visemes=${timeline.length} duracao_ms=${durationMs}`);
  }

  return {
    voice: `Fish ${config.fish.referenceId.slice(0, 8)}`,
    culture: 'pt-BR',
    timeline,
    durationMs,
  };
}

async function readTtsMetadata(metadataPath) {
  try {
    return parseTtsMetadata(await readFile(metadataPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error('O PowerShell concluiu sem gravar os metadados da voz.');
    }
    throw error;
  }
}

async function invokeLifecycleHook(hook, payload, hookName) {
  if (typeof hook !== 'function') return;
  try {
    await hook(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ERRO TTS] callback=${hookName} | ${message}`);
  }
}

export async function speakText(
  value,
  { force = false, onPlaybackStart = null, onPlaybackEnd = null } = {},
) {
  const operationStartedAt = performance.now();
  let temporaryDirectory = null;
  const config = getTtsConfig();

  if (!config.enabled && !force) {
    return { ok: true, skipped: true, reason: 'disabled' };
  }

  if (config.error) {
    console.error(`[ERRO TTS] latencia_ms=0 | ${config.error}`);
    return { ok: false, error: config.error };
  }

  if (![DEFAULT_PROVIDER, FISH_PROVIDER].includes(config.provider)) {
    const error = `Provedor TTS não suportado: ${config.provider}. Use windows-sapi ou fish-audio.`;
    console.error(`[ERRO TTS] latencia_ms=0 | ${error}`);
    return { ok: false, error };
  }

  const text = normalizeTextForSpeech(value);
  if (!text) {
    const error = 'O texto ficou vazio após a normalização para voz.';
    console.error(`[ERRO TTS] latencia_ms=0 | ${error}`);
    return { ok: false, error };
  }

  const requestedVoice = config.provider === FISH_PROVIDER
    ? `referência ${config.fish.referenceId.slice(0, 8)}`
    : config.voice || 'automática-pt-BR';
  console.log(`[TTS] gerando | provedor=${config.provider} voz=${requestedVoice}`);

  try {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'liveia-tts-'));
    const audioPath = join(temporaryDirectory, 'speech.wav');
    const metadataPath = join(temporaryDirectory, 'metadata.json');
    const generationStartedAt = performance.now();
    let voiceInfo;

    if (config.provider === FISH_PROVIDER) {
      voiceInfo = await generateFishWav(text, audioPath, config);
    } else {
      await runPowerShell(GENERATE_WAV_SCRIPT, {
        LIVEIA_TTS_TEXT: text,
        LIVEIA_TTS_OUTPUT: audioPath,
        LIVEIA_TTS_METADATA: metadataPath,
        LIVEIA_TTS_VOICE: config.voice,
        LIVEIA_TTS_RATE: String(config.rate),
      });
      voiceInfo = await readTtsMetadata(metadataPath);
      // Fallback timeline para windows-sapi se lip-sync estiver ativado
      if (config.lipSync?.enabled) {
        const audioBuf = await readFile(audioPath).catch(() => null);
        const durationMs = audioBuf ? getWavDurationMs(audioBuf) : 0;
        voiceInfo.timeline = buildVisemeTimeline({
          text,
          audioDurationMs: durationMs,
          minHoldMs: config.lipSync.minHoldMs,
        });
      }
    }
    const generationLatencyMs = Math.round(performance.now() - generationStartedAt);

    console.log(
      `[TTS] áudio gerado | provedor=${config.provider} voz=${voiceInfo.voice} idioma=${voiceInfo.culture} latencia_ms=${generationLatencyMs}`,
    );

    const playbackContext = {
      provider: config.provider,
      voice: voiceInfo.voice,
      culture: voiceInfo.culture,
      generationLatencyMs,
      timeline: voiceInfo.timeline || null,
      lipSyncEnabled: Boolean(config.lipSync?.enabled && voiceInfo.timeline),
    };

    let playbackStartedInvoked = false;
    const triggerPlaybackStart = async () => {
      if (playbackStartedInvoked) return;
      playbackStartedInvoked = true;
      const offsetMs = Number(config.lipSync?.audioOffsetMs || 0);
      await invokeLifecycleHook(
        onPlaybackStart,
        { ...playbackContext, startedAt: Date.now() + offsetMs },
        'onPlaybackStart',
      );
    };

    console.log('[TTS] reproduzindo...');
    const playbackStartedAt = performance.now();

    await runPowerShell(PLAY_WAV_SCRIPT, { LIVEIA_TTS_OUTPUT: audioPath }, () => {
      void triggerPlaybackStart();
    });

    // Rede de segurança caso o sinal não tenha vindo pelo stdout
    if (!playbackStartedInvoked) {
      await triggerPlaybackStart();
    }

    const playbackDurationMs = Math.round(performance.now() - playbackStartedAt);

    console.log(`[TTS] concluído | duracao_ms=${playbackDurationMs}`);
    await invokeLifecycleHook(
      onPlaybackEnd,
      { ...playbackContext, playbackDurationMs },
      'onPlaybackEnd',
    );

    return {
      ok: true,
      skipped: false,
      provider: config.provider,
      voice: voiceInfo.voice,
      culture: voiceInfo.culture,
      generationLatencyMs,
      playbackDurationMs,
      timeline: voiceInfo.timeline || null,
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - operationStartedAt);
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ERRO TTS] latencia_ms=${latencyMs} | ${message}`);
    return { ok: false, error: message, latencyMs };
  } finally {
    if (temporaryDirectory) {
      try {
        await rm(temporaryDirectory, { recursive: true, force: true });
      } catch (error) {
        console.error(
          `[ERRO TTS] latencia_ms=0 | falha ao remover áudio temporário: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }
}

