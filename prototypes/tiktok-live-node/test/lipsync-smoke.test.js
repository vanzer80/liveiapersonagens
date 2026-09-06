import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

test('CLI de lip sync retorna falha quando TTS falha e não anuncia homologação',async()=>{
  const result=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['src/lipsync-smoke.js','Frase de teste'],{
      env:{...process.env,TTS_PROVIDER:'invalid-for-smoke-test',SCENE_PREVIEW_PORT:'0',SCENE_PREVIEW_OPEN_BROWSER:'false',SCENE_PREVIEW_EXIT_AFTER_TEST:'true'},stdio:['ignore','pipe','pipe'],
    });
    let output='';child.stdout.on('data',c=>{output+=c;});child.stderr.on('data',c=>{output+=c;});
    child.once('error',reject);child.once('close',code=>resolve({code,output}));
  });
  assert.equal(result.code,1);assert.match(result.output,/falhas=1/);assert.doesNotMatch(result.output,/concluído com sucesso/);
});
