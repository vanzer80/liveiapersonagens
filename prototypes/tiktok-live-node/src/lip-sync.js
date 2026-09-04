/**
 * Motor de Sincronização Labial (Lip Sync) PT-BR para Bob Esponja
 *
 * Módulo de funções puras para:
 * - normalizar texto em Português Brasileiro;
 * - decompor palavras em sons/grafemas e mapeá-los para visemas;
 * - converter dados de alinhamento temporal em timeline de visemas;
 * - validar timeline (monotônica, sem gaps inválidos, limites seguros);
 * - resolver visema ativo em um determinado timestamp milissegundo.
 */

export const VISEMES = Object.freeze({
  REST: 'REST', // Boca fechada / repouso / neutra
  A: 'A',       // Boca aberta (A, Á, Â, Ã, À)
  E: 'E',       // Boca esticada / sorriso com dentes (E, É, Ê, I, Í)
  O: 'O',       // Boca arredondada aberta (O, Ó, Ô, Õ)
  U: 'U',       // Boca arredondada estreita / bico (U, Ú)
  MBP: 'MBP',   // Oclusiva bilabial com lábios fechados (M, B, P)
  FV: 'FV',     // Labiodental com dentes no lábio inferior (F, V)
  L: 'L',       // Alveolar / língua no palato (L, LH, D, T, N)
  WQ: 'WQ',     // Semivogal / lábios arredondados (W, Q, QU, GU)
});

export const VALID_VISEME_SET = new Set(Object.values(VISEMES));

/**
 * Normaliza o texto PT-BR para lip sync preservando pontuação que indica pausas.
 */
