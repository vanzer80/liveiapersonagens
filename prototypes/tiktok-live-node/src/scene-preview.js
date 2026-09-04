import { spawn } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>Live IA — Prévia</title>
<style>
html,body{margin:0;width:100%;height:100%;background:#050505;color:#fff;font-family:system-ui,sans-serif;overflow:hidden}
main{width:100%;height:100%;display:grid;place-items:center}
.frame{position:relative;height:min(100vh,100%);aspect-ratio:9/16;background:#111;overflow:hidden}
video{width:100%;height:100%;object-fit:cover;display:block;background:#111}
.badge{position:absolute;left:12px;bottom:12px;background:rgba(0,0,0,.6);padding:6px 10px;border-radius:999px;font-size:12px;letter-spacing:.04em;display:__BADGE_DISPLAY__}
.unlock{position:absolute;inset:0;display:none;place-items:center;background:rgba(0,0,0,.72);font-size:18px;text-align:center;padding:24px;cursor:pointer}
</style>
</head>
<body>
<main><div class="frame">
<video id="video" muted autoplay loop playsinline preload="auto"></video>
<div class="badge" id="badge">aguardando…</div>
<div class="unlock" id="unlock"><span>Clique uma vez para ativar o áudio</span></div>
</div></main>
<script>
const video=document.getElementById('video');
const badge=document.getElementById('badge');
const unlock=document.getElementById('unlock');
let revision=-1;

function report(rev,status){
  fetch('/api/media-ended',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({revision:rev,status})
  }).catch(function(){});
}

// Um clique em qualquer lugar destrava a reprodução com som no navegador.
document.addEventListener('click',function(){
  unlock.style.display='none';
  video.play().catch(function(){});
});

async function apply(state){
  revision=state.revision;
  const isMedia=state.mode==='media';
  const rev=revision;
  video.onended=null;
  video.onerror=null;
  video.pause();
  video.loop=!!state.loop;
  video.muted=!!state.muted;
  video.src=state.assetUrl+'?v='+rev;
  video.currentTime=0;
  if(isMedia){
    // Contrato real de término: o evento ended do próprio player.
    video.onended=function(){report(rev,'ended');};
    video.onerror=function(){report(rev,'error');};
  }
  try{
    await video.play();
    if(isMedia){unlock.style.display='none';}
  }catch(error){
    if(isMedia){
      unlock.style.display='grid';
      report(rev,'blocked');
    }
  }
}

async function tick(){
  try{
    const response=await fetch('/api/state',{cache:'no-store'});
    if(!response.ok) throw new Error('state');
    const state=await response.json();
    badge.textContent=state.variant+' · '+state.state;
    if(state.revision!==revision && state.assetUrl){ await apply(state); }
  }catch(error){}
}
setInterval(tick,150); tick();
</script>
</body>
</html>`;

function parseBoolean(value, fallback = true) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  return ['1', 'true', 'yes', 'sim', 'on'].includes(String(value).trim().toLowerCase());
}

function sendJson(response, statusCode, value) {
  const body = JSON.stringify(value);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  response.end(body);
}

async function readJsonBody(request, limitBytes = 4096) {
  return new Promise((resolveBody) => {
    let raw = '';
    request.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > limitBytes) raw = raw.slice(0, limitBytes);
    });
    request.on('end', () => {
      try {
        resolveBody(JSON.parse(raw || '{}'));
      } catch {
        resolveBody({});
      }
    });
    request.on('error', () => resolveBody({}));
  });
}

async function serveVideo(request, response, filePath) {
  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    response.writeHead(404);
    response.end('Arquivo não encontrado.');
    return;
  }

  const range = request.headers.range;
  if (!range) {
    response.writeHead(200, {
      'content-type': 'video/mp4',
      'content-length': fileStat.size,
      'accept-ranges': 'bytes',
      'cache-control': 'no-store',
    });
    createReadStream(filePath).pipe(response);
    return;
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  const start = match?.[1] ? Number(match[1]) : 0;
  const end = match?.[2] ? Math.min(Number(match[2]), fileStat.size - 1) : fileStat.size - 1;

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= fileStat.size) {
    response.writeHead(416, { 'content-range': `bytes */${fileStat.size}` });
    response.end();
    return;
  }

  response.writeHead(206, {
    'content-type': 'video/mp4',
    'content-length': end - start + 1,
    'content-range': `bytes ${start}-${end}/${fileStat.size}`,
    'accept-ranges': 'bytes',
    'cache-control': 'no-store',
  });
  createReadStream(filePath, { start, end }).pipe(response);
}

// Edge/Chrome bloqueiam vídeo com som sem gesto do usuário. Os clipes do MVP 6 têm
// fala embutida, então a prévia é aberta em modo aplicativo com a política liberada.
// O perfil dedicado garante que a flag valha mesmo se o navegador já estiver aberto.
const CHROMIUM_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

export function findPreviewBrowser(candidates = CHROMIUM_CANDIDATES, exists = existsSync) {
  const override = String(process.env.SCENE_PREVIEW_BROWSER_PATH || '').trim();
  if (override && exists(override)) return override;
  return candidates.find((candidate) => exists(candidate)) || null;
}

export function buildPreviewBrowserArgs(url, profileDirectory) {
  return [
    `--app=${url}`,
    '--autoplay-policy=no-user-gesture-required',
    `--user-data-dir=${profileDirectory}`,
    '--no-first-run',
    '--no-default-browser-check',
  ];
}

export function openPreviewBrowser(url, { logger = console } = {}) {
  if (!parseBoolean(process.env.SCENE_PREVIEW_OPEN_BROWSER, true)) return;

  let command;
  let args;
  if (process.platform === 'win32') {
    const browserPath = parseBoolean(process.env.SCENE_PREVIEW_APP_MODE, true)
      ? findPreviewBrowser()
      : null;

    if (browserPath) {
      command = browserPath;
      args = buildPreviewBrowserArgs(url, join(tmpdir(), 'liveia-preview-profile'));
      logger.log?.('[CENA] prévia em modo aplicativo com áudio liberado.');
    } else {
      command = 'cmd.exe';
      args = ['/c', 'start', '', url];
      logger.warn?.(
        '[CENA] navegador Chromium não encontrado; abrindo o padrão do sistema. ' +
          'O áudio dos clipes pode exigir um clique na janela da prévia.',
      );
    }
  } else if (process.platform === 'darwin') {
    command = 'open';
    args = [url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  try {
    const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
  } catch (error) {
    logger.warn?.(`[CENA] não foi possível abrir o navegador automaticamente: ${error instanceof Error ? error.message : error}`);
  }
}

export function createScenePreview({
  assetsDirectory = resolve('assets', 'mvp4'),
  mediaDirectory = resolve('assets', 'mvp6'),
  host = '127.0.0.1',
  port = Number(process.env.SCENE_PREVIEW_PORT || 3333),
  // Rede de segurança apenas: o contrato real de término é o evento `ended` do player.
  mediaTimeoutMs = Number(process.env.VIDEO_PLAYBACK_TIMEOUT_MS || 60000),
  logger = console,
} = {}) {
  const showBadge = parseBoolean(process.env.SCENE_PREVIEW_SHOW_BADGE, false);
  const html = HTML.replace('__BADGE_DISPLAY__', showBadge ? 'block' : 'none');
  let current = {
    variant: 'spongebob',
    state: 'idle',
    mode: 'scene',
    asset: null,
    assetUrl: null,
    loop: true,
    muted: true,
    revision: 0,
  };
  let pendingMedia = null;

  function settleMedia(revision, status) {
    if (!pendingMedia || pendingMedia.revision !== revision) return false;
    const settle = pendingMedia.settle;
    pendingMedia = null;
    settle(status);
    return true;
  }

  const server = createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);

    if (url.pathname === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      response.end(html);
      return;
    }

    if (url.pathname === '/api/state') {
      sendJson(response, 200, current);
      return;
    }

    if (url.pathname === '/api/media-ended' && request.method === 'POST') {
      const body = await readJsonBody(request);
      const revision = Number(body?.revision);
      const status = String(body?.status || 'ended');
      const handled = settleMedia(revision, status);
      sendJson(response, 200, { handled });
      return;
    }

    if (url.pathname.startsWith('/assets/')) {
      const requestedName = basename(decodeURIComponent(url.pathname.slice('/assets/'.length)));
      await serveVideo(request, response, resolve(assetsDirectory, requestedName));
      return;
    }

    if (url.pathname.startsWith('/media/')) {
      const requestedName = basename(decodeURIComponent(url.pathname.slice('/media/'.length)));
      await serveVideo(request, response, resolve(mediaDirectory, requestedName));
      return;
    }

    response.writeHead(404);
    response.end('Não encontrado.');
  });

  // MVP 4: camada visual, sempre mutada e em loop.
  function setScene(selection) {
    const assetName = selection?.asset ? basename(selection.asset) : null;
    current = {
      variant: selection?.variant || current.variant,
      state: selection?.currentState || selection?.state || current.state,
      mode: 'scene',
      asset: assetName,
      assetUrl: assetName ? `/assets/${encodeURIComponent(assetName)}` : null,
      loop: true,
      muted: true,
      revision: current.revision + 1,
    };
    // Uma nova cena cancela qualquer espera de mídia pendente.
    if (pendingMedia) settleMedia(pendingMedia.revision, 'interrupted');
    return current;
  }

  /**
   * MVP 6: clipe com fala embutida — áudio ligado, sem loop, execução única.
   * Resolve quando o player informa o fim REAL (`ended`), erro ou bloqueio de autoplay.
   * O timeout existe apenas como rede de segurança.
   */
  function playMedia({ file, timeoutMs = mediaTimeoutMs } = {}) {
    const assetName = basename(String(file || ''));
    if (!assetName) return Promise.resolve({ ok: false, status: 'invalid-file' });

    if (pendingMedia) settleMedia(pendingMedia.revision, 'superseded');

    current = {
      variant: current.variant,
      state: 'media',
      mode: 'media',
      asset: assetName,
      assetUrl: `/media/${encodeURIComponent(assetName)}`,
      loop: false,
      muted: false,
      revision: current.revision + 1,
    };

    const revision = current.revision;

    return new Promise((resolvePlayback) => {
      const timer = setTimeout(() => {
        if (pendingMedia?.revision === revision) {
          pendingMedia = null;
          logger.warn?.(`[VÍDEO] tempo limite aguardando o fim de ${assetName}; voltando ao idle.`);
          resolvePlayback({ ok: false, status: 'timeout', asset: assetName });
        }
      }, timeoutMs);
      if (typeof timer.unref === 'function') timer.unref();

      pendingMedia = {
        revision,
        settle: (status) => {
          clearTimeout(timer);
          if (status === 'blocked') {
            logger.warn?.(
              `[VÍDEO] o navegador bloqueou o áudio de ${assetName}. ` +
                'Clique uma vez na janela da prévia para liberar o som.',
            );
          }
          resolvePlayback({ ok: status === 'ended', status, asset: assetName });
        },
      };
    });
  }

  async function start() {
    await new Promise((resolveStart, rejectStart) => {
      server.once('error', rejectStart);
      server.listen(port, host, () => {
        server.off('error', rejectStart);
        resolveStart();
      });
    });
    const address = server.address();
    const actualPort = typeof address === 'object' && address ? address.port : port;
    const url = `http://${host}:${actualPort}`;
    logger.log?.(`[CENA] prévia local: ${url}`);
    return { url, port: actualPort };
  }

  async function stop() {
    if (pendingMedia) settleMedia(pendingMedia.revision, 'stopped');
    if (!server.listening) return;
    await new Promise((resolveStop) => {
      server.close(resolveStop);
      // A prévia aberta no navegador mantém conexões vivas (polling e stream do vídeo).
      // Sem encerrá-las, server.close() nunca retorna e o Ctrl+C ficaria travado.
      server.closeAllConnections?.();
    });
  }

  return { setScene, playMedia, getState: () => current, start, stop };
}
