import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createAmbientRotationController,
  getAmbientRotationConfig,
  loadAmbientRotation,
  validateAmbientAssets,
} from '../src/ambient-rotation.js';

describe('getAmbientRotationConfig', () => {
  it('retorna defaults quando env está vazio', () => {
    const config = getAmbientRotationConfig({});
    assert.equal(config.enabled, false);
    assert.equal(config.cooldownSeconds, 5);
    assert.equal(config.shuffled, false);
    assert.equal(config.rotationFile, 'config/ambient-rotation.json');
    assert.equal(config.assetsDirectory, 'assets/mvp6');
  });

  it('lê AMBIENT_ROTATION_ENABLED', () => {
    assert.equal(getAmbientRotationConfig({ AMBIENT_ROTATION_ENABLED: 'true' }).enabled, true);
    assert.equal(getAmbientRotationConfig({ AMBIENT_ROTATION_ENABLED: '1' }).enabled, true);
    assert.equal(getAmbientRotationConfig({ AMBIENT_ROTATION_ENABLED: 'false' }).enabled, false);
  });

  it('lê AMBIENT_ROTATION_SHUFFLED', () => {
    assert.equal(getAmbientRotationConfig({ AMBIENT_ROTATION_SHUFFLED: 'true' }).shuffled, true);
    assert.equal(getAmbientRotationConfig({ AMBIENT_ROTATION_SHUFFLED: 'false' }).shuffled, false);
  });

  it('lê AMBIENT_ROTATION_COOLDOWN_SECONDS com limites', () => {
    assert.equal(getAmbientRotationConfig({ AMBIENT_ROTATION_COOLDOWN_SECONDS: '10' }).cooldownSeconds, 10);
    assert.equal(getAmbientRotationConfig({ AMBIENT_ROTATION_COOLDOWN_SECONDS: '-1' }).cooldownSeconds, 0);
    assert.equal(getAmbientRotationConfig({ AMBIENT_ROTATION_COOLDOWN_SECONDS: '99999' }).cooldownSeconds, 3600);
  });
});

describe('loadAmbientRotation', () => {
  const silentLogger = { warn: () => {}, log: () => {} };

  it('retorna clips vazios quando o arquivo não existe', () => {
    const result = loadAmbientRotation({
      filePath: 'config/nao-existe.json',
      logger: silentLogger,
    });
    assert.deepEqual(result.clips, []);
    assert.equal(result.fallbackUsed, true);
  });

  it('normaliza clips de string simples', () => {
    const result = loadAmbientRotation({
      filePath: 'config/ambient-rotation.json',
      cwd: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
      logger: silentLogger,
    });
    // O arquivo real tem clips: [] por enquanto
    assert.ok(Array.isArray(result.clips));
    assert.equal(result.fallbackUsed, false);
  });
});

describe('validateAmbientAssets', () => {
  it('reporta presente e ausente corretamente', () => {
    const clips = [
      { id: 'clip-1', file: 'existe.mp4' },
      { id: 'clip-2', file: 'nao-existe.mp4' },
    ];
    const result = validateAmbientAssets({
      clips,
      assetsDirectory: '/qualquer',
      // path.resolve é chamado internamente: verificamos o segment final do path
      exists: (p) => p.endsWith('existe.mp4') && !p.endsWith('nao-existe.mp4'),
    });
    assert.deepEqual(result.present, ['existe.mp4']);
    assert.deepEqual(result.missing, ['nao-existe.mp4']);
    assert.equal(result.ok, false);
  });

  it('ok=true quando todos os clipes existem', () => {
    const clips = [{ id: 'a', file: 'a.mp4' }, { id: 'b', file: 'b.mp4' }];
    const result = validateAmbientAssets({
      clips,
      assetsDirectory: '/dir',
      exists: () => true,
    });
    assert.equal(result.ok, true);
    assert.equal(result.missing.length, 0);
  });
});