export function normalizePtBrForLipSync(value) {
  return String(value || '')
    .normalize('NFC')
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/giu, '$1')
    .replace(/https?:\/\/\S+/giu, ' ')
    .replace(/```[\s\S]*?```/gu, ' ')
    .replace(/`([^`]+)`/gu, '$1')
    .replace(/[*_~#>|]+/gu, ' ')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D]/gu, '')
    // Substitui quebras de linha e múltiplos espaços
    .replace(/\s+/gu, ' ')
    // Padroniza pontuação de pausa com espaço ao redor para segmentação uniforme
    .replace(/([.!?,;:…]+)/g, ' $1 ')
    .toLowerCase()
    .trim();
}

/**
 * Mapeia um fonema/grafema ou dígrafo em PT-BR para seu visema correspondente.
 */
export function mapGraphemeToViseme(grapheme) {
  const g = String(grapheme || '').toLowerCase();

  // Bilabiais
  if (['m', 'b', 'p'].includes(g)) return VISEMES.MBP;

  // Labiodentais
  if (['f', 'v'].includes(g)) return VISEMES.FV;

  // Alveolares / Língua
  if (['l', 'lh', 'd', 't', 'n'].includes(g)) return VISEMES.L;

  // Semivogais / Labiais arredondados
  if (['w', 'qu', 'gu'].includes(g)) return VISEMES.WQ;

  // Vogal A e variações
  if (['a', 'á', 'à', 'ã', 'â'].includes(g)) return VISEMES.A;

  // Vogais E, I e variações
  if (['e', 'é', 'ê', 'i', 'í', 'y'].includes(g)) return VISEMES.E;

  // Vogal O e variações
  if (['o', 'ó', 'ô', 'õ'].includes(g)) return VISEMES.O;

  // Vogal U e variações
  if (['u', 'ú'].includes(g)) return VISEMES.U;

  // Sibilantes / fricativas coronais (s, z, c, ç, x, j) usam boca entreaberta com dentes (E)
  if (['s', 'ss', 'c', 'ç', 'z', 'x', 'j', 'ch'].includes(g)) return VISEMES.E;

  // Dígrafo nh: nasalização palatal
  if (g === 'nh') return VISEMES.E;

  // Vibrantes r / rr
  if (['r', 'rr'].includes(g)) return VISEMES.L;

  // k / g
  if (['k', 'g'].includes(g)) return VISEMES.E;

  return VISEMES.REST;
}

/**
 * Decompõe uma palavra em PT-BR em uma lista sequencial de visemas.
 */
export function wordToVisemes(word) {
  const cleanWord = String(word || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^a-z0-9áàãâéêíóôõúç]/gu, '');

  if (!cleanWord) return [];

  const visemes = [];
  let index = 0;

  while (index < cleanWord.length) {
    // Verificar dígrafos de 2 caracteres primeiro
    const twoChars = cleanWord.slice(index, index + 2);
    if (['ch', 'lh', 'nh', 'rr', 'ss', 'qu', 'gu'].includes(twoChars)) {
      const viseme = mapGraphemeToViseme(twoChars);
      visemes.push(viseme);
      index += 2;
      continue;
    }

    // Caractere único
    const char = cleanWord[index];
    const viseme = mapGraphemeToViseme(char);
    visemes.push(viseme);
    index += 1;
  }

  // Compactar visemes repetidos adjacentes na mesma palavra
  const deduplicated = [];
  for (const v of visemes) {
    if (!deduplicated.length || deduplicated[deduplicated.length - 1] !== v) {
      deduplicated.push(v);
    }
  }

  return deduplicated;
}

/**
 * Constrói uma timeline determinística de visemas com timestamps absolutos em milissegundos.
 *
 * @param {Object} params
 * @param {Array<{ text: string, start: number, end: number, chunk_seq?: number }>} [params.segments]
 * @param {string} [params.text] - Texto original da fala (fallback caso segments seja nulo ou vazio)
 * @param {number} [params.audioDurationMs] - Duração total do áudio em ms
 * @param {number} [params.minHoldMs] - Duração mínima de um viseme para evitar flicker (padrão: 65ms)
 * @returns {Array<{ startMs: number, endMs: number, viseme: string }>}
 */
export function buildVisemeTimeline({
  segments = [],
  text = '',
  audioDurationMs = 0,
  minHoldMs = 65,
} = {}) {
  const rawTimeline = [];
  const minHold = Math.max(30, Number(minHoldMs) || 65);

  // Caso 1: Temos segmentos de alinhamento acústico temporal (da API com timestamps)
  if (Array.isArray(segments) && segments.length > 0) {
    let cursorMs = 0;

    for (const segment of segments) {
      const segText = String(segment.text || '').trim();
      const segStartMs = Math.max(0, Math.round((Number(segment.start) || 0) * 1000));
      const segEndMs = Math.max(segStartMs, Math.round((Number(segment.end) || 0) * 1000));

      if (segEndMs <= segStartMs || !segText) continue;

      // Se houver uma pausa entre o cursor anterior e o início deste segmento (> 60ms)
      if (segStartMs > cursorMs + 60) {
        rawTimeline.push({
          startMs: cursorMs,
          endMs: segStartMs,
          viseme: VISEMES.REST,
        });
      }

      // Decompor o texto do segmento em visemas
      const visemes = wordToVisemes(segText);

      if (visemes.length === 0) {
        // Pontuação ou pausa
        rawTimeline.push({
          startMs: segStartMs,
          endMs: segEndMs,
          viseme: VISEMES.REST,
        });
      } else {
        const segDurationMs = segEndMs - segStartMs;
        // Se a duração do segmento for muito curta para todos os visemas com minHold,
        // priorizamos o núcleo vocálico ou o primeiro fonema saliente (MBP / vogal)
        let effectiveVisemes = visemes;
        const maxSlots = Math.max(1, Math.floor(segDurationMs / minHold));

        if (visemes.length > maxSlots) {
          // Selecionar os visemas mais visíveis (MBP, FV, vogais)
          const priority = (v) => (v === VISEMES.MBP ? 3 : [VISEMES.A, VISEMES.O, VISEMES.U].includes(v) ? 2 : 1);
          const scored = visemes.map((v, i) => ({ v, i, score: priority(v) }));
          scored.sort((a, b) => b.score - a.score || a.i - b.i);
          const selected = scored.slice(0, maxSlots).sort((a, b) => a.i - b.i);
          effectiveVisemes = selected.map((s) => s.v);
        }

        const slotDuration = segDurationMs / effectiveVisemes.length;
        for (let i = 0; i < effectiveVisemes.length; i += 1) {
          const vStart = Math.round(segStartMs + i * slotDuration);
          const vEnd = Math.round(segStartMs + (i + 1) * slotDuration);
          rawTimeline.push({
            startMs: vStart,
            endMs: Math.max(vStart + 1, vEnd),
            viseme: effectiveVisemes[i],
          });
        }
      }

      cursorMs = segEndMs;
    }

    // Se o áudio continuar além do último segmento, preencher com REST
    if (audioDurationMs > cursorMs) {
      rawTimeline.push({
        startMs: cursorMs,
        endMs: Math.round(audioDurationMs),
        viseme: VISEMES.REST,
      });
    }
  } else if (text && audioDurationMs > 0) {
    // Caso 2: Fallback temporal uniforme baseado no texto e duração total do áudio
    const words = normalizePtBrForLipSync(text)
      .split(/\s+/)
      .filter(Boolean);

    if (words.length > 0) {
      // Coletar todos os visemas das palavras com pequenas pausas para pontuação
      const items = [];
      for (const w of words) {
        if (/^[.!?,;:…]+$/.test(w)) {
          items.push({ isPause: true });
        } else {
          const vs = wordToVisemes(w);
          for (const v of vs) {
            items.push({ viseme: v, isPause: false });
          }
        }
      }

      if (items.length > 0) {
        const slotMs = audioDurationMs / items.length;
        for (let i = 0; i < items.length; i += 1) {
          const startMs = Math.round(i * slotMs);
          const endMs = Math.round((i + 1) * slotMs);
          rawTimeline.push({
            startMs,
            endMs: Math.max(startMs + 1, endMs),
            viseme: items[i].isPause ? VISEMES.REST : items[i].viseme,
          });
        }
      }
    }
  }

  // Garantir que a timeline termina em REST se houver qualquer elemento
  if (rawTimeline.length === 0) {
    return [
      {
        startMs: 0,
        endMs: Math.max(100, Math.round(audioDurationMs || 100)),
        viseme: VISEMES.REST,
      },
    ];
  }

  // Pós-processamento:
  // 1. Monotonicidade estrita: cada item começa onde o anterior terminou.
  // 2. Fusão de visemes idênticos consecutivos.
  // 3. Aplicação do minimum hold.
  const mergedTimeline = [];
  let current = null;

  for (const item of rawTimeline) {
    const validViseme = VALID_VISEME_SET.has(item.viseme) ? item.viseme : VISEMES.REST;

    if (!current) {
      current = {
        startMs: Math.max(0, item.startMs),
        endMs: Math.max(item.startMs + 1, item.endMs),
        viseme: validViseme,
      };
      continue;
    }

    if (current.viseme === validViseme) {
      // Mesma boca: expande a duração
      current.endMs = Math.max(current.endMs, item.endMs);
    } else {
      // Viseme diferente: garante que o anterior atenda à restrição mínima de tempo
      const duration = current.endMs - current.startMs;
      if (duration < minHold && validViseme !== VISEMES.REST) {
        // Estende o item atual até minHold se não conflitar
        current.endMs = current.startMs + minHold;
      }
      mergedTimeline.push(current);
      current = {
        startMs: current.endMs,
        endMs: Math.max(current.endMs + 1, item.endMs),
        viseme: validViseme,
      };
    }
  }

  if (current) {
    mergedTimeline.push(current);
  }

  // Garantir que o último item seja REST
  const last = mergedTimeline[mergedTimeline.length - 1];
  if (last && last.viseme !== VISEMES.REST) {
    const restEnd = Math.max(last.endMs + minHold, Math.round(audioDurationMs || last.endMs + minHold));
    mergedTimeline.push({
      startMs: last.endMs,
      endMs: restEnd,
      viseme: VISEMES.REST,
    });
  }

  return mergedTimeline;
}

/**
 * Retorna o visema correspondente a um determinado tempo decorrido em ms.
 *
 * @param {Array<{ startMs: number, endMs: number, viseme: string }>} timeline
 * @param {number} elapsedMs
 * @returns {string}
 */
export function resolveVisemeAtTimestamp(timeline, elapsedMs) {
  if (!Array.isArray(timeline) || timeline.length === 0) return VISEMES.REST;
  if (elapsedMs === undefined || elapsedMs === null || Number.isNaN(elapsedMs) || elapsedMs < 0) {
    return VISEMES.REST;
  }

  const ms = Number(elapsedMs);

  // Busca binária para eficiência O(log N)
  let low = 0;
  let high = timeline.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const item = timeline[mid];

    if (ms >= item.startMs && ms < item.endMs) {
      return item.viseme;
    }

    if (ms < item.startMs) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  // Se passou do fim da timeline, a boca volta ao repouso
  return VISEMES.REST;
}

/**
 * Valida se uma timeline é determinística, monotônica e sem tempos negativos.
 */
export function validateTimeline(timeline, { maxDurationMs = Infinity } = {}) {
  if (!Array.isArray(timeline)) {
    return { valid: false, error: 'A timeline deve ser um array.' };
  }

  if (timeline.length === 0) {
    return { valid: false, error: 'A timeline não pode estar vazia.' };
  }

  let prevEnd = 0;

  for (let i = 0; i < timeline.length; i += 1) {
    const item = timeline[i];

    if (typeof item !== 'object' || item === null) {
      return { valid: false, error: `Item ${i} inválido na timeline.` };
    }

    if (!Number.isFinite(item.startMs) || !Number.isFinite(item.endMs)) {
      return { valid: false, error: `Item ${i} possui startMs ou endMs não finitos.` };
    }

    if (item.startMs < 0 || item.endMs <= item.startMs) {
      return { valid: false, error: `Item ${i} possui intervalo inválido: [${item.startMs}, ${item.endMs}].` };
    }

    if (item.startMs < prevEnd) {
      return { valid: false, error: `Item ${i} quebra monotonicidade: startMs=${item.startMs} < prevEnd=${prevEnd}.` };
    }

    if (!VALID_VISEME_SET.has(item.viseme)) {
      return { valid: false, error: `Item ${i} possui viseme inválido: ${item.viseme}.` };
    }

    if (item.endMs > maxDurationMs) {
      return { valid: false, error: `Item ${i} ultrapassa a duração máxima permitida (${maxDurationMs}ms).` };
    }

    prevEnd = item.endMs;
  }

  // Deve terminar em REST
  if (timeline[timeline.length - 1].viseme !== VISEMES.REST) {
    return { valid: false, error: 'A timeline deve terminar em REST.' };
  }

  return { valid: true, error: null };
}

/**
 * Converte a saída SSE com timestamps do Fish Audio em segmentos consolidados.
 * Segue o modelo "latest-wins" por chunk_seq da documentação oficial.
 *
 * @param {Map<number, { content: string, offset: number, alignment: { segments: Array } }>} alignmentByChunk
 * @returns {Array<{ text: string, start: number, end: number, chunk_seq: number }>}
 */
export function consolidateFishAlignment(alignmentByChunk) {
  if (!alignmentByChunk || typeof alignmentByChunk.entries !== 'function') {
    return [];
  }

  const timeline = [];
  const sortedChunks = [...alignmentByChunk.entries()].sort(([a], [b]) => Number(a) - Number(b));

  for (const [chunkSeq, item] of sortedChunks) {
    const offset = Number(item?.offset || 0);
    const segments = item?.alignment?.segments;

    if (Array.isArray(segments)) {
      for (const seg of segments) {
        if (!seg || typeof seg !== 'object') continue;
        timeline.push({
          text: String(seg.text || ''),
          start: Number(seg.start || 0) + offset,
          end: Number(seg.end || 0) + offset,
          chunk_seq: Number(chunkSeq),
        });
      }
    }
  }

  return timeline;
}
