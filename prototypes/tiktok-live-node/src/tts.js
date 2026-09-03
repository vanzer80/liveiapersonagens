import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

try {
  process.loadEnvFile?.('.env');
} catch {
  // .env é opcional; variáveis também podem ser definidas diretamente no terminal.
}

const DEFAULT_PROVIDER = 'windows-sapi';

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

export function getTtsConfig() {
  const rateConfig = parseRate(process.env.TTS_RATE);

  return {
    enabled: parseBoolean(process.env.TTS_ENABLED, false),
    provider: (process.env.TTS_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase(),
    voice: (process.env.TTS_VOICE || '').trim(),
    rate: rateConfig.rate,
    error: rateConfig.error,
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

function runPowerShell(script, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', '-'],
      {
        env: { ...process.env, ...extraEnv },
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
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

    child.stdin.end(script);
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

export async function speakText(value, { force = false } = {}) {
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

  if (config.provider !== DEFAULT_PROVIDER) {
    const error = `Provedor TTS não suportado: ${config.provider}.`;
    console.error(`[ERRO TTS] latencia_ms=0 | ${error}`);
    return { ok: false, error };
  }

  const text = normalizeTextForSpeech(value);
  if (!text) {
    const error = 'O texto ficou vazio após a normalização para voz.';
    console.error(`[ERRO TTS] latencia_ms=0 | ${error}`);
    return { ok: false, error };
  }

  const requestedVoice = config.voice || 'automática-pt-BR';
  console.log(`[TTS] gerando | provedor=${config.provider} voz=${requestedVoice}`);

  try {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'liveia-tts-'));
    const audioPath = join(temporaryDirectory, 'speech.wav');
    const metadataPath = join(temporaryDirectory, 'metadata.json');
    const generationStartedAt = performance.now();
    await runPowerShell(GENERATE_WAV_SCRIPT, {
      LIVEIA_TTS_TEXT: text,
      LIVEIA_TTS_OUTPUT: audioPath,
      LIVEIA_TTS_METADATA: metadataPath,
      LIVEIA_TTS_VOICE: config.voice,
      LIVEIA_TTS_RATE: String(config.rate),
    });
    const generationLatencyMs = Math.round(performance.now() - generationStartedAt);
    const voiceInfo = await readTtsMetadata(metadataPath);

    console.log(
      `[TTS] áudio gerado | provedor=${config.provider} voz=${voiceInfo.voice} idioma=${voiceInfo.culture} latencia_ms=${generationLatencyMs}`,
    );
    console.log('[TTS] reproduzindo...');

    const playbackStartedAt = performance.now();
    await runPowerShell(PLAY_WAV_SCRIPT, { LIVEIA_TTS_OUTPUT: audioPath });
    const playbackDurationMs = Math.round(performance.now() - playbackStartedAt);

    console.log(`[TTS] concluído | duracao_ms=${playbackDurationMs}`);

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