describe('createAmbientRotationController', () => {
  const makeClips = (n) =>
    Array.from({ length: n }, (_, i) => ({ id: `clip-${i + 1}`, file: `clip-${i + 1}.mp4` }));

  it('hasClips=false sem clipes configurados', () => {
    const ctrl = createAmbientRotationController({ clips: [], presentFiles: new Set() });
    assert.equal(ctrl.hasClips, false);
    assert.equal(ctrl.next(), null);
  });

  it('hasClips=false quando arquivos não existem', () => {
    const clips = makeClips(3);
    const ctrl = createAmbientRotationController({ clips, presentFiles: new Set() });
    assert.equal(ctrl.hasClips, false);
    assert.equal(ctrl.next(), null);
  });

  it('hasClips=true quando arquivo existe', () => {
    const clips = makeClips(1);
    const ctrl = createAmbientRotationController({
      clips,
      presentFiles: new Set(['clip-1.mp4']),
      cooldownMs: 0,
    });
    assert.equal(ctrl.hasClips, true);
    const clip = ctrl.next();
    assert.equal(clip.id, 'clip-1');
    assert.equal(clip.file, 'clip-1.mp4');
  });

  it('percorre todos os clipes em sequência', () => {
    const n = 4;
    const clips = makeClips(n);
    const ctrl = createAmbientRotationController({
      clips,
      presentFiles: new Set(clips.map((c) => c.file)),
      cooldownMs: 0,
    });
    const played = [];
    for (let i = 0; i < n; i++) {
      const clip = ctrl.next();
      assert.ok(clip, `clip #${i + 1} não deveria ser null`);
      played.push(clip.id);
    }
    // Todos os 4 devem ter aparecido
    assert.deepEqual([...new Set(played)].sort(), clips.map((c) => c.id).sort());
  });

  it('respeita cooldown: retorna null se único clipe acabou de tocar', () => {
    let ts = 0;
    const clips = makeClips(1);
    const ctrl = createAmbientRotationController({
      clips,
      presentFiles: new Set(['clip-1.mp4']),
      cooldownMs: 5000,
      now: () => ts,
    });
    const first = ctrl.next();
    assert.ok(first);
    ctrl.markPlayed(first.id);
    // Tenta novamente sem avançar o tempo → cooldown ativo
    assert.equal(ctrl.next(), null);
    // Avança o tempo além do cooldown → liberado
    ts = 5001;
    assert.ok(ctrl.next());
  });

  it('markPlayed registra o id e bloqueia próxima chamada em cooldown', () => {
    let ts = 0;
    const clips = makeClips(2);
    const ctrl = createAmbientRotationController({
      clips,
      presentFiles: new Set(clips.map((c) => c.file)),
      cooldownMs: 10000,
      now: () => ts,
    });
    const first = ctrl.next();
    ctrl.markPlayed(first.id);
    // O segundo clipe deve ser retornado (não está em cooldown)
    const second = ctrl.next();
    assert.ok(second);
    assert.notEqual(second.id, first.id);
  });

  it('reset limpa cooldowns e reinicia sequência', () => {
    let ts = 0;
    const clips = makeClips(1);
    const ctrl = createAmbientRotationController({
      clips,
      presentFiles: new Set(['clip-1.mp4']),
      cooldownMs: 5000,
      now: () => ts,
    });
    const first = ctrl.next();
    ctrl.markPlayed(first.id);
    assert.equal(ctrl.next(), null, 'esperava null durante cooldown');
    ctrl.reset();
    assert.ok(ctrl.next(), 'esperava clip após reset');
  });

  it('shuffled=false respeita ordem de configuração', () => {
    const clips = makeClips(5);
    const ctrl = createAmbientRotationController({
      clips,
      presentFiles: new Set(clips.map((c) => c.file)),
      cooldownMs: 0,
      shuffled: false,
    });
    const order = [];
    for (let i = 0; i < 5; i++) order.push(ctrl.next()?.id);
    assert.deepEqual(order, clips.map((c) => c.id));
  });
});
