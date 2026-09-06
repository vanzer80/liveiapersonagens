import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveInteractionEngine, createPriorityTaskQueue, getInteractionConfig, loadInteractionLines, createLineCycleSelector } from '../src/interaction.js';
import { createAmbientRotationController, loadAmbientRotation } from '../src/ambient-rotation.js';
import { createLiveSceneRuntime } from '../src/live-scene.js';
import { createSceneController } from '../src/scene.js';
import { createScenePreview } from '../src/scene-preview.js';

const quiet = { log() {}, warn() {}, error() {} };
const flush = async () => { for (let i = 0; i < 80; i++) await Promise.resolve(); };
function clock() {
  let time = 0, id = 0;
  const timers = new Map();
  return { now: () => time, timers,
    setTimer: (fn, ms) => { timers.set(id, { fn, at: time + ms }); return id++; },
    clearTimer: (key) => timers.delete(key),
    async advance(ms) {
      const end = time + ms;
      for (;;) {
        const next = [...timers].filter(([,v]) => v.at <= end).sort((a,b) => a[1].at - b[1].at)[0];
        if (!next) break;
        time = next[1].at; timers.delete(next[0]); next[1].fn(); await flush();
      }
      time = end; await flush();
    },
  };
}
const env = { INTERACTION_ENABLED: 'true', INTERACTION_OPENING_ENABLED: 'false', INTERACTION_WELCOME_ENABLED: 'false', INTERACTION_AMBIENT_SILENCE_MS: '5000' };
function engineFor(c, overrides = {}, config = {}) {
  return createLiveInteractionEngine({ config: { ...getInteractionConfig(env), ...config },
    speak: async () => ({ ok: true }), answerQuestion: async () => {}, logger: quiet,
    now: c.now, setTimer: c.setTimer, clearTimer: c.clearTimer, random: () => 0, ...overrides });
}
function sceneFor() {
  const config = { enabled: true, variant: 'spongebob', assetsDirectory: '/virtual', mediaDirectory: '/virtual' };
  const controller = createSceneController({ ...config, exists: async () => true, logger: quiet });
  return createLiveSceneRuntime({ config, controller, preview: { setScene() {} }, logger: quiet });
}

test('intervalo fixo de 3s prevalece sobre faixa de 5s do .env; faixa explícita funciona sem fixo', () => {
  const config = getInteractionConfig({ ...env, INTERACTION_AMBIENT_SILENCE_MS: '3000', INTERACTION_AMBIENT_MIN_SILENCE_MS: '5000', INTERACTION_AMBIENT_MAX_SILENCE_MS: '5000' });
  assert.equal(config.ambientMinSilenceMs, 3000); assert.equal(config.ambientMaxSilenceMs, 3000);
  assert.equal(getInteractionConfig({ INTERACTION_AMBIENT_MIN_SILENCE_MS: '7000', INTERACTION_AMBIENT_MAX_SILENCE_MS: '9000' }).ambientMaxSilenceMs, 9000);
});

for (const fallback of [false, true]) for (const respondAll of [false, true]) {
  test(`convites por modo, variedade e transição de ciclo: fallback=${fallback}, respondAll=${respondAll}`, () => {
    const lines = loadInteractionLines({ filePath: fallback ? 'ausente.json' : 'config/live-lines.json', logger: quiet, respondAll, trigger: '!bob' });
    assert.equal(lines.fallbackUsed, fallback);
    assert.ok(lines.ambient.length >= 20);
    const all = [...lines.opening, ...lines.ambient].join(' ');
    assert.doesNotMatch(all, /respondo tudo|respondo todas/iu);
    if (respondAll) { assert.doesNotMatch(all, /comece com|começando com|escrevam (ia|!bob)/iu); assert.match(all, /Mandem uma pergunta no chat/iu); }
    else { assert.match(all, /!bob/u); assert.doesNotMatch(all, /\{trigger\}/u); }
    const selector = createLineCycleSelector(lines.ambient, { random: () => .4 });
    let previous;
    for (let cycle = 0; cycle < 3; cycle++) {
      const selected = [];
      for (let i = 0; i < lines.ambient.length; i++) { const next = selector.next(); assert.notEqual(next, previous); selected.push(next); previous = next; }
      assert.equal(new Set(selected).size, lines.ambient.length);
    }
  });
}

