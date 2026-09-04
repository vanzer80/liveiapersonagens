import { resolveCommentForAi } from './ai.js';

/**
 * Decide a ÚNICA resposta principal para um comentário da LIVE.
 *
 * Ordem obrigatória:
 *   1. comando explícito "ia ..." / "!ia ..."  -> IA + TTS dinâmico;
 *   2. comentário casa com um vídeo temático   -> vídeo pré-gravado;
 *   3. AI_RESPOND_ALL e nenhum vídeo casou     -> IA + TTS dinâmico;
 *   4. nada disso                              -> sem resposta dinâmica.
 *
 * Isso impede que um comentário como "eu gosto do Patrick" toque o vídeo E
 * também gere resposta de IA para o mesmo comentário.
 *
 * Função pura: `findVideo` é injetado para manter o roteamento testável.
 */
export function routeComment({
  comment,
  trigger = '!ia',
  respondAll = false,
  findVideo = null,
} = {}) {
  // 1. O comando explícito tem precedência sobre qualquer vídeo temático.
  const explicit = resolveCommentForAi({ comment, trigger, respondAll: false });
  if (explicit.shouldAnswer) {
    return { kind: 'ai', text: explicit.text, reason: 'trigger' };
  }

  // "ia" sozinho continua sendo comando reservado: não vira vídeo nem resposta.
  if (explicit.reason === 'trigger-without-message') {
    return { kind: 'none', reason: 'trigger-without-message' };
  }

  // 2. Vídeo temático (no máximo um, decidido por matchVideoTrigger).
  const video = typeof findVideo === 'function' ? findVideo(comment) : null;
  if (video) {
    return { kind: 'video', video, reason: 'video-trigger' };
  }

  // 3. Só então o modo responder-a-todos assume o comentário.
  if (respondAll) {
    const all = resolveCommentForAi({ comment, trigger, respondAll: true });
    if (all.shouldAnswer) {
      return { kind: 'ai', text: all.text, reason: 'respond-all' };
    }
    return { kind: 'none', reason: all.reason };
  }

  return { kind: 'none', reason: 'no-trigger' };
}
