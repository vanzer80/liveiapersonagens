import { readFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_OPENING_LINES = [
  'Oi, pessoal! A live começou e eu já estou pronto para conversar com vocês!',
  'Sejam bem-vindos! Escrevam ia e depois a pergunta para falar comigo ao vivo!',
];

const DEFAULT_AMBIENT_LINES = [
  'Quem acabou de chegar, conta pra gente de onde está assistindo!',
  'Pergunta do momento: qual seria o seu trabalho na Fenda do Biquíni?',
  'Pessoal, mandem uma pergunta começando com ia que eu respondo ao vivo!',
  'Quero saber: vocês preferem hambúrguer ou pizza?',
  'Se esta live fosse uma aventura submarina, qual seria a nossa primeira missão?',
  'Quem está curtindo a live manda um oi no chat!',
  'Me contem uma coisa boa que aconteceu hoje com vocês.',
  'Qual personagem vocês gostariam de encontrar no fundo do mar?',
];

export const INTERACTION_PRIORITIES = Object.freeze({
  ambient: 10,
  like: 30,
  opening: 50,
  member: 60,
  // Vídeo acionado fica abaixo da pergunta dinâmica e acima da entrada agrupada.
  video: 70,
  question: 80,
  gift: 100,
});

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  return ['1', 'true', 'yes', 'sim', 'on'].includes(String(value).trim().toLowerCase());
}

function parseInteger(value, fallback, { min, max }) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function getInteractionConfig(env = process.env) {
  const legacyAmbientSilence = env.INTERACTION_AMBIENT_SILENCE_MS;
  const ambientMinSilenceMs = parseInteger(
    env.INTERACTION_AMBIENT_MIN_SILENCE_MS ?? legacyAmbientSilence,
    30000,
    { min: 10000, max: 300000 },
  );
  const configuredAmbientMax = parseInteger(
    env.INTERACTION_AMBIENT_MAX_SILENCE_MS ?? legacyAmbientSilence,
    45000,
    { min: 10000, max: 300000 },
  );

  return {
    enabled: parseBoolean(env.INTERACTION_ENABLED, false),
    linesFile: String(env.INTERACTION_LINES_FILE || 'config/live-lines.json').trim(),
    openingEnabled: parseBoolean(env.INTERACTION_OPENING_ENABLED, true),
    openingDelayMs: parseInteger(env.INTERACTION_OPENING_DELAY_MS, 3000, {
      min: 0,
      max: 60000,
    }),
    welcomeEnabled: parseBoolean(env.INTERACTION_WELCOME_ENABLED, true),
    welcomeBatchMs: parseInteger(env.INTERACTION_WELCOME_BATCH_MS, 10000, {
      min: 1000,
      max: 60000,
    }),
    welcomeCooldownMs: parseInteger(env.INTERACTION_WELCOME_COOLDOWN_MS, 15000, {
      min: 1000,
      max: 120000,
    }),
    welcomeMaxNames: parseInteger(env.INTERACTION_WELCOME_MAX_NAMES, 3, {
      min: 1,
      max: 5,
    }),
    ambientEnabled: parseBoolean(env.INTERACTION_AMBIENT_ENABLED, true),
    ambientMinSilenceMs,
    ambientMaxSilenceMs: Math.max(ambientMinSilenceMs, configuredAmbientMax),
    // Mantido para configurações e testes antigos que ainda usam um intervalo fixo.
    ambientSilenceMs: legacyAmbientSilence === undefined ? undefined : ambientMinSilenceMs,
    maxPending: parseInteger(env.INTERACTION_MAX_PENDING, 12, {
      min: 1,
      max: 100,
    }),
    // Tempo máximo que um item pode esperar antes de furar a fila por prioridade.
    starvationMs: parseInteger(env.INTERACTION_STARVATION_MS, 20000, {
      min: 0,
      max: 600000,
    }),
    // Quantos itens do MESMO tipo podem ficar pendentes ao mesmo tempo.
    maxPendingPerKind: parseInteger(env.INTERACTION_MAX_PENDING_PER_KIND, 4, {
      min: 1,
      max: 100,
    }),
  };
}

