import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { basename, resolve } from 'node:path';

const HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>Live IA — Prévia MVP 4</title>
<style>
html,body{margin:0;width:100%;height:100%;background:#050505;color:#fff;font-family:system-ui,sans-serif;overflow:hidden}
main{width:100%;height:100%;display:grid;place-items:center}
.frame{position:relative;height:min(100vh,100%);aspect-ratio:9/16;background:#111;overflow:hidden}
video{width:100%;height:100%;object-fit:cover;display:block;background:#111}
.badge{position:absolute;left:12px;bottom:12px;background:rgba(0,0,0,.6);padding:6px 10px;border-radius:999px;font-size:12px;letter-spacing:.04em}
</style>
</head>
<body>
<main><div class="frame"><video id="video" muted autoplay loop playsinline preload="auto"></video><div class="badge" id="badge">aguardando…</div></div></main>
<script>
const video=document.getElementById('video');
const badge=document.getElementById('badge');
let revision=-1;
async function tick(){
  try{
    const response=await fetch('/api/state',{cache:'no-store'});
    if(!response.ok) throw new Error('state');
    const state=await response.json();
    badge.textContent=state.variant+' · '+state.state;
    if(state.revision!==revision && state.assetUrl){
      revision=state.revision;
      video.pause();
      video.src=state.assetUrl+'?v='+revision;
      video.currentTime=0;
      await video.play().catch(()=>{});
    }
  }catch{}
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

export function openPreviewBrowser(url, { logger = console } = {}) {
  if (!parseBoolean(process.env.SCENE_PREVIEW_OPEN_BROWSER, true)) return;

  let command;
  let args;
  if (process.platform === 'win32') {
    command = 'cmd.exe';
    args = ['/c', 'start', '', url];
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
  host = '127.0.0.1',
  port = Number(process.env.SCENE_PREVIEW_PORT || 3333),
  logger = console,
} = {}) {
  let current = {
    variant: 'spongebob',
    state: 'idle',
    asset: null,
    assetUrl: null,
    revision: 0,
  };

  const server = createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);

    if (url.pathname === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      response.end(HTML);
      return;
    }

    if (url.pathname === '/api/state') {
      sendJson(response, 200, current);
      return;
    }

    if (url.pathname.startsWith('/assets/')) {
      const requestedName = basename(decodeURIComponent(url.pathname.slice('/assets/'.length)));
      await serveVideo(request, response, resolve(assetsDirectory, requestedName));
      return;
    }

    response.writeHead(404);
    response.end('Não encontrado.');
  });

  function setScene(selection) {
    const assetName = selection?.asset ? basename(selection.asset) : null;
    current = {
      variant: selection?.variant || current.variant,
      state: selection?.currentState || selection?.state || current.state,
      asset: assetName,
      assetUrl: assetName ? `/assets/${encodeURIComponent(assetName)}` : null,
      revision: current.revision + 1,
    };
    return current;
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
    if (!server.listening) return;
    await new Promise((resolveStop) => server.close(resolveStop));
  }

  return { setScene, start, stop };
}
