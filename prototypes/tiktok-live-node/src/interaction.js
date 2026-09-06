import { readFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_OPENING_LINES = [
  'Oi, pessoal! A live começou e eu já estou pronto para conversar com vocês!',
  { trigger: 'Sejam bem-vindos! Escrevam {trigger} e depois a pergunta para falar comigo ao vivo!', respondAll: 'Sejam bem-vindos! Mandem uma pergunta no chat que eu respondo!' },
];

export const DEFAULT_AMBIENT_LINES = [
  'Galerinha, vamos curtir a live! Tep tep na telinha!',
  'Quem chegou agora manda um oi no chat!',
  'De qual cidade vocês estão assistindo?',
  'Quem aí também adora hambúrguer de siri?',
  'Qual personagem da Fenda do Biquíni vocês mais gostam?',
  { trigger: 'Pessoal, mandem uma pergunta começando com {trigger} para falar comigo!', respondAll: 'Mandem uma pergunta no chat que eu respondo!' },
  'Quem tá curtindo a live clica duas vezes na tela!',
  'Quero saber: vocês preferem hambúrguer ou pizza?',
  'Quem aí já caçou água-viva levanta a mão no chat!',
  'Sejam todos muito bem-vindos! Vamos bater nossa meta de curtidas!',
  'Pergunta rápida: praia, piscina ou mar da Fenda do Biquíni?',
  'Tem alguém assistindo pela primeira vez? Escreve primeira vez no chat!',
  'Estou pronto! Quem aí também está pronto pra se divertir?',
  'Eu quero ver esse chat se mexer: mandem um emoji bem alegre!',
  'Vocês preferem um dia no Siri Cascudo ou passear com o Gary?',
  'Tep tep na telinha pra espalhar alegria submarina!',
  'Vocês escolheriam morar no fundo do mar por uma semana?',
  'Quem aí é amigo do Patrick manda um coração no chat!',
  { trigger: 'Tem pergunta pro Bob? Comece com {trigger} e mande no chat!', respondAll: 'Tem pergunta pro Bob? Manda no chat, vamos conversar!' },
  'Compartilha essa live com quem precisa dar uma boa risada hoje!',
  'Quem já almoçou ou jantou? Me conta o que comeu no chat!',
  'Não esquece de seguir o perfil pra acompanhar as próximas aventuras!',
  'Qual superpoder da Fenda do Biquíni vocês gostariam de ter?',
  'Todo mundo dando dois toques na tela pra ajudar o canal do Bob!',
  'Eu estou de olho no chat! Mandem um oi pra eu saber quem está comigo!',
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

/**
 * Seletor cíclico que percorre todas as frases sem repetir antes de concluir o ciclo.
 * Na troca de ciclo (refill), garante que o primeiro item do novo ciclo não seja igual
 * ao último falado no ciclo anterior.
 */
export function createLineCycleSelector(lines, { random = Math.random } = {}) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error('Lista de falas vazia ou inválida.');
  }

  let currentCycle = [];
  let lastItem = null;

  function refill() {
    const pool = [...lines];
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Se a primeira frase do novo ciclo for idêntica à última frase falada,
    // movemos para o final (se houver mais de 1 item) para evitar repetição imediata.
    if (pool.length > 1 && lastItem !== null && pool[0] === lastItem) {
      pool.push(pool.shift());
    }

    currentCycle = pool;
  }

  return {
    next() {
      if (currentCycle.length === 0) {
        refill();
      }
      const item = currentCycle.shift();
      lastItem = item;
      return item;
    },
    reset() {
      currentCycle = [];
      lastItem = null;
    },
    getRemainingCount() {
      return currentCycle.length;
    },
    getLastItem() {
      return lastItem;
    },
  };
}

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
  const legacyAmbientSilence = String(env.INTERACTION_AMBIENT_SILENCE_MS ?? '').trim() || undefined;
  // O intervalo fixo explícito prevalece sobre a faixa antiga, inclusive no teste de 3s.
  const configuredMin = legacyAmbientSilence ?? env.INTERACTION_AMBIENT_MIN_SILENCE_MS;
  const configuredMax = legacyAmbientSilence ?? env.INTERACTION_AMBIENT_MAX_SILENCE_MS;

  // Padrão aprovado: 5000 ms (5 segundos). Permite configurar valores menores (como 3000 ms)
  // com faixa segura entre 1000 ms (1s) e 300000 ms (5 minutos).
  const ambientMinSilenceMs = parseInteger(
    configuredMin,
    5000,
    { min: 1000, max: 300000 },
  );
  const ambientMaxSilenceMs = parseInteger(
    configuredMax,
    ambientMinSilenceMs,
    { min: 1000, max: 300000 },
  );

  return {
    enabled: parseBoolean(env.INTERACTION_ENABLED, false),
    respondAll: parseBoolean(env.AI_RESPOND_ALL, false),
    trigger: String(env.AI_TRIGGER || '!ia').trim(),
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
    ambientMaxSilenceMs: Math.max(ambientMinSilenceMs, ambientMaxSilenceMs),
    // Mantido para configurações e testes que usam um intervalo fixo.
    ambientSilenceMs: legacyAmbientSilence === undefined
      ? ambientMinSilenceMs
      : parseInteger(legacyAmbientSilence, 5000, { min: 1000, max: 300000 }),
    maxPending: parseInteger(env.INTERACTION_MAX_PENDING, 12, {
      min: 1,
      max: 100,
    }),
  };
}