test('rotação habilitada convive com três ciclos TTS; sem sobreposição e 5s após término real', async () => {
  const c = clock(), events = [];
  const rotation = createAmbientRotationController({ clips: [{id:'one', file:'one.mp4'}, {id:'two', file:'two.mp4'}], presentFiles: new Set(['one.mp4','two.mp4']), cooldownMs: 0, now: c.now });
  let release, active = false;
  const begin = async kind => { assert.equal(active, false); active = true; events.push([kind,c.now()]); await new Promise(r => { release = r; }); active = false; };
  const engine = engineFor(c, { findAmbientRotation: () => rotation.next(), playVideo: () => begin('video'), speak: () => begin('tts') });
  engine.start();
  for (const expected of ['video','tts','video','tts','video','tts']) {
    await c.advance(4999); assert.equal(active, false);
    await c.advance(1); assert.equal(events.at(-1)[0], expected); assert.equal(active, true);
    const count = events.length; await c.advance(10000); assert.equal(events.length, count);
    release(); await flush();
  }
  await engine.stop(); assert.equal(c.timers.size,0);
});

test('comentário e presente aguardam vídeo falado e passam antes da retomada ambiente', async () => {
  const c = clock(), events = []; let release;
  const engine = engineFor(c, { findAmbientRotation: () => ({id:'rotation',file:'one.mp4'}),
    playVideo: async ({id}) => { events.push(id); if (id === 'rotation') await new Promise(r => { release = r; }); },
    answerQuestion: async () => events.push('question'), speak: async () => events.push('tts') });
  engine.start(); await c.advance(5000);
  engine.onQuestion({user:'Ana',comment:'Olá'}); engine.onGiftVideo({user:'Lu',giftName:'Rosa',clipId:'gift',clipFile:'gift.mp4'});
  await c.advance(12000); assert.deepEqual(events,['rotation']);
  release(); await flush(); assert.deepEqual(events,['rotation','gift','question']);
  await c.advance(4999); assert.equal(events.length,3); await c.advance(1); assert.equal(events.at(-1),'tts');
  await engine.stop();
});

test('cancelamento de ambiente pendente inclui vídeo de baixa prioridade', async () => {
  const events = []; let release;
  const queue = createPriorityTaskQueue();
  queue.enqueue({kind:'question',priority:80,run:()=>new Promise(r=>{release=r;})});
  queue.enqueue({kind:'video',priority:10,run:async()=>events.push('ambient-video')});
  queue.enqueue({kind:'gift',priority:100,run:async()=>events.push('gift')});
  release(); await queue.whenIdle(); assert.deepEqual(events,['gift']);
});

test('clipe silencioso é mutado e limitado a 5s; timeout real da prévia devolve idle e permite TTS', async () => {
  const c = clock(), calls=[];
  const preview = createScenePreview({ port:0, logger:quiet });
  const config = { enabled:true,variant:'spongebob',assetsDirectory:'/virtual',mediaDirectory:'/virtual' };
  const controller = createSceneController({ ...config, exists:async()=>true,logger:quiet });
  const runtime = createLiveSceneRuntime({config,controller,preview,mediaExists:()=>true,logger:quiet});
  let videoFinished;
  const engine = engineFor(c, { findAmbientRotation:()=>({id:'silent',file:'silent.mp4',hasSpeech:false}),
    playVideo: ({video,hasSpeech,timeoutMs}) => { calls.push([hasSpeech,timeoutMs]); videoFinished=runtime.playClip(video,{hasSpeech,timeoutMs:20}); return videoFinished; },
    speak: async()=> { assert.equal(preview.getState().muted,true); assert.equal(runtime.getState(),'idle'); calls.push('tts'); } });
  engine.start(); await c.advance(5000);
  assert.deepEqual(calls,[[false,5000]]); assert.equal(preview.getState().muted,true);
  // Socket mantém o loop vivo enquanto o timeout de segurança (unref) é verificado.
  await preview.start(); await videoFinished; await flush();
  assert.equal(runtime.getState(),'idle'); await c.advance(5000); assert.equal(calls.at(-1),'tts');
  await engine.stop(); await preview.stop();
});

test('membro aguardando agrupamento impede ambiente; retoma 5s depois das boas-vindas', async () => {
  const c=clock(),events=[];
  const engine=engineFor(c,{speak:async(_,meta)=>events.push(meta.interactionKind)},{welcomeEnabled:true});
  engine.start();engine.onMember({id:'1',name:'Ana'});
  await c.advance(14999);assert.deepEqual(events,[]);await c.advance(1);assert.deepEqual(events,['member']);
  await c.advance(5000);assert.deepEqual(events,['member','ambient']);await engine.stop();
});

