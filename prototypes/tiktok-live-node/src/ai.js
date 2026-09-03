try {
  process.loadEnvFile?.('.env');
} catch {
  // .env é opcional; variáveis também podem ser definidas diretamente no terminal.
}

const DEFAULT_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'nvidia/nemotron-3.5-lightning:free';
const DEFAULT_FALLBACK_MODELS = [
  'minimax/minimax-m3:free',
  'liquid/lfm-2.5-2.6b:free',
];
const DEFAULT_PERSONA = [
  'Você é um personagem virtual brasileiro participando de uma transmissão ao vivo.',
  'Responda em português do Brasil, com naturalidade, simpatia e objetividade.',
  'Use no máximo duas frases curtas.',
  'Não diga que é uma IA e não invente fatos sobre o usuário.',
  'Se não souber algo, responda de forma simples e conversacional.',
].join(' ');

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  return ['1', 'true', 'yes', 'sim', 'on'].includes(String(value).trim().toLowerCase());
}

function normalizeApiKey(value) {
  let key = String(value || '').trim();

  // Tolera colagens comuns no .env sem expor a chave no terminal.
  key = key.replace(/^OPENROUTER_API_KEY\s*=\s*/i, '').trim();
  key = key.replace(/^AI_API_KEY\s*=\s*/i, '').trim();
  key = key.replace(/^Bearer\s+/i, '').trim();

  return key;
}

function parseModelList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueModels(models) {
  return [...new Set(models.filter(Boolean))];
}

export function getAiConfig() {
  const rawApiKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || '';
  const configuredModel = (process.env.AI_MODEL || DEFAULT_MODEL).trim();
  const configuredFallbacks = parseModelList(process.env.AI_FALLBACK_MODELS);

  return {
    apiUrl: (process.env.AI_API_URL || DEFAULT_API_URL).trim(),
    apiKey: normalizeApiKey(rawApiKey),
    model: configuredModel,
    fallbackModels: uniqueModels([
      DEFAULT_MODEL,
      ...(configuredFallbacks.length ? configuredFallbacks : DEFAULT_FALLBACK_MODELS),
    ]).filter((candidate) => candidate !== configuredModel),
    trigger: (process.env.AI_TRIGGER || '!ia').trim(),
    respondAll: parseBoolean(process.env.AI_RESPOND_ALL, false),
  };
}

// Detecta o gatilho (ex.: "ia" ou "!ia") no início do comentário.
// Retorna o gatilho reconhecido ou null. Função pura para permitir teste isolado.
export function matchAiTrigger(comment, trigger) {
  const configured = String(trigger || '').trim();
  const withoutPunctuation = configured.replace(/^\W+/u, '');
  const candidates = [...new Set([configured, withoutPunctuation].filter(Boolean))];
  const normalizedComment = String(comment || '').trimStart().toLowerCase();

  for (const candidate of candidates) {
    const normalizedCandidate = candidate.toLowerCase();
    if (
      normalizedComment === normalizedCandidate ||
      normalizedComment.startsWith(`${normalizedCandidate} `)
    ) {
      return candidate;
    }
  }

  return null;
}

const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

// Decide se um comentário deve virar uma resposta da IA e qual texto usar.
// - respondAll=true: responde a qualquer comentário com conteúdo real (letra/dígito),
//   ignorando o gatilho e mantendo o texto completo. Pula só emoji/pontuação.
// - respondAll=false: mantém o comportamento de gatilho (ex.: "!ia mensagem").
// Função pura, sem efeitos colaterais, para ser coberta por teste.
export function resolveCommentForAi({ comment, trigger = '!ia', respondAll = false } = {}) {
  const raw = String(comment || '');

  if (respondAll) {
    const text = raw.trim();
    if (!text || !HAS_LETTER_OR_DIGIT.test(text)) {
      return { shouldAnswer: false, reason: 'empty-or-noise', text: '' };
    }
    return { shouldAnswer: true, reason: 'respond-all', text };
  }

  const matched = matchAiTrigger(raw, trigger);
  if (!matched) {
    return { shouldAnswer: false, reason: 'no-trigger', text: '' };
  }

  const text = raw.trimStart().slice(matched.length).trim();
  if (!text) {
    return { shouldAnswer: false, reason: 'trigger-without-message', text: '' };
  }

  return { shouldAnswer: true, reason: 'trigger', text };
}