function normalizeLines(lines, field) {
  if (!Array.isArray(lines)) throw new Error(`o campo ${field} precisa ser uma lista`);

  const normalized = [...new Set(
    lines
      .filter((line) => typeof line === 'string')
      .map((line) => line.replace(/\s+/gu, ' ').trim().slice(0, 280))
      .filter(Boolean),
  )];

  if (!normalized.length) throw new Error(`o campo ${field} não pode ficar vazio`);
  return normalized;
}

export function loadInteractionLines({
  filePath = 'config/live-lines.json',
  cwd = process.cwd(),
  logger = console,
} = {}) {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);

  try {
    const parsed = JSON.parse(readFileSync(resolvedPath, 'utf8'));
    return {
      opening: normalizeLines(parsed.opening, 'opening'),
      ambient: normalizeLines(parsed.ambient, 'ambient'),
      source: resolvedPath,
      fallbackUsed: false,
    };
  } catch (error) {
    logger.warn?.(
      `[INTERAÇÃO] não foi possível carregar ${resolvedPath}; usando falas internas. ` +
        `${error instanceof Error ? error.message : error}`,
    );
    return {
      opening: [...DEFAULT_OPENING_LINES],
      ambient: [...DEFAULT_AMBIENT_LINES],
      source: 'falas-internas',
      fallbackUsed: true,
    };
  }
}

export function sanitizeSpokenName(value) {
  const normalized = String(value || '')
    .replace(/^@+/u, '')
    .replace(/[_\.\-]+/gu, ' ')
    .replace(/[^\p{L}\p{N} ]+/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 32);

  return normalized || 'pessoal';
}

export function shouldThankGift({ giftType, repeatEnd } = {}) {
  const sequenceFinished =
    repeatEnd === true ||
    repeatEnd === 1 ||
    repeatEnd === '1';

  const sequencePending =
    repeatEnd === false ||
    repeatEnd === 0 ||
    repeatEnd === '0';

  const numericGiftType = Number(giftType);

  if (numericGiftType === 1) {
    return sequenceFinished;
  }

  const giftTypeMissing =
    giftType === undefined ||
    giftType === null ||
    giftType === '';

  if (giftTypeMissing && (sequenceFinished || sequencePending)) {
    return sequenceFinished;
  }

  return true;
}

export function formatWelcome(names, total, maxNames = 3) {
  const selected = names.slice(0, maxNames).map(sanitizeSpokenName);
  const remaining = Math.max(0, total - selected.length);
  const suffix = remaining > 0 ? ` e mais ${remaining} ${remaining === 1 ? 'pessoa' : 'pessoas'}` : '';

  if (selected.length === 1) {
    return `Olha quem chegou: ${selected[0]}${suffix}! Seja muito bem-vindo à live!`;
  }

  if (remaining > 0) {
    return `Olha quem chegou: ${selected.join(', ')}${suffix}! Sejam muito bem-vindos à live!`;
  }

  const last = selected.pop();
  return `Olha quem chegou: ${selected.join(', ')} e ${last}! Sejam muito bem-vindos à live!`;
}