test('pause/resume durante geração invalida a fala antiga e mantém um único timer', async () => {
  const c=clock(),events=[];let release;
  const engine=engineFor(c,{speak:async(_,meta)=>{if(!release) await new Promise(r=>{release=r;});if(!meta.shouldCancel())events.push('audio');}});
  engine.start();await c.advance(5000);engine.pause();engine.resume();engine.resume();
  release();await flush();assert.deepEqual(events,[]);assert.equal(c.timers.size,1);
  await c.advance(4999);assert.deepEqual(events,[]);await c.advance(1);assert.deepEqual(events,['audio']);
  await engine.stop();engine.resume();await c.advance(20000);assert.equal(c.timers.size,0);
});

test('encerramento descarta fila pendente e aguarda a frase ativa antes de fechar', async () => {
  const c=clock(),events=[];let release;
  const engine=engineFor(c,{speak:async(_,meta)=>{await meta.onPlaybackStart();events.push('start');await new Promise(r=>{release=r;});events.push('end');},answerQuestion:async()=>events.push('question')});
  engine.start();await c.advance(5000);engine.onQuestion({user:'Ana',comment:'olá'});
  let stopped=false;const stopping=engine.stop().then(()=>{stopped=true;});await flush();assert.equal(stopped,false);
  release();await stopping;assert.deepEqual(events,['start','end']);assert.equal(c.timers.size,0);
});

test('falhas retornadas e exceções espaçam tentativas em 15/30/60s e liberam perguntas', async () => {
  const c=clock(),times=[];let questions=0;
  const engine=engineFor(c,{speak:async()=>{times.push(c.now());if(times.length===2)throw new Error('timeout');return {ok:false,error:'rede'};},answerQuestion:async()=>{questions++;}});
  engine.start();await c.advance(5000);await c.advance(14999);assert.deepEqual(times,[5000]);
  await c.advance(1);await c.advance(29999);assert.equal(times.length,2);await c.advance(1);assert.deepEqual(times,[5000,20000,50000]);
  engine.onQuestion({user:'Ana',comment:'olá'});await flush();assert.equal(questions,1);
  await c.advance(59999);assert.equal(times.length,3);await c.advance(1);assert.equal(times.length,4);await engine.stop();
});

for (const afterStart of [false,true]) test(`exceção do TTS restaura cena: após início=${afterStart}`, async () => {
  const runtime=sceneFor();await runtime.showThinking();
  await assert.rejects(runtime.speak('teste',{speaker:async(_,hooks)=>{if(afterStart)await hooks.onPlaybackStart({});throw new Error('falha real do adaptador');}}),/falha real/);
  assert.equal(runtime.getState(),'idle');
});

test('desativar ambiente preserva interações humanas sem novas falas nem timers',async()=>{
  const c=clock(),events=[];const engine=engineFor(c,{speak:async()=>events.push('tts'),answerQuestion:async()=>events.push('question'),findAmbientRotation:()=>({id:'one',file:'one.mp4'}),playVideo:async()=>events.push('video')},{ambientEnabled:false});
  engine.start();await c.advance(60000);assert.deepEqual(events,[]);engine.onQuestion({user:'Ana',comment:'olá'});await flush();assert.deepEqual(events,['question']);assert.equal(c.timers.size,0);await engine.stop();
});

test('script servido pausa e muta mídia ao timeout, antes de avisar o servidor',async()=>{
  const { runInNewContext } = await import('node:vm');
  const preview=createScenePreview({port:0,logger:quiet});const {url}=await preview.start();
  try {
    const html=await (await fetch(url)).text();const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
    let deadline,reported=false;const elements=new Map();
    const video={style:{},muted:false,paused:false,pause(){this.paused=true;},async play(){this.paused=false;}};
    elements.set('video',video);
    const context={document:{getElementById(id){if(!elements.has(id))elements.set(id,{style:{}});return elements.get(id);},addEventListener(){}},Image:class{},requestAnimationFrame(){},setInterval(){},setTimeout(fn){deadline=fn;return 1;},clearTimeout(){},Date,
      fetch:async(path)=>{if(path==='/api/media-ended'){assert.equal(video.paused,true);assert.equal(video.muted,true);reported=true;}return {ok:false};}};
    runInNewContext(script,context);
    await runInNewContext("apply({revision:1,mode:'media',assetUrl:'/media/test.mp4',loop:false,muted:false,expiresAt:Date.now()+5000})",context);
    assert.equal(video.paused,false);deadline();assert.equal(reported,true);
  } finally {await preview.stop();}
});
