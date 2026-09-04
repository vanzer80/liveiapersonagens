import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  buildVisemeTimeline,
  consolidateFishAlignment,
  mapGraphemeToViseme,
  normalizePtBrForLipSync,
  resolveVisemeAtTimestamp,
  validateTimeline,
  wordToVisemes,
  VALID_VISEME_SET,
  VISEMES,
} from '../src/lip-sync.js';

describe('Motor de Lip Sync PT-BR', () => {
  describe('Mapeador de Grafemas e Dígrafos', () => {
    test('mapeia bilabiais M/B/P para MBP', () => {
      assert.equal(mapGraphemeToViseme('m'), VISEMES.MBP);
      assert.equal(mapGraphemeToViseme('b'), VISEMES.MBP);
      assert.equal(mapGraphemeToViseme('p'), VISEMES.MBP);
      assert.equal(mapGraphemeToViseme('M'), VISEMES.MBP);
      assert.equal(mapGraphemeToViseme('B'), VISEMES.MBP);
      assert.equal(mapGraphemeToViseme('P'), VISEMES.MBP);
    });

    test('mapeia labiodentais F/V para FV', () => {
      assert.equal(mapGraphemeToViseme('f'), VISEMES.FV);
      assert.equal(mapGraphemeToViseme('v'), VISEMES.FV);
      assert.equal(mapGraphemeToViseme('F'), VISEMES.FV);
      assert.equal(mapGraphemeToViseme('V'), VISEMES.FV);
    });

    test('mapeia vogais e acentuações PT-BR corretamente', () => {
      for (const a of ['a', 'á', 'à', 'ã', 'â']) {
        assert.equal(mapGraphemeToViseme(a), VISEMES.A);
      }
      for (const e of ['e', 'é', 'ê', 'i', 'í', 'y']) {
        assert.equal(mapGraphemeToViseme(e), VISEMES.E);
      }
      for (const o of ['o', 'ó', 'ô', 'õ']) {
        assert.equal(mapGraphemeToViseme(o), VISEMES.O);
      }
      for (const u of ['u', 'ú']) {
        assert.equal(mapGraphemeToViseme(u), VISEMES.U);
      }
    });

    test('mapeia dígrafos comuns em PT-BR (nh, lh, ch, rr, qu, gu)', () => {
      assert.equal(mapGraphemeToViseme('nh'), VISEMES.E);
      assert.equal(mapGraphemeToViseme('lh'), VISEMES.L);
      assert.equal(mapGraphemeToViseme('ch'), VISEMES.E);
      assert.equal(mapGraphemeToViseme('rr'), VISEMES.L);
      assert.equal(mapGraphemeToViseme('qu'), VISEMES.WQ);
      assert.equal(mapGraphemeToViseme('gu'), VISEMES.WQ);
    });
  });

  describe('Decomposição de Palavras (wordToVisemes)', () => {
    test('Bob vira sequência MBP -> O -> MBP', () => {
      const visemes = wordToVisemes('Bob');
      assert.deepEqual(visemes, [VISEMES.MBP, VISEMES.O, VISEMES.MBP]);
    });

    test('Patrick contém bilabial inicial, vogal e alveolar', () => {
      const visemes = wordToVisemes('Patrick');
      assert.equal(visemes[0], VISEMES.MBP); // P
      assert.ok(visemes.includes(VISEMES.A)); // A
    });

    test('Fenda começa com FV', () => {
      const visemes = wordToVisemes('Fenda');
      assert.equal(visemes[0], VISEMES.FV);
    });

    test('Biquíni contém MBP, WQ e E', () => {
      const visemes = wordToVisemes('biquíni');
      assert.equal(visemes[0], VISEMES.MBP);
      assert.ok(visemes.includes(VISEMES.WQ));
      assert.ok(visemes.includes(VISEMES.E));
    });

    test('palavra vazia retorna array vazio', () => {
      assert.deepEqual(wordToVisemes(''), []);
      assert.deepEqual(wordToVisemes('!!!'), []);
    });
  });

  describe('Frases de Teste Obrigatórias da Especificação', () => {
    const requiredSentences = [
      'Oi, pessoal! Meu nome é Bob.',
      'Vamos para a praia?',
      'Bob, Patrick e Plankton.',
      'Mamãe me mandou um hambúrguer.',
      'Fui visitar a Fenda do Biquíni.',
    ];

    for (const sentence of requiredSentences) {
      test(`processa com sucesso: "${sentence}"`, () => {
        const normalized = normalizePtBrForLipSync(sentence);
        assert.ok(normalized.length > 0);

        const timeline = buildVisemeTimeline({
          text: sentence,
          audioDurationMs: 3000,
          minHoldMs: 65,
        });

        const validation = validateTimeline(timeline);
        assert.ok(validation.valid, `Falha na validação da timeline: ${validation.error}`);

        // A timeline deve conter visemes válidos
        for (const item of timeline) {
          assert.ok(VALID_VISEME_SET.has(item.viseme));
          assert.ok(item.endMs > item.startMs);
        }

        // Deve terminar em REST
        assert.equal(timeline[timeline.length - 1].viseme, VISEMES.REST);
      });
    }

    test('identifica corretamente oclusão bilabial nas palavras com M/B/P', () => {
      const wordsWithMbp = ['Bob', 'Patrick', 'Plankton', 'Mamãe', 'mandou', 'hambúrguer', 'Biquíni', 'praia'];
      for (const w of wordsWithMbp) {
        const vs = wordToVisemes(w);
        assert.ok(vs.includes(VISEMES.MBP), `Esperado MBP em "${w}", obtido: ${vs}`);
      }
    });

    test('identifica corretamente labiodental em palavras com F/V', () => {
      const wordsWithFv = ['Vamos', 'Fui', 'visitar', 'Fenda'];
      for (const w of wordsWithFv) {
        const vs = wordToVisemes(w);
        assert.ok(vs.includes(VISEMES.FV), `Esperado FV em "${w}", obtido: ${vs}`);
      }
    });
  });

  describe('Construção e Validação da Timeline', () => {
    test('gera timeline monotônica sem intervalos negativos ou sobreposição', () => {
      const segments = [
        { text: 'Oi', start: 0.1, end: 0.5 },
        { text: 'Bob', start: 0.8, end: 1.4 },
      ];

      const timeline = buildVisemeTimeline({
        segments,
        audioDurationMs: 2000,
        minHoldMs: 60,
      });

      const result = validateTimeline(timeline);
      assert.ok(result.valid, result.error);

      // Monotonicidade: startMs >= prevEndMs
      for (let i = 1; i < timeline.length; i += 1) {
        assert.ok(
          timeline[i].startMs >= timeline[i - 1].endMs,
          `Item ${i} não é monotônico: start ${timeline[i].startMs} < end ${timeline[i - 1].endMs}`,
        );
      }

      // Deve terminar em REST
      assert.equal(timeline[timeline.length - 1].viseme, VISEMES.REST);
    });

    test('insere REST nas pausas entre palavras distantes', () => {
      const segments = [
        { text: 'Olá', start: 0.0, end: 0.4 },
        // Pausa de 0.4 a 1.0 (600ms)
        { text: 'amigos', start: 1.0, end: 1.6 },
      ];

      const timeline = buildVisemeTimeline({ segments, audioDurationMs: 2000 });
      const pauseItems = timeline.filter((item) => item.startMs >= 400 && item.endMs <= 1000);
      assert.ok(pauseItems.some((item) => item.viseme === VISEMES.REST));
    });

    test('timeline vazia retorna um item seguro de REST', () => {
      const timeline = buildVisemeTimeline({});
      assert.ok(Array.isArray(timeline));
      assert.equal(timeline.length, 1);
      assert.equal(timeline[0].viseme, VISEMES.REST);
    });

    test('validateTimeline rejeita arrays vazios ou estruturas corrompidas', () => {
      assert.equal(validateTimeline([]).valid, false);
      assert.equal(validateTimeline(null).valid, false);
      assert.equal(validateTimeline([{ startMs: 100, endMs: 50, viseme: 'A' }]).valid, false);
      assert.equal(validateTimeline([{ startMs: 0, endMs: 100, viseme: 'INVALIDO' }]).valid, false);
    });
  });

  describe('Resolução Temporal (resolveVisemeAtTimestamp)', () => {
    const sampleTimeline = [
      { startMs: 0, endMs: 100, viseme: VISEMES.REST },
      { startMs: 100, endMs: 250, viseme: VISEMES.MBP },
      { startMs: 250, endMs: 400, viseme: VISEMES.A },
      { startMs: 400, endMs: 600, viseme: VISEMES.REST },
    ];

    test('retorna REST para timestamp anterior ao início (negativo)', () => {
      assert.equal(resolveVisemeAtTimestamp(sampleTimeline, -10), VISEMES.REST);
    });

    test('retorna o viseme correto no meio do intervalo', () => {
      assert.equal(resolveVisemeAtTimestamp(sampleTimeline, 50), VISEMES.REST);
      assert.equal(resolveVisemeAtTimestamp(sampleTimeline, 150), VISEMES.MBP);
      assert.equal(resolveVisemeAtTimestamp(sampleTimeline, 300), VISEMES.A);
    });

    test('retorna REST após o fim da fala', () => {
      assert.equal(resolveVisemeAtTimestamp(sampleTimeline, 700), VISEMES.REST);
      assert.equal(resolveVisemeAtTimestamp(sampleTimeline, 9999), VISEMES.REST);
    });

    test('retorna REST para timeline nula ou inválida', () => {
      assert.equal(resolveVisemeAtTimestamp(null, 100), VISEMES.REST);
      assert.equal(resolveVisemeAtTimestamp([], 100), VISEMES.REST);
    });
  });

  describe('Parser de Alinhamento Fish Audio (Fixture SSE)', () => {
    test('consolida snapshots por chunk_seq usando regra latest-wins', () => {
      // Simulação fiel dos eventos SSE recebidos da API Fish Audio
      const alignmentMap = new Map();

      // Chunk 0 inicial
      alignmentMap.set(0, {
        content: 'Oi Bob',
        offset: 0.0,
        alignment: {
          audio_duration: 1.2,
          segments: [
            { text: 'Oi', start: 0.0, end: 0.4 },
            { text: 'Bob', start: 0.5, end: 1.1 },
          ],
        },
      });

      // Chunk 1 posterior (com offset de 1.2s)
      alignmentMap.set(1, {
        content: 'vamos',
        offset: 1.2,
        alignment: {
          audio_duration: 0.8,
          segments: [{ text: 'vamos', start: 0.1, end: 0.7 }],
        },
      });

      const consolidated = consolidateFishAlignment(alignmentMap);
      assert.equal(consolidated.length, 3);
      assert.equal(consolidated[0].text, 'Oi');
      assert.equal(consolidated[0].start, 0.0);
      assert.equal(consolidated[0].end, 0.4);

      assert.equal(consolidated[1].text, 'Bob');
      assert.equal(consolidated[1].start, 0.5);
      assert.equal(consolidated[1].end, 1.1);

      assert.equal(consolidated[2].text, 'vamos');
      // offset 1.2 + 0.1 = 1.3
      assert.ok(Math.abs(consolidated[2].start - 1.3) < 0.001);
      // offset 1.2 + 0.7 = 1.9
      assert.ok(Math.abs(consolidated[2].end - 1.9) < 0.001);
    });

    test('trata mapa nulo ou vazio com segurança', () => {
      assert.deepEqual(consolidateFishAlignment(null), []);
      assert.deepEqual(consolidateFishAlignment(new Map()), []);
    });
  });
});
