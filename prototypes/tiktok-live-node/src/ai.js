try {
  process.loadEnvFile?.('.env');
} catch {
  // .env é opcional; variáveis também podem ser definidas diretamente no terminal.
}

const DEFAULT_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'qwen/qwen3-30b-a3b:free';
const DEFAULT_PERSONA = [
  'Você é um personagem virtual brasileiro participando de uma transmissão ao vivo.',
  'Responda em português do Brasil, com naturalidade, simpatia e objetividade.',
  'Use no máximo duas frases curtas.',
  'Não diga que é uma IA e não invente fatos sobre o usuário.',
  'Se não souber algo, responda de forma simples e conversacional.',
].join(' ');

function normalizeApiKey(value) {
  let key = String(value || '').trim();

  // Tolera colagens comuns no .env sem expor a chave no terminal.
  key = key.replace(/^OPENROUTER_API_KEY\s*=\s*/i, '').trim();
  key = key.replace(/^AI_API_KEY\s*=\s*/i, '').trim();
  key = key.replace(/^Bearer\s+/i, '').trim();

  return key;
}

export function getAiConfig() {
  const rawApiKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || '';

  return {
    apiUrl: (process.env.AI_API_URL || DEFAULT_API_URL).trim(),
    apiKey: normalizeApiKey(rawApiKey),
    model: (process.env.AI_MODEL || DEFAULT_MODEL).trim(),
    trigger: (process.env.AI_TRIGGER || '!ia').trim(),
  };
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

export async function generateAiReply({ user, comment }) {
  const { apiUrl, apiKey, model } = getAiConfig();

  if (!apiKey || apiKey === 'cole_sua_chave_aqui') {
    throw new Error('Chave de API ausente. Defina OPENROUTER_API_KEY no arquivo .env.');
  }

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
      // O modelo permanece configurável por AI_MODEL e esta escolha é apenas de protótipo.
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
    throw new Error(`Falha no provedor de IA: ${detail}`);
  }

  const text = normalizeContent(payload?.choices?.[0]?.message?.content);

  if (!text) {
    throw new Error(
      `O provedor respondeu sem texto utilizável. ${buildSafeEmptyResponseDiagnostics(payload, model)}`,
    );
  }

  return {
    text,
    model: payload?.model || model,
  };
}
