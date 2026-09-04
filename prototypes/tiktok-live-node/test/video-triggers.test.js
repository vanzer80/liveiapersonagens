import assert from 'node:assert/strict';
import test from 'node:test';

import {
  containsWholePhrase,
  createVideoTriggerMatcher,
  getVideoTriggerConfig,
  loadVideoTriggers,
  matchVideoTrigger,
  normalizeTriggerText,
  validateVideoAssets,
} from '../src/video-triggers.js';

const REQUIRED_VIDEOS = [
  'bob-boas-vindas-v1.mp4',
  'bob-hamburguer-v1.mp4',
  'bob-fenda-biquini-v1.mp4',
  'bob-patrick-v1.mp4',
  'bob-convite-ia-v1.mp4',
];

const silentLogger = { log() {}, warn() {}, error() {} };

function loadRealTriggers() {
  return loadVideoTriggers({ filePath: 'config/video-triggers.json', logger: silentLogger });
}

function matchIn(triggers, comment, options = {}) {
  return matchVideoTrigger({ comment, triggers, cooldownMs: 60000, now: 0, ...options }).match;
}

test('carrega os cinco gatilhos do arquivo de configuração', () => {
  const library = loadRealTriggers();

  assert.equal(library.fallbackUsed, false);
  assert.equal(library.triggers.length, 5);
  assert.deepEqual(
    library.triggers.map((trigger) => trigger.video).sort(),
    [...REQUIRED_VIDEOS].sort(),
  );
  assert.equal(library.cooldownMs, 60000);
});

test('cai para gatilhos internos quando o arquivo não existe', () => {
  const library = loadVideoTriggers({
    filePath: 'config/arquivo-que-nao-existe.json',
    logger: silentLogger,
  });

  assert.equal(library.fallbackUsed, true);
  assert.equal(library.triggers.length, 5);
  assert.deepEqual(
    library.triggers.map((trigger) => trigger.video).sort(),
    [...REQUIRED_VIDEOS].sort(),
  );
});

test('ignora gatilho malformado sem derrubar a configuração', () => {
  const library = loadVideoTriggers({
    filePath: 'config/video-triggers.json',
    logger: silentLogger,
  });
  assert.ok(library.triggers.every((trigger) => trigger.id && trigger.video && trigger.phrases.length));
});

test('valida a existência dos cinco arquivos de vídeo', () => {
  const { triggers } = loadRealTriggers();

  const todosPresentes = validateVideoAssets({ triggers, exists: () => true });
  assert.equal(todosPresentes.ok, true);
  assert.equal(todosPresentes.missing.length, 0);
  assert.equal(todosPresentes.present.length, 5);

  const umAusente = validateVideoAssets({
    triggers,
    exists: (candidate) => !candidate.endsWith('bob-patrick-v1.mp4'),
  });
  assert.equal(umAusente.ok, false);
  assert.deepEqual(umAusente.missing, ['bob-patrick-v1.mp4']);
});

test('normaliza para minúsculas e remove acentos', () => {
  assert.equal(normalizeTriggerText('HAMBÚRGUER'), 'hamburguer');
  assert.equal(normalizeTriggerText('Fenda do Biquíni'), 'fenda do biquini');
  assert.equal(normalizeTriggerText('Estrela-do-Mar!'), 'estrela do mar');
  assert.equal(normalizeTriggerText('  coração   ção  '), 'coracao cao');
});

test('compara por expressão inteira, não por pedaço de palavra', () => {
  assert.equal(containsWholePhrase('eu adoro hamburguer', 'hamburguer'), true);
  assert.equal(containsWholePhrase('trabalho na hamburgueria', 'hamburguer'), false);
  assert.equal(containsWholePhrase('minha familia toda', 'ia'), false);
});

test('reconhece os gatilhos documentados de cada vídeo', () => {
  const { triggers } = loadRealTriggers();

  assert.equal(matchIn(triggers, 'oi').video, 'bob-boas-vindas-v1.mp4');
  assert.equal(matchIn(triggers, 'eu adoro hambúrguer').video, 'bob-hamburguer-v1.mp4');
  assert.equal(matchIn(triggers, 'fala da Fenda do Biquíni').video, 'bob-fenda-biquini-v1.mp4');
  assert.equal(matchIn(triggers, 'o que você acha do Patrick?').video, 'bob-patrick-v1.mp4');
  assert.equal(matchIn(triggers, 'como faço uma pergunta?').video, 'bob-convite-ia-v1.mp4');
});