export function isAiConfigured() {
  const { apiKey } = getAiConfig();
  return Boolean(apiKey && apiKey !== 'cole_sua_chave_aqui');
}

export function getSafeAiKeyInfo() {
  const { apiKey } = getAiConfig();

  if (!apiKey || apiKey === 'cole_sua_chave_aqui') {
    return {
      configured: false,
      placeholder: apiKey === 'cole_sua_chave_aqui',
      formatLooksValid: false,
      length: apiKey.length,
    };
  }

  return {
    configured: true,
    placeholder: false,
    formatLooksValid: apiKey.startsWith('sk-or-v1-'),
    length: apiKey.length,
  };
}

export async function validateAiAuthentication() {
  const { apiKey } = getAiConfig();

  if (!apiKey || apiKey === 'cole_sua_chave_aqui') {
    throw new Error('Chave de API ausente. Preencha OPENROUTER_API_KEY no arquivo .env.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/key', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload?.error?.message || payload?.message || `HTTP ${response.status}`;
    throw new Error(detail);
  }

  return true;
}

function normalizeContent(content) {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .join(' ')
      .trim();
  }
  return '';
}

function buildSafeEmptyResponseDiagnostics(payload, requestedModel) {
  const choice = payload?.choices?.[0];
  const message = choice?.message;

  return [
    `modelo=${payload?.model || requestedModel || 'desconhecido'}`,
    `finish_reason=${choice?.finish_reason ?? 'ausente'}`,
    `reasoning=${message?.reasoning ? 'presente' : 'ausente'}`,
    `refusal=${message?.refusal ? 'presente' : 'ausente'}`,
    `completion_tokens=${payload?.usage?.completion_tokens ?? '?'}`,
  ].join(' | ');
}

function isGuardrailOnlyResponse(payload, text) {
  const servedModel = String(payload?.model || '').toLowerCase();
  const normalizedText = String(text || '').trim();

  return (
    servedModel.includes('content-safety') ||
    /^user safety:\s*(safe|unsafe)\b/i.test(normalizedText) ||
    /^assistant safety:\s*(safe|unsafe)\b/i.test(normalizedText)
  );
}

async function requestReplyFromModel({ apiUrl, apiKey, model, user, comment }) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: process.env.PERSONA_PROMPT || DEFAULT_PERSONA,
        },
        {
          role: 'user',
          content: `O usuário @${user} comentou na live: "${comment}". Responda diretamente a ele.`,
        },
      ],
      temperature: 0.7,
      // Para conversa de LIVE, priorizamos resposta direta e baixa latência.
      reasoning: {
        effort: 'none',
        exclude: true,
      },
      max_completion_tokens: 400,
    }),
    signal: AbortSignal.timeout(30000),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload?.error?.message || payload?.message || `HTTP ${response.status}`;
    return {
      ok: false,
      error: detail,
      payload,
    };
  }

  const text = normalizeContent(payload?.choices?.[0]?.message?.content);

  if (!text) {
    return {
      ok: false,
      error: `O provedor respondeu sem texto utilizável. ${buildSafeEmptyResponseDiagnostics(payload, model)}`,
      payload,
    };
  }

  if (isGuardrailOnlyResponse(payload, text)) {
    return {
      ok: false,
      error: `modelo inadequado para conversa (${payload?.model || model}) retornou apenas classificação de segurança`,
      payload,
    };
  }

  return {
    ok: true,
    text,
    model: payload?.model || model,
  };
}

export async function generateAiReply({ user, comment }) {
  const { apiUrl, apiKey, model, fallbackModels } = getAiConfig();

  if (!apiKey || apiKey === 'cole_sua_chave_aqui') {
    throw new Error('Chave de API ausente. Defina OPENROUTER_API_KEY no arquivo .env.');
  }

  const candidates = uniqueModels([model, ...fallbackModels]);
  const failures = [];

  for (const candidate of candidates) {
    try {
      const result = await requestReplyFromModel({
        apiUrl,
        apiKey,
        model: candidate,
        user,
        comment,
      });

      if (result.ok) {
        return {
          text: result.text,
          model: result.model,
          requestedModel: model,
          fallbackUsed: candidate !== model,
        };
      }

      failures.push(`${candidate}: ${result.error}`);
    } catch (error) {
      failures.push(`${candidate}: ${error instanceof Error ? error.message : error}`);
    }
  }

  throw new Error(`Falha no provedor de IA após fallback: ${failures.join(' | ')}`);
}