export function createPriorityTaskQueue({
  maxPending = 12,
  // Nenhum tipo pode ocupar a fila inteira. Sem isso, um chat cheio de perguntas
  // (prioridade 80) enche os 12 lugares e a entrada (60) é recusada na porta.
  maxPendingPerKind = Math.max(1, Math.ceil(12 / 2)),
  // Item que espera mais que isso passa na frente, mesmo com prioridade menor.
  // Sem isso, uma entrada (60) nunca fala em um chat cheio de perguntas (80).
  starvationMs = 20000,
  now = () => Date.now(),
  logger = console,
} = {}) {
  let active = null;
  let sequence = 0;
  const pending = [];

  function isStarved(item, currentTime) {
    return starvationMs > 0 && currentTime - item.enqueuedAt >= starvationMs;
  }

  // Escolhe o próximo item na hora de executar (e não na hora de enfileirar),
  // porque a espera de cada item muda com o tempo.
  function takeNext() {
    const currentTime = now();
    let bestIndex = 0;

    for (let index = 1; index < pending.length; index += 1) {
      const candidate = pending[index];
      const best = pending[bestIndex];
      const candidateStarved = isStarved(candidate, currentTime);
      const bestStarved = isStarved(best, currentTime);

      // Quem passou do limite de espera vem antes de quem não passou.
      if (candidateStarved !== bestStarved) {
        if (candidateStarved) bestIndex = index;
        continue;
      }

      // Entre os que já esperaram demais vale a ordem de chegada, não a prioridade.
      // Sem isso, novas perguntas também ficariam "atrasadas" e voltariam a passar
      // na frente da entrada, que nunca seria falada.
      if (candidateStarved && bestStarved) {
        if (candidate.enqueuedAt < best.enqueuedAt) bestIndex = index;
        else if (candidate.enqueuedAt === best.enqueuedAt && candidate.sequence < best.sequence) {
          bestIndex = index;
        }
        continue;
      }

      if (candidate.priority !== best.priority) {
        if (candidate.priority > best.priority) bestIndex = index;
        continue;
      }
      if (candidate.sequence < best.sequence) bestIndex = index;
    }

    return pending.splice(bestIndex, 1)[0];
  }

  async function drain() {
    if (active) return;

    while (pending.length) {
      active = takeNext();
      try {
        await active.run();
      } catch (error) {
        logger.error?.(
          `[ERRO INTERAÇÃO] tipo=${active.kind} | ${error instanceof Error ? error.message : error}`,
        );
      } finally {
        active = null;
      }
    }
  }

  function enqueue({ kind, priority, run, dedupeKey = null }) {
    if (typeof run !== 'function') throw new Error('A interação precisa informar uma função run.');

    if (
      dedupeKey &&
      (active?.dedupeKey === dedupeKey || pending.some((item) => item.dedupeKey === dedupeKey))
    ) {
      return { accepted: false, reason: 'duplicate' };
    }

    // Reserva lugar para os outros tipos antes de disputar a capacidade total.
    if (pending.filter((item) => item.kind === kind).length >= maxPendingPerKind) {
      return { accepted: false, reason: 'kind-full' };
    }

    if (pending.length >= maxPending) {
      const currentTime = now();
      // Um item que já esperou demais está prestes a falar: não pode ser descartado.
      const lowest = pending
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !isStarved(item, currentTime))
        .sort((a, b) => a.item.priority - b.item.priority || b.item.sequence - a.item.sequence)[0];

      if (!lowest || lowest.item.priority >= priority) {
        return { accepted: false, reason: 'queue-full' };
      }
      pending.splice(lowest.index, 1);
    }

    pending.push({ kind, priority, run, dedupeKey, sequence: sequence++, enqueuedAt: now() });
    pending.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);
    void drain();
    return { accepted: true };
  }

  return {
    enqueue,
    isIdle: () => !active && pending.length === 0,
    snapshot: () => ({
      active: active?.kind || null,
      pending: pending.map((item) => item.kind),
    }),
  };
}

