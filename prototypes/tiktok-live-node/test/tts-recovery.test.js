import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { runPowerShell, speakText, getTtsConfig } from '../src/tts.js';

// Subprocessos Node reais exercitam o transporte. Não emulam áudio/Windows.
function nodeTransport(script, onSpawn = () => {}) {
  return (_command, _args, options) => {
    const child = spawn(process.execPath, ['-e', script], { ...options, env: process.env });
    onSpawn(child); return child;
  };
}
const cfg = (lip = false) => getTtsConfig({TTS_ENABLED:'true',TTS_PROVIDER:'fish-audio',FISH_AUDIO_API_KEY:'fake-key',FISH_AUDIO_REFERENCE_ID:'fake-voice',LIP_SYNC_ENABLED:String(lip)});
function wav() {
  const b=Buffer.alloc(204); b.write('RIFF');b.writeUInt32LE(196,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(160,40);return b;
}

test('transporte recompõe marcador fragmentado e aguarda callback antes de resolver',async()=>{
  const events=[];
  const output=await runPowerShell('unused',{},async()=>{events.push('start');await new Promise(r=>setTimeout(r,35));events.push('scene-ready');},{spawnProcess:nodeTransport("process.stdout.write('AUDIO_PLAY');setTimeout(()=>process.stdout.write('BACK_READY\\r\\n'),5);process.stdin.once('data',x=>{if(x.toString().trim()!=='PLAY')process.exit(2);process.stdout.write('AUDIO_PLAYBACK_START\\n');process.exitCode=0;process.stdin.pause();});")});
  events.push('end');assert.match(output,/AUDIO_PLAYBACK_START/);assert.deepEqual(events,['start','scene-ready','end']);
});

test('cancelamento na prontidão envia CANCEL e não inicia player',async()=>{
  let starts=0;
  const output=await runPowerShell('unused',{},()=>starts++,{shouldCancel:()=>true,spawnProcess:nodeTransport("process.stdout.write('AUDIO_PLAYBACK_READY\\n');process.stdin.once('data',x=>{console.log(x.toString().trim()==='CANCEL'?'AUDIO_PLAYBACK_CANCELLED':'WRONG');process.stdin.pause();});")});
  assert.match(output,/AUDIO_PLAYBACK_CANCELLED/);assert.equal(starts,0);
});

test('evento após autorização do player aguarda fim sem matar o subprocesso',async()=>{
  const controller=new AbortController();let child;
  await runPowerShell('unused',{},()=>controller.abort(),{signal:controller.signal,spawnProcess:nodeTransport("console.log('AUDIO_PLAYBACK_READY');process.stdin.once('data',()=>{console.log('AUDIO_PLAYBACK_START');setTimeout(()=>{console.log('END');process.stdin.pause();},25);});",c=>{child=c;})});
  assert.equal(child.killed,false);assert.equal(child.exitCode,0);
});

test('timeout mata processo e espera close antes de liberar fila',async()=>{
  let closed=false;
  await assert.rejects(runPowerShell('unused',{},null,{timeoutMs:35,spawnProcess:nodeTransport('setInterval(()=>{},1000)',c=>c.once('close',()=>{closed=true;}))}),/excedeu 35 ms/);
  assert.equal(closed,true);
});

test('abort durante preparação encerra processo antes da resolução',async()=>{
  const c=new AbortController();let closed=false;
  const run=runPowerShell('unused',{},null,{signal:c.signal,spawnProcess:nodeTransport('setInterval(()=>{},1000)',child=>child.once('close',()=>{closed=true;}))});
  c.abort();await assert.rejects(run);assert.equal(closed,true);
});

test('timeout de geração Fish aborta requisição e não chama player',async(t)=>{
  let aborted=false,players=0;
  t.mock.method(globalThis,'fetch',async(_url,{signal})=>new Promise((_,reject)=>{
    signal.addEventListener('abort',()=>{aborted=true;reject(signal.reason);},{once:true});
  }));
  // AbortSignal.timeout não mantém o processo vivo por si só.
  const keep=setInterval(()=>{},1000);
  try {
    const result=await speakText('teste',{config:cfg(),generationTimeoutMs:25,runProcess:async()=>players++});
    assert.equal(result.ok,false);assert.match(result.error,/timeout|aborted/i);assert.equal(aborted,true);assert.equal(players,0);
  }finally{clearInterval(keep);}
});

test('abort durante stream não tenta fallback regular nem toca áudio obsoleto',async(t)=>{
  const c=new AbortController();let calls=0,players=0;
  t.mock.method(globalThis,'fetch',async(_url,{signal})=>{calls++;c.abort();signal.throwIfAborted();});
  const result=await speakText('teste',{config:cfg(true),signal:c.signal,runProcess:async()=>players++});
  assert.equal(result.reason,'cancelled-before-playback');assert.equal(calls,1);assert.equal(players,0);
});

test('player sem marcador não fabrica início/fim de reprodução',async(t)=>{
  t.mock.method(globalThis,'fetch',async()=>new Response(wav()));let starts=0,ends=0;
  const result=await speakText('teste',{config:cfg(),runProcess:async()=>'',onPlaybackStart:()=>starts++,onPlaybackEnd:()=>ends++});
  assert.equal(result.ok,false);assert.match(result.error,/sem marcador/);assert.equal(starts,0);assert.equal(ends,0);
});

test('falha após marcador chama fim com erro e remove WAV temporário',async(t)=>{
  t.mock.method(globalThis,'fetch',async()=>new Response(wav()));let file;const events=[];
  const result=await speakText('teste',{config:cfg(),runProcess:async(_s,env,onSignal)=>{file=env.LIVEIA_TTS_OUTPUT;await access(file);await onSignal();throw new Error('timeout do player');},onPlaybackStart:()=>events.push('start'),onPlaybackEnd:ctx=>events.push(ctx.status)});
  assert.equal(result.ok,false);assert.deepEqual(events,['start','error']);await assert.rejects(access(file));
});
