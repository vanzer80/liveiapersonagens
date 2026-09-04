import assert from 'node:assert/strict';
import test from 'node:test';

import { routeComment } from '../src/comment-router.js';
import { createVideoTriggerMatcher, loadVideoTriggers } from '../src/video-triggers.js';

const silentLogger = { log() {}, warn() {}, error() {} };

function buildFindVideo() {
  const { triggers } = loadVideoTriggers({
    filePath: 'config/video-triggers.json',
    logger: silentLogger,
  });
  const matcher = createVideoTriggerMatcher({
    triggers,
    cooldownMs: 60000,
    now: () => 0,
    logger: silentLogger,
  });
  return { matcher, findVideo: (text) => matcher.match(text) };
}

test('comando ia vai para a IA mesmo quando o texto contém palavra de vídeo', () => {
  const { findVideo } = buildFindVideo();

  const decisao = routeComment({
    comment: 'ia o patrick é seu melhor amigo?',
    trigger: '!ia',
    respondAll: false,
    findVideo,
  });

  assert.equal(decisao.kind, 'ai');
  assert.equal(decisao.reason, 'trigger');
  assert.equal(decisao.text, 'o patrick é seu melhor amigo?');
});

test('comando !ia continua indo para a IA', () => {
  const { findVideo } = buildFindVideo();
  const decisao = routeComment({
    comment: '!ia qual seu trabalho favorito?',
    trigger: '!ia',
    respondAll: false,
    findVideo,
  });

  assert.equal(decisao.kind, 'ai');
  assert.equal(decisao.text, 'qual seu trabalho favorito?');
});

test('a palavra ia sozinha não vira vídeo nem resposta', () => {
  const { findVideo } = buildFindVideo();

  const semRespondAll = routeComment({ comment: 'ia', trigger: '!ia', respondAll: false, findVideo });
  assert.equal(semRespondAll.kind, 'none');
  assert.equal(semRespondAll.reason, 'trigger-without-message');

  // Mesmo com responder-a-todos ligado, "ia" continua sendo comando reservado.
  const comRespondAll = routeComment({ comment: 'ia', trigger: '!ia', respondAll: true, findVideo });
  assert.equal(comRespondAll.kind, 'none');
  assert.equal(comRespondAll.reason, 'trigger-without-message');
});

test('comentário temático aciona vídeo quando AI_RESPOND_ALL está desligado', () => {
  const { findVideo } = buildFindVideo();

  const decisao = routeComment({
    comment: 'eu gosto do Patrick',
    trigger: '!ia',
    respondAll: false,
    findVideo,
  });

  assert.equal(decisao.kind, 'video');
  assert.equal(decisao.video.video, 'bob-patrick-v1.mp4');
});

test('AI_RESPOND_ALL + gatilho de vídeo produz APENAS o vídeo, sem resposta dupla', () => {
  const { findVideo } = buildFindVideo();

  const decisao = routeComment({
    comment: 'eu gosto do Patrick',
    trigger: '!ia',
    respondAll: true,
    findVideo,
  });

  assert.equal(decisao.kind, 'video', 'o vídeo deve vencer o responder-a-todos');
  assert.equal(decisao.video.video, 'bob-patrick-v1.mp4');
  // Uma única resposta principal: nenhum texto de IA é devolvido junto.
  assert.equal(decisao.text, undefined);
});

test('AI_RESPOND_ALL responde quando nenhum vídeo casa', () => {
  const { findVideo } = buildFindVideo();

  const decisao = routeComment({
    comment: 'qual é a sua cor preferida?',
    trigger: '!ia',
    respondAll: true,
    findVideo,
  });

  assert.equal(decisao.kind, 'ai');
  assert.equal(decisao.reason, 'respond-all');
  assert.equal(decisao.text, 'qual é a sua cor preferida?');
});

test('sem comando e sem vídeo, com AI_RESPOND_ALL desligado, não há resposta', () => {
  const { findVideo } = buildFindVideo();

  const decisao = routeComment({
    comment: 'qual é a sua cor preferida?',
    trigger: '!ia',
    respondAll: false,
    findVideo,
  });

  assert.equal(decisao.kind, 'none');
  assert.equal(decisao.reason, 'no-trigger');
});

test('ruído puro não vira resposta nem vídeo', () => {
  const { findVideo } = buildFindVideo();

  const decisao = routeComment({ comment: '🔥🔥', trigger: '!ia', respondAll: true, findVideo });
  assert.equal(decisao.kind, 'none');
});

test('com vídeos desativados o comportamento anterior é preservado', () => {
  const comGatilho = routeComment({ comment: 'ia e aí?', trigger: '!ia', respondAll: false, findVideo: null });
  assert.equal(comGatilho.kind, 'ai');

  const respondAll = routeComment({
    comment: 'eu gosto do Patrick',
    trigger: '!ia',
    respondAll: true,
    findVideo: null,
  });
  assert.equal(respondAll.kind, 'ai');
  assert.equal(respondAll.reason, 'respond-all');

  const semNada = routeComment({
    comment: 'eu gosto do Patrick',
    trigger: '!ia',
    respondAll: false,
    findVideo: null,
  });
  assert.equal(semNada.kind, 'none');
});

test('o mesmo comentário nunca devolve vídeo e IA ao mesmo tempo', () => {
  const { findVideo } = buildFindVideo();
  const comentarios = [
    'oi pessoal',
    'quero um hambúrguer',
    'ia me conta uma piada',
    'ia',
    'nada temático aqui',
    'o patrick e o hambúrguer',
  ];

  for (const comentario of comentarios) {
    for (const respondAll of [false, true]) {
      const decisao = routeComment({ comment: comentario, trigger: '!ia', respondAll, findVideo });
      assert.ok(['ai', 'video', 'none'].includes(decisao.kind));
      if (decisao.kind === 'video') assert.equal(decisao.text, undefined);
      if (decisao.kind === 'ai') assert.equal(decisao.video, undefined);
    }
  }
});