export function createLiveInteractionEngine({
  config = getInteractionConfig(),
  speak,
  answerQuestion,
  playVideo = null,
  findAmbientVideo = null,
  findAmbientRotation = null,
  openingLines = DEFAULT_OPENING_LINES,
  ambientLines = DEFAULT_AMBIENT_LINES,
  logger = console,
  now = () => Date.now(),
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  random = Math.random,
} = {}) {
  if (typeof speak !== 'function') throw new Error('A função speak é obrigatória.');
  if (typeof answerQuestion !== 'function') throw new Error('A função answerQuestion é obrigatória.');

  const queue = createPriorityTaskQueue({
    maxPending: config.maxPending,
    maxPendingPerKind: config.maxPendingPerKind,
    starvationMs: config.starvationMs,
    now,
    logger,
  });
  const pendingMembers = new Map();
  let welcomeTimer = null;
  let openingTimer = null;
  let ambientTimer = null;
  let ambientCursor = 0;
  let lastActivityAt = now();
  let lastWelcomeAt = 0;
  let started = false;
  let stopped = false;

  function getAmbientDelayBounds() {
    const legacyDelay = Number(config.ambientSilenceMs);
    const configuredMin = Number(config.ambientMinSilenceMs);
    const configuredMax = Number(config.ambientMaxSilenceMs);
    const min = Number.isFinite(configuredMin)
      ? configuredMin
      : Number.isFinite(legacyDelay) ? legacyDelay : 35000;
    const max = Math.max(
      min,
      Number.isFinite(configuredMax)
        ? configuredMax
        : Number.isFinite(legacyDelay) ? legacyDelay : min,
    );
    return { min, max };
  }

  function getAmbientDelayMs() {
    const { min, max } = getAmbientDelayBounds();
    return Math.round(min + (max - min) * Math.min(1, Math.max(0, random())));
  }

  function cancelAmbientTimer() {
    if (ambientTimer) clearTimer(ambientTimer);
    ambientTimer = null;
  }

  function scheduleAmbient() {
    cancelAmbientTimer();
    if (!started || stopped || !config.enabled || !config.ambientEnabled || !ambientLines.length) return;

    const elapsed = Math.max(0, now() - lastActivityAt);
    const delay = Math.max(1000, getAmbientDelayMs() - elapsed);
    ambientTimer = setTimer(() => {
      ambientTimer = null;
      if (stopped) return;
      if (!queue.isIdle()) {
        touchActivity();
        return;
      }

      // 1ª opção: rotação de vídeos curtos de ambiente (MVP 6 — nine clips).
      if (typeof findAmbientRotation === 'function') {
        const clip = findAmbientRotation();
        if (clip?.id && clip?.file) {
          enqueueVideo({
            id: clip.id,
            video: clip.file,
            phrase: 'rotacao-ambiente',
            priority: INTERACTION_PRIORITIES.ambient,
          });
          return;
        }
      }

      // 2ª opção: vídeo de convite (opcional, desligado por padrão).
      if (typeof findAmbientVideo === 'function') {
        const clip = findAmbientVideo();
        if (clip?.id && clip?.video) {
          enqueueVideo({
            id: clip.id,
            video: clip.video,
            phrase: 'ambiente',
            priority: INTERACTION_PRIORITIES.ambient,
          });
          return;
        }
      }

      // Fallback: fala de ambiente por TTS.
      const text = ambientLines[ambientCursor % ambientLines.length];
      ambientCursor += 1;
      enqueueSpeech({ kind: 'ambient', text, priority: INTERACTION_PRIORITIES.ambient });
    }, delay);
  }

  function scheduleOpening() {
    if (!started || stopped || !config.openingEnabled || !openingLines.length) return;
    openingTimer = setTimer(() => {
      openingTimer = null;
      if (stopped) return;
      const openingIndex = Math.min(
        openingLines.length - 1,
        Math.floor(Math.min(1, Math.max(0, random())) * openingLines.length),
      );
      enqueueSpeech({
        kind: 'opening',
        text: openingLines[openingIndex],
        priority: INTERACTION_PRIORITIES.opening,
      });
    }, config.openingDelayMs);
  }

  function touchActivity() {
    lastActivityAt = now();
    scheduleAmbient();
  }

  function enqueueSpeech({ kind, text, priority, metadata = {}, dedupeKey = null }) {
    const result = queue.enqueue({
      kind,
      priority,
      dedupeKey,
      run: async () => {
        try {
          await speak(text, { ...metadata, interactionKind: kind });
        } finally {
          touchActivity();
        }
      },
    });

    if (!result.accepted) {
      logger.log?.(`[FILA] tipo=${kind} ignorado | motivo=${result.reason}`);
    }
    return result;
  }

  // Vídeo pré-gravado entra na MESMA fila das falas: uma mídia por vez.
  function enqueueVideo({ id, video, user = null, phrase = null, priority = INTERACTION_PRIORITIES.video }) {
    if (typeof playVideo !== 'function') {
      logger.log?.(`[VÍDEO] gatilho=${id} ignorado | motivo=reprodutor-indisponivel`);
      return { accepted: false, reason: 'no-player' };
    }

    const result = queue.enqueue({
      kind: 'video',
      priority,
      // Impede o mesmo vídeo entrar duas vezes enquanto ainda não terminou.
      dedupeKey: `video:${id}`,
      run: async () => {
        try {
          await playVideo({ id, video, user, phrase });
        } finally {
          touchActivity();
        }
      },
    });

    if (!result.accepted) {
      logger.log?.(`[FILA] vídeo=${id} ignorado | motivo=${result.reason}`);
    }
    return result;
  }

  function onVideo({ id, video, user = null, phrase = null } = {}) {
    if (!config.enabled || stopped) return { accepted: false, reason: 'disabled' };
    if (!id || !video) return { accepted: false, reason: 'invalid' };
    touchActivity();
    return enqueueVideo({ id, video, user, phrase });
  }

  function flushMembers() {
    if (welcomeTimer) clearTimer(welcomeTimer);
    welcomeTimer = null;
    if (!pendingMembers.size || stopped) return { accepted: false, reason: 'empty' };

    const names = [...pendingMembers.values()];
    pendingMembers.clear();
    lastWelcomeAt = now();

    return enqueueSpeech({
      kind: 'member',
      priority: INTERACTION_PRIORITIES.member,
      text: formatWelcome(names, names.length, config.welcomeMaxNames),
      metadata: { memberCount: names.length },
    });
  }

  function scheduleMemberFlush() {
    if (welcomeTimer || stopped) return;
    const cooldownRemaining = Math.max(0, config.welcomeCooldownMs - (now() - lastWelcomeAt));
    welcomeTimer = setTimer(flushMembers, Math.max(config.welcomeBatchMs, cooldownRemaining));
  }

  function onMember({ id, name }) {
    if (!config.enabled || !config.welcomeEnabled || stopped) return;
    touchActivity();
    const key = String(id || name || '').toLowerCase();
    if (!key) return;
    pendingMembers.set(key, sanitizeSpokenName(name || id));
    scheduleMemberFlush();
  }

  function onAudienceActivity() {
    if (!config.enabled || stopped) return;
    touchActivity();
  }

  function onGift({ user, giftName }) {
    if (!config.enabled || stopped) return;
    touchActivity();
    const name = sanitizeSpokenName(user);
    const gift = sanitizeSpokenName(giftName || 'presente');
    enqueueSpeech({
      kind: 'gift',
      priority: INTERACTION_PRIORITIES.gift,
      text: `${name}, muito obrigado pelo ${gift}! Você deixou a nossa aventura ainda mais divertida!`,
      metadata: { user: name, giftName: gift },
    });
  }

  /**
   * Reação de presente com vídeo pré-gravado.
   * Se clipId e clipFile forem fornecidos, enfileira o vídeo com prioridade máxima.
   * Caso contrário, cai para onGift (TTS dinâmico).
   * Nunca produz vídeo e TTS simultaneamente para o mesmo evento.
   */
  function onGiftVideo({ user, giftName, clipId, clipFile }) {
    if (!config.enabled || stopped) return { accepted: false, reason: 'disabled' };
    if (clipId && clipFile) {
      touchActivity();
      return enqueueVideo({
        id: clipId,
        video: clipFile,
        user,
        phrase: `presente:${giftName || 'presente'}`,
        priority: INTERACTION_PRIORITIES.gift,
      });
    }
    // Fallback: agradecimento dinâmico por TTS.
    onGift({ user, giftName });
    return { accepted: true, reason: 'fallback-tts' };
  }

  function onQuestion({ user, comment }) {
    if (!config.enabled || stopped) return { accepted: false, reason: 'disabled' };
    touchActivity();
    const spokenUser = sanitizeSpokenName(user);
    const result = queue.enqueue({
      kind: 'question',
      priority: INTERACTION_PRIORITIES.question,
      dedupeKey: `question:${spokenUser.toLowerCase()}`,
      run: async () => {
        try {
          await answerQuestion({ user: spokenUser, comment });
        } finally {
          touchActivity();
        }
      },
    });

    if (!result.accepted) {
      logger.log?.(`[FILA] pergunta de @${spokenUser} ignorada | motivo=${result.reason}`);
    }
    return result;
  }

  function start() {
    if (config.enabled && !started && !stopped) {
      started = true;
      lastActivityAt = now();
      const ambientBounds = getAmbientDelayBounds();
      logger.log?.(
        `[INTERAÇÃO] ativa | boas-vindas=${config.welcomeEnabled ? 'sim' : 'não'} ` +
          `abertura=${config.openingEnabled ? `${config.openingDelayMs}ms` : 'não'} ` +
          `ambiente=${config.ambientEnabled ? `${ambientBounds.min}-${ambientBounds.max}ms` : 'não'}`,
      );
      scheduleOpening();
      scheduleAmbient();
    }
  }

  function stop() {
    stopped = true;
    cancelAmbientTimer();
    if (openingTimer) clearTimer(openingTimer);
    openingTimer = null;
    if (welcomeTimer) clearTimer(welcomeTimer);
    welcomeTimer = null;
  }

  return {
    flushMembers,
    onAudienceActivity,
    onGift,
    onGiftVideo,
    onMember,
    onQuestion,
    onVideo,
    queue,
    start,
    stop,
  };
}