test('aceita os sinônimos configurados', () => {
  const { triggers } = loadRealTriggers();

  assert.equal(matchIn(triggers, 'vamos ao Siri Cascudo').video, 'bob-hamburguer-v1.mp4');
  assert.equal(matchIn(triggers, 'olha a estrela-do-mar').video, 'bob-patrick-v1.mp4');
  assert.equal(matchIn(triggers, 'ali no fundo do mar').video, 'bob-fenda-biquini-v1.mp4');
  assert.equal(matchIn(triggers, 'cheguei agora').video, 'bob-boas-vindas-v1.mp4');
});

test('não gera falso positivo por substring', () => {
  const { triggers } = loadRealTriggers();

  assert.equal(matchIn(triggers, 'trabalho numa hamburgueria'), null);
  assert.equal(matchIn(triggers, 'meu amigo patrickzinho'), null);
  assert.equal(matchIn(triggers, 'comentario qualquer sem gatilho'), null);
});

test('a palavra ia sozinha não aciona o vídeo de convite', () => {
  const { triggers } = loadRealTriggers();

  assert.equal(matchIn(triggers, 'ia'), null);
  assert.equal(matchIn(triggers, 'ia qual seu trabalho favorito?'), null);
  assert.equal(matchIn(triggers, '!ia me conta uma piada'), null);
});

test('um comentário aciona no máximo um vídeo, escolhendo a expressão mais específica', () => {
  const { triggers } = loadRealTriggers();

  const resultado = matchVideoTrigger({
    comment: 'oi, o patrick gosta de hambúrguer no fundo do mar',
    triggers,
    cooldownMs: 60000,
    now: 0,
  });

  assert.ok(resultado.match, 'deveria casar algum vídeo');
  assert.equal(typeof resultado.match.video, 'string');
  // "fundo do mar" tem 3 palavras e vence gatilhos de palavra única.
  assert.equal(resultado.match.video, 'bob-fenda-biquini-v1.mp4');
});

test('respeita o cooldown de 60 segundos por vídeo', () => {
  const { triggers } = loadRealTriggers();
  let agora = 0;
  const matcher = createVideoTriggerMatcher({
    triggers,
    cooldownMs: 60000,
    now: () => agora,
    logger: silentLogger,
  });

  const primeiro = matcher.match('o patrick chegou');
  assert.equal(primeiro.video, 'bob-patrick-v1.mp4');
  matcher.markFired(primeiro.id);

  agora = 59000;
  assert.equal(matcher.match('o patrick chegou'), null, 'ainda dentro do cooldown');

  agora = 60001;
  assert.equal(matcher.match('o patrick chegou').video, 'bob-patrick-v1.mp4');
});

test('o cooldown é por vídeo e não bloqueia os outros', () => {
  const { triggers } = loadRealTriggers();
  let agora = 0;
  const matcher = createVideoTriggerMatcher({
    triggers,
    cooldownMs: 60000,
    now: () => agora,
    logger: silentLogger,
  });

  matcher.markFired(matcher.match('patrick').id);
  agora = 1000;

  assert.equal(matcher.match('patrick'), null);
  assert.equal(matcher.match('quero um hambúrguer').video, 'bob-hamburguer-v1.mp4');
});

test('o cooldown só conta depois de markFired', () => {
  const { triggers } = loadRealTriggers();
  const matcher = createVideoTriggerMatcher({
    triggers,
    cooldownMs: 60000,
    now: () => 0,
    logger: silentLogger,
  });

  assert.ok(matcher.match('patrick'));
  // Sem markFired o gatilho continua disponível: um disparo recusado não gasta o cooldown.
  assert.ok(matcher.match('patrick'));
});

test('findAmbient devolve o vídeo de convite e respeita o cooldown', () => {
  const { triggers } = loadRealTriggers();
  let agora = 0;
  const matcher = createVideoTriggerMatcher({
    triggers,
    cooldownMs: 60000,
    now: () => agora,
    logger: silentLogger,
  });

  const ambiente = matcher.findAmbient();
  assert.equal(ambiente.video, 'bob-convite-ia-v1.mp4');

  matcher.markFired(ambiente.id);
  agora = 30000;
  assert.equal(matcher.findAmbient(), null);
});

test('a configuração por ambiente tem padrões seguros', () => {
  const config = getVideoTriggerConfig({});
  assert.equal(config.enabled, false);
  assert.equal(config.ambientEnabled, false);
  assert.equal(config.cooldownSeconds, 60);
  assert.equal(config.assetsDirectory, 'assets/mvp6');
});
