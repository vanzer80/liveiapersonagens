import assert from 'node:assert/strict';
import test from 'node:test';

import { matchAiTrigger, resolveCommentForAi } from '../src/ai.js';

test('matchAiTrigger reconhece ia e !ia no início do comentário', () => {
  assert.equal(matchAiTrigger('ia diga oi', '!ia'), 'ia');
  assert.equal(matchAiTrigger('!ia diga oi', '!ia'), '!ia');
  assert.equal(matchAiTrigger('IA em maiúsculo', '!ia'), 'ia');
  assert.equal(matchAiTrigger('bom dia pessoal', '!ia'), null);
  assert.equal(matchAiTrigger('social', '!ia'), null);
});

test('modo gatilho: responde apenas com gatilho e mensagem', () => {
  assert.deepEqual(
    resolveCommentForAi({ comment: 'ia como você está?', trigger: '!ia', respondAll: false }),
    { shouldAnswer: true, reason: 'trigger', text: 'como você está?' },
  );
});

test('modo gatilho: ignora comentário sem gatilho', () => {
  const result = resolveCommentForAi({ comment: 'oi bob', trigger: '!ia', respondAll: false });
  assert.equal(result.shouldAnswer, false);
  assert.equal(result.reason, 'no-trigger');
});

test('modo gatilho: gatilho sem mensagem não responde', () => {
  const result = resolveCommentForAi({ comment: 'ia', trigger: '!ia', respondAll: false });
  assert.equal(result.shouldAnswer, false);
  assert.equal(result.reason, 'trigger-without-message');
});

test('modo responde-a-tudo: qualquer comentário com conteúdo vira pergunta', () => {
  assert.deepEqual(
    resolveCommentForAi({ comment: '  oi bob, tudo bem?  ', trigger: '!ia', respondAll: true }),
    { shouldAnswer: true, reason: 'respond-all', text: 'oi bob, tudo bem?' },
  );
});

test('modo responde-a-tudo: mantém o texto completo, sem remover o gatilho', () => {
  const result = resolveCommentForAi({ comment: 'ia e aí?', trigger: '!ia', respondAll: true });
  assert.equal(result.shouldAnswer, true);
  assert.equal(result.reason, 'respond-all');
  assert.equal(result.text, 'ia e aí?');
});

test('modo responde-a-tudo: pula comentário vazio ou só emoji/pontuação', () => {
  assert.equal(resolveCommentForAi({ comment: '🔥🔥', respondAll: true }).shouldAnswer, false);
  assert.equal(resolveCommentForAi({ comment: '!!!', respondAll: true }).shouldAnswer, false);
  assert.equal(resolveCommentForAi({ comment: '   ', respondAll: true }).shouldAnswer, false);
  assert.equal(resolveCommentForAi({ comment: '', respondAll: true }).reason, 'empty-or-noise');
});
