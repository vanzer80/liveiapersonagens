import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  createSceneController,
  SCENE_STATES,
  SCENE_VARIANTS,
} from './scene.js';
import { createScenePreview, openPreviewBrowser } from './scene-preview.js';

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  return ['1', 'true', 'yes', 'sim', 'on'].includes(String(value).trim().toLowerCase());
}

export function getLiveSceneConfig(env = process.env) {
  return {
    enabled: parseBoolean(env.SCENE_ENABLED, false),
    variant: String(env.SCENE_VARIANT || SCENE_VARIANTS.SPONGEBOB).trim().toLowerCase(),
    assetsDirectory: resolve(env.SCENE_ASSETS_DIRECTORY || 'assets/mvp4'),
    mediaDirectory: resolve(env.VIDEO_ASSETS_DIRECTORY || 'assets/mvp6'),
  };
}

export function createLiveSceneRuntime({
  config = getLiveSceneConfig(),
  controller = createSceneController({
    assetsDirectory: config.assetsDirectory,
    variant: config.variant,
  }),
  preview = createScenePreview({
    assetsDirectory: config.assetsDirectory,
    mediaDirectory: config.mediaDirectory,
  }),
  browserOpener = openPreviewBrowser,
  mediaExists = (candidate) => existsSync(candidate),
  logger = console,
} = {}) {
  let started = false;
  let previewUrl = null;

  async function requireAssets() {
    if (!Object.values(SCENE_VARIANTS).includes(config.variant)) {
      throw new Error(`SCENE_VARIANT inválida: ${config.variant}.`);
    }

    const missing = [];
    for (const state of [SCENE_STATES.IDLE, SCENE_STATES.THINKING, SCENE_STATES.SPEAKING]) {
      const selection = await controller.resolveAsset(state);
      if (!selection.asset || selection.fallbackUsed || selection.state !== state) {
        missing.push(selection.missingAsset || state);
      }
    }

    if (missing.length) {
      throw new Error(
        `Ativos visuais ausentes para ${config.variant}: ${missing.join(', ')}. Pasta esperada: ${config.assetsDirectory}`,
      );
    }
  }

  async function show(state, metadata = {}) {
    if (!config.enabled) return { skipped: true, state };
    const selection = await controller.transitionTo(state, metadata);
    preview.setScene(selection);
    return selection;
  }

  async function reset(metadata = {}) {
    return show(SCENE_STATES.IDLE, metadata);
  }

  async function ensureIdle(metadata = {}) {
    if (!config.enabled || controller.getState() === SCENE_STATES.IDLE) return;
    await reset(metadata);
  }

  async function start() {
    if (!config.enabled) {
      logger.log?.('[CENA LIVE] desativada; captura, IA e TTS continuam disponíveis.');
      return { enabled: false, url: null };
    }

    await requireAssets();

    try {
      const startedPreview = await preview.start();
      previewUrl = startedPreview.url;
      await reset({ reason: 'live-start' });
      browserOpener(previewUrl, { logger });
      started = true;
      logger.log?.(`[CENA LIVE] pronta para captura: ${previewUrl}`);
      return { enabled: true, url: previewUrl };
    } catch (error) {
      await preview.stop().catch(() => {});
      throw error;
    }
  }

  async function showThinking(metadata = {}) {
    return show(SCENE_STATES.THINKING, { ...metadata, reason: 'ai-processing' });
  }

  async function speak(text, { speaker, metadata = {} } = {}) {
    if (typeof speaker !== 'function') {
      throw new Error('A função de TTS não foi informada para a cena ao vivo.');
    }

    if (!config.enabled) return speaker(text);

    let playbackStarted = false;
    let playbackEnded = false;
    const result = await speaker(text, {
      onPlaybackStart: async (context) => {
        playbackStarted = true;
        await show(SCENE_STATES.SPEAKING, {
          ...metadata,
          ...context,
          reason: 'tts-playback-start',
        });
      },
      onPlaybackEnd: async (context) => {
        playbackEnded = true;
        await reset({
          ...metadata,
          ...context,
          reason: 'tts-playback-end',
        });
      },
    });

    if (!result?.ok || result?.skipped || !playbackStarted || !playbackEnded) {
      await ensureIdle({
        ...metadata,
        reason: result?.ok ? 'tts-without-playback' : 'tts-failed',
      });
    }

    return result;
  }

  /**
   * MVP 6 — reproduz um clipe pré-gravado com a fala já embutida.
   * Nenhum TTS é gerado aqui: o áudio é o do próprio MP4.
   * O retorno ao `idle` usa o fim REAL informado pelo player, nunca um atraso fixo.
   */
  async function playClip(file, metadata = {}) {
    if (!config.enabled) return { ok: false, skipped: true, status: 'scene-disabled' };

    if (typeof preview.playMedia !== 'function') {
      logger.error?.('[VÍDEO] a prévia atual não suporta reprodução de clipes.');
      return { ok: false, status: 'unsupported' };
    }

    const fullPath = resolve(config.mediaDirectory, String(file || ''));
    if (!mediaExists(fullPath)) {
      logger.error?.(`[VÍDEO] arquivo ausente: ${fullPath}. A LIVE continua sem esse clipe.`);
      await reset({ ...metadata, reason: 'video-missing' }).catch(() => {});
      return { ok: false, status: 'missing', asset: String(file || '') };
    }

    let result = { ok: false, status: 'unknown' };
    try {
      result = await preview.playMedia({ file });
      if (!result.ok) {
        logger.error?.(`[VÍDEO] reprodução não concluída | arquivo=${file} status=${result.status}`);
      }
    } catch (error) {
      logger.error?.(
        `[VÍDEO] erro ao reproduzir ${file}: ${error instanceof Error ? error.message : error}`,
      );
      result = { ok: false, status: 'exception' };
    } finally {
      // reset() e não ensureIdle(): a mídia trocou a prévia por fora do controlador,
      // então é preciso reimprimir o idle mesmo com o estado interno já em idle.
      try {
        await reset({ ...metadata, reason: 'video-finished' });
      } catch (error) {
        logger.error?.(
          `[VÍDEO] falha ao voltar para idle: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    return result;
  }

  async function stop() {
    if (!config.enabled || !started) return;
    await preview.stop();
    started = false;
  }

  return {
    ensureIdle,
    getState: () => controller.getState(),
    getUrl: () => previewUrl,
    playClip,
    reset,
    showThinking,
    speak,
    start,
    stop,
  };
}