function normalizeLines(lines, field, { respondAll = false, trigger = '!ia' } = {}) {
  if (!Array.isArray(lines)) throw new Error(`o campo ${field} precisa ser uma lista`);

  const normalized = [...new Set(
    lines
      .map((line) => typeof line === 'string' ? line : line?.[respondAll ? 'respondAll' : 'trigger'])
      .filter((line) => typeof line === 'string')
      .map((line) => line.replaceAll('{trigger}', trigger))
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
  respondAll = false,
  trigger = '!ia',
} = {}) {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);

  try {
    const parsed = JSON.parse(readFileSync(resolvedPath, 'utf8'));
    return {
      opening: normalizeLines(parsed.opening, 'opening', { respondAll, trigger }),
      ambient: normalizeLines(parsed.ambient, 'ambient', { respondAll, trigger }),
      source: resolvedPath,
      fallbackUsed: false,
    };
  } catch (error) {
    logger.warn?.(
      `[INTERAÇÃO] não foi possível carregar ${resolvedPath}; usando falas internas. ` +
        `${error instanceof Error ? error.message : error}`,
    );
    return {
      opening: normalizeLines(DEFAULT_OPENING_LINES, 'opening', { respondAll, trigger }),
      ambient: normalizeLines(DEFAULT_AMBIENT_LINES, 'ambient', { respondAll, trigger }),
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

export function createPriorityTaskQueue({ maxPending = 12, logger = console, onIdle = null } = {}) {
  let active = null;
  let sequence = 0;
  const pending = [];
  const idleWaiters = [];

  async function drain() {
    if (active) return;

    while (pending.length) {
      active = pending.shift();
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

    if (active === null && pending.length === 0 && typeof onIdle === 'function') {
      try {
        onIdle();
      } catch (err) {
        logger.error?.(`[ERRO ON_IDLE] ${err instanceof Error ? err.message : err}`);
      }
    }
    if (!active && !pending.length) idleWaiters.splice(0).forEach((resolve) => resolve());
  }

  function cancelPending(predicate) {
    const cancelled = [];
    for (let i = pending.length - 1; i >= 0; i--) {
      if (predicate(pending[i])) {
        const item = pending.splice(i, 1)[0];
        cancelled.push(item);
        item.onCancel?.();
      }
    }
    return cancelled;
  }

  function enqueue({ kind, priority, run, dedupeKey = null, shouldCancel = null, onCancel = null }) {
    if (typeof run !== 'function') throw new Error('A interação precisa informar uma função run.');

    if (
      dedupeKey &&
      (active?.dedupeKey === dedupeKey || pending.some((item) => item.dedupeKey === dedupeKey))
    ) {
      return { accepted: false, reason: 'duplicate' };
    }

    // Regra aprovada: interação que exige atendimento (pergunta, presente, vídeo, membro)
    // cancela fala automática ainda pendente na fila para priorizar o público imediatamente.
    if (priority > INTERACTION_PRIORITIES.ambient) {
      const removed = cancelPending((item) => item.priority <= INTERACTION_PRIORITIES.ambient);
      if (removed.length > 0) {
        logger.log?.(`[FILA] fala automática pendente cancelada para priorizar evento ${kind}`);
      }
    }

    // Mantém no máximo uma fala automática em preparação ou execução; não acumula na fila.
    if (kind === 'ambient') {
      if (active?.kind === 'ambient' || pending.some((item) => item.kind === 'ambient')) {
        return { accepted: false, reason: 'ambient-already-queued' };
      }
    }

    if (pending.length >= maxPending) {
      const lowest = pending
        .map((item, index) => ({ item, index }))
        .sort((a, b) => a.item.priority - b.item.priority || b.item.sequence - a.item.sequence)[0];

      if (!lowest || lowest.item.priority >= priority) {
        return { accepted: false, reason: 'queue-full' };
      }
      pending.splice(lowest.index, 1)[0].onCancel?.();
    }

    pending.push({ kind, priority, run, dedupeKey, shouldCancel, onCancel, sequence: sequence++ });
    pending.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);
    void drain();
    return { accepted: true };
  }

  return {
    enqueue,
    cancelPending,
    isIdle: () => !active && pending.length === 0,
    hasPendingPriority: (threshold) => pending.some((item) => item.priority > threshold),
    isKindActive: (kind) => active?.kind === kind,
    isKindPending: (kind) => pending.some((item) => item.kind === kind),
    getActiveKind: () => active?.kind || null,
    snapshot: () => ({
      active: active?.kind || null,
      pending: pending.map((item) => item.kind),
    }),
    whenIdle: () => !active && !pending.length ? Promise.resolve() : new Promise((resolve) => idleWaiters.push(resolve)),
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
    logger,
    onIdle: () => touchActivity(),
  });
  const pendingMembers = new Map();
  openingLines = normalizeLines(openingLines, 'opening', config);
  ambientLines = normalizeLines(ambientLines, 'ambient', config);
  const cycleSelector = createLineCycleSelector(ambientLines, { random });
  let welcomeTimer = null;
  let openingTimer = null;
  let ambientTimer = null;
  let lastActivityAt = now();
  let lastWelcomeAt = 0;
  let started = false;
  let stopped = false;
  let suspended = false;
  let ambientPreparing = false;
  let ambientController = null;
  let ambientEpoch = 0;
  let preferAmbientVideo = true;
  let ambientFailures = 0;
  let ambientRetryAt = 0;

  function isCharacterAvailable() {
    return (
      started &&
      !stopped &&
      !suspended &&
      !ambientPreparing &&
      openingTimer === null &&
      pendingMembers.size === 0 &&
      queue.isIdle()
    );
  }

  function getAmbientDelayBounds() {
    const legacyDelay = Number(config.ambientSilenceMs);
    const configuredMin = Number(config.ambientMinSilenceMs);
    const configuredMax = Number(config.ambientMaxSilenceMs);
    const min = Number.isFinite(configuredMin)
      ? configuredMin
      : Number.isFinite(legacyDelay) ? legacyDelay : 5000;
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
    if (ambientTimer !== null) clearTimer(ambientTimer);
    ambientTimer = null;
  }

  function scheduleAmbient() {
    cancelAmbientTimer();
    if (!started || stopped || suspended || !config.enabled || !config.ambientEnabled || !ambientLines.length) return;

    // Conta o intervalo somente quando o personagem estiver disponível,
    // sem fala em reprodução, resposta em processamento ou interação pendente na fila.
    if (!isCharacterAvailable()) {
      return;
    }

    const elapsed = Math.max(0, now() - lastActivityAt);
    const targetDelay = getAmbientDelayMs();
    const delay = Math.max(0, targetDelay - elapsed, ambientRetryAt - now());

    ambientTimer = setTimer(() => {
      ambientTimer = null;
      if (stopped || suspended) return;

      // Revalida: personagem e fila precisam estar completamente disponíveis
      if (!isCharacterAvailable()) {
        return;
      }

      // 1ª opção: rotação de vídeos curtos de ambiente (MVP 6 — nine clips, se ativada).
      if (preferAmbientVideo && typeof playVideo === 'function' && typeof findAmbientRotation === 'function') {
        const clip = findAmbientRotation();
        if (clip?.id && clip?.file) {
          enqueueVideo({
            id: clip.id,
            video: clip.file,
            phrase: 'rotacao-ambiente',
            priority: INTERACTION_PRIORITIES.ambient,
            hasSpeech: clip.hasSpeech !== false,
          });
          preferAmbientVideo = false;
          return;
        }
      }

      // 2ª opção: vídeo de convite (opcional, desligado por padrão).
      if (preferAmbientVideo && typeof playVideo === 'function' && typeof findAmbientVideo === 'function') {
        const clip = findAmbientVideo();
        if (clip?.id && clip?.video) {
          enqueueVideo({
            id: clip.id,
            video: clip.video,
            phrase: 'ambiente',
            priority: INTERACTION_PRIORITIES.ambient,
          });
          preferAmbientVideo = false;
          return;
        }
      }

      // Fala automática curta por TTS usando o seletor cíclico
      const text = cycleSelector.next();
      const scheduledAt = now();
      const silenceMs = Math.max(0, scheduledAt - lastActivityAt);

      logger.log?.(
        `[AMBIENTE] elegibilidade atingida após ${silenceMs}ms de inatividade | preparando fala automática: "${text}"`,
      );

      ambientPreparing = true;
      preferAmbientVideo = true;
      const epoch = ambientEpoch;
      ambientController = new AbortController();

      enqueueSpeech({
        kind: 'ambient',
        text,
        priority: INTERACTION_PRIORITIES.ambient,
        metadata: {
          scheduledAt,
          silenceMs,
          signal: ambientController.signal,
        },
        shouldCancel: () => {
          // Revalida a elegibilidade antes e durante a geração/reprodução:
          // Se uma interação prioritária chegou ou a sessão foi suspensa/encerrada
          if (stopped || suspended || epoch !== ambientEpoch || pendingMembers.size) return true;
          if (queue.hasPendingPriority(INTERACTION_PRIORITIES.ambient)) return true;
          return false;
        },
        onFinally: () => {
          ambientPreparing = false;
          ambientController = null;
        },
      });
    }, delay);
  }

  function scheduleOpening() {
    if (!started || stopped || suspended || !config.openingEnabled || !openingLines.length) return;
    openingTimer = setTimer(() => {
      openingTimer = null;
      if (stopped || suspended) return;
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
    // Invalidação persistente: reconectar não pode ressuscitar uma geração antiga.
    ambientEpoch++;
    ambientController?.abort();
    lastActivityAt = now();
    scheduleAmbient();
  }

  function enqueueSpeech({
    kind,
    text,
    priority,
    metadata = {},
    dedupeKey = null,
    shouldCancel = null,
    onFinally = null,
  }) {
    const result = queue.enqueue({
      kind,
      priority,
      dedupeKey,
      shouldCancel,
      onCancel: onFinally,
      run: async () => {
        try {
          if (typeof shouldCancel === 'function' && shouldCancel()) {
            logger.log?.(
              `[AMBIENTE] fala automática cancelada antes de iniciar | motivo=interação-prioritária-pendente`,
            );
            return;
          }
          const result = await speak(text, {
            ...metadata,
            interactionKind: kind,
            shouldCancel,
            onPlaybackStart: (playbackCtx) => {
              if (kind === 'ambient') {
                const localAt = now();
                const localDelayMs = localAt - (metadata.scheduledAt ?? localAt);
                logger.log?.(
                  `[AMBIENTE] inicio_reproducao_local | geracao_ms=${playbackCtx?.generationLatencyMs ?? '?'} ` +
                    `elegibilidade_ate_player_ms=${localDelayMs} | espectador=nao-verificado`,
                );
              }
            },
            onPlaybackEnd: (context) => {
              if (kind === 'ambient') logger.log?.(`[AMBIENTE] fim_reproducao_local | duracao_ms=${context?.playbackDurationMs ?? '?'} | status=${context?.status ?? 'ended'}`);
            },
          });
          if (kind === 'ambient') {
            if (result?.ok === false && !result.skipped) recordAmbientFailure();
            else if (!result?.skipped) { ambientFailures = 0; ambientRetryAt = 0; }
          }
        } catch (error) {
          if (kind === 'ambient') recordAmbientFailure();
          throw error;
        } finally {
          onFinally?.();
          lastActivityAt = now();
        }
      },
    });

    if (!result.accepted) {
      logger.log?.(`[FILA] tipo=${kind} ignorado | motivo=${result.reason}`);
      onFinally?.();
    }
    return result;
  }

  function recordAmbientFailure() {
    ambientFailures++;
    const backoffMs = Math.min(60000, 15000 * 2 ** Math.min(ambientFailures - 1, 2));
    ambientRetryAt = now() + backoffMs;
    logger.warn?.(`[AMBIENTE] falha | nova_tentativa_em_ms=${backoffMs}`);
  }

  // Vídeo pré-gravado entra na MESMA fila das falas: uma mídia por vez.
  function enqueueVideo({ id, video, user = null, phrase = null, priority = INTERACTION_PRIORITIES.video, hasSpeech = true }) {
    if (typeof playVideo !== 'function') {
      logger.log?.(`[VÍDEO] gatilho=${id} ignorado | motivo=reprodutor-indisponivel`);
      return { accepted: false, reason: 'no-player' };
    }

    const epoch = ambientEpoch;
    const result = queue.enqueue({
      kind: 'video',
      priority,
      // Impede o mesmo vídeo entrar duas vezes enquanto ainda não terminou.
      dedupeKey: `video:${id}`,
      run: async () => {
        try {
          if (stopped || suspended || (priority === INTERACTION_PRIORITIES.ambient && epoch !== ambientEpoch)) return;
          const result = await playVideo({ id, video, user, phrase, hasSpeech,
            // Visual silencioso tem ocupação limitada; não monopoliza a fila.
            timeoutMs: !hasSpeech && priority === INTERACTION_PRIORITIES.ambient ? getAmbientDelayMs() : undefined,
          });
          if (priority === INTERACTION_PRIORITIES.ambient && result?.ok === false && result.status !== 'timeout') recordAmbientFailure();
        } finally {
          lastActivityAt = now();
        }
      },
    });

    if (!result.accepted) {
      logger.log?.(`[FILA] vídeo=${id} ignorado | motivo=${result.reason}`);
    }
    return result;
  }

  function onVideo({ id, video, user = null, phrase = null } = {}) {
    if (!config.enabled || stopped || suspended) return { accepted: false, reason: 'disabled' };
    if (!id || !video) return { accepted: false, reason: 'invalid' };
    touchActivity();
    return enqueueVideo({ id, video, user, phrase });
  }

  function flushMembers() {
    if (welcomeTimer !== null) clearTimer(welcomeTimer);
    welcomeTimer = null;
    if (!pendingMembers.size || stopped || suspended) return { accepted: false, reason: 'empty' };

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
    if (welcomeTimer !== null || stopped || suspended) return;
    const cooldownRemaining = Math.max(0, config.welcomeCooldownMs - (now() - lastWelcomeAt));
    welcomeTimer = setTimer(flushMembers, Math.max(config.welcomeBatchMs, cooldownRemaining));
  }

  function onMember({ id, name }) {
    if (!config.enabled || !config.welcomeEnabled || stopped || suspended) return;
    const key = String(id || name || '').toLowerCase();
    if (!key) return;
    pendingMembers.set(key, sanitizeSpokenName(name || id));
    touchActivity();
    scheduleMemberFlush();
  }

  function onAudienceActivity() {
    if (!config.enabled || stopped || suspended) return;
    // Não reinicia contagem para curtidas ou comentários genéricos não atendidos
  }

  function onGift({ user, giftName }) {
    if (!config.enabled || stopped || suspended) return;
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
    if (!config.enabled || stopped || suspended) return { accepted: false, reason: 'disabled' };
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
    if (!config.enabled || stopped || suspended) return { accepted: false, reason: 'disabled' };
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
          lastActivityAt = now();
        }
      },
    });

    if (!result.accepted) {
      logger.log?.(`[FILA] pergunta de @${spokenUser} ignorada | motivo=${result.reason}`);
    }
    return result;
  }

  function pause() {
    if (suspended || stopped) return;
    suspended = true;
    ambientEpoch++;
    ambientController?.abort();
    cancelAmbientTimer();
    if (openingTimer !== null) clearTimer(openingTimer);
    openingTimer = null;
    if (welcomeTimer !== null) clearTimer(welcomeTimer);
    welcomeTimer = null;
    queue.cancelPending(() => true);
    pendingMembers.clear();
    logger.log?.('[INTERAÇÃO] suspensa (desconexão ou indisponibilidade).');
  }

  function resume() {
    if (!suspended || stopped) return;
    suspended = false;
    cancelAmbientTimer();
    lastActivityAt = now();
    logger.log?.('[INTERAÇÃO] retomada após reconexão.');
    scheduleAmbient();
  }

  function start() {
    if (config.enabled && !started && !stopped) {
      started = true;
      suspended = false;
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
    if (stopped) return queue.whenIdle();
    stopped = true;
    suspended = true;
    ambientEpoch++;
    ambientController?.abort();
    cancelAmbientTimer();
    if (openingTimer !== null) clearTimer(openingTimer);
    openingTimer = null;
    if (welcomeTimer !== null) clearTimer(welcomeTimer);
    welcomeTimer = null;
    queue.cancelPending(() => true);
    pendingMembers.clear();
    return queue.whenIdle();
  }

  return {
    flushMembers,
    getCycleSelector: () => cycleSelector,
    isAvailable: () => isCharacterAvailable(),
    isPreparingAmbient: () => ambientPreparing,
    onAudienceActivity,
    onGift,
    onGiftVideo,
    onMember,
    onQuestion,
    onVideo,
    pause,
    queue,
    resume,
    start,
    stop,
  };
}
