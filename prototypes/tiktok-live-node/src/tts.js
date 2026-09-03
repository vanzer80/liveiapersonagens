import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

export function getTtsConfig() {
  const rateConfig = parseRate(process.env.TTS_RATE);
  const provider = (process.env.TTS_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase();
  const fishApiKey = normalizeFishApiKey(process.env.FISH_AUDIO_API_KEY);
  const fishReferenceId = String(process.env.FISH_AUDIO_REFERENCE_ID || '').trim();
  let error = rateConfig.error;

  if (!error && provider === FISH_PROVIDER) {
    if (!fishApiKey || fishApiKey === 'cole_sua_chave_aqui') {
      error = 'FISH_AUDIO_API_KEY ausente. Preencha a chave no arquivo .env.';
    } else if (!fishReferenceId) {
      error = 'FISH_AUDIO_REFERENCE_ID ausente. Informe a voz autorizada no arquivo .env.';
    }
  }

  return {
    enabled: parseBoolean(process.env.TTS_ENABLED, false),
    provider,
    voice: (process.env.TTS_VOICE || '').trim(),
    rate: rateConfig.rate,
    error,
    fish: {
      apiUrl: String(process.env.FISH_AUDIO_API_URL || DEFAULT_FISH_API_URL).trim(),
      apiKey: fishApiKey,
      referenceId: fishReferenceId,
      model: String(process.env.FISH_AUDIO_MODEL || DEFAULT_FISH_MODEL).trim(),
      latency: String(process.env.FISH_AUDIO_LATENCY || 'balanced').trim(),
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

function runPowerShell(script, extraEnv = {}) {
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

async function generateFishWav(text, audioPath, config) {
  const request = buildFishTtsRequest(text, config);
  const response = await fetch(request.url, request.options);

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = payload?.message || payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Fish Audio recusou a síntese: ${detail}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  if (!audio.length) throw new Error('Fish Audio respondeu sem dados de áudio.');
  await writeFile(audioPath, audio);

  return {
    voice: `Fish ${config.fish.referenceId.slice(0, 8)}`,
    culture: 'pt-BR',
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
    };

    await invokeLifecycleHook(onPlaybackStart, playbackContext, 'onPlaybackStart');
    console.log('[TTS] reproduzindo...');

    const playbackStartedAt = performance.now();
    await runPowerShell(PLAY_WAV_SCRIPT, { LIVEIA_TTS_OUTPUT: audioPath });
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
