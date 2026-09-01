try {
  process.loadEnvFile?.('.env');
} catch {
  // .env é opcional; variáveis também podem ser definidas diretamente no terminal.
}

const DEFAULT_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openrouter/free';
const PLACEHOLDER_API_KEY = 'cole_sua_chave_aqui';
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

function isPlaceholderApiKey(apiKey) {
  return apiKey.toLowerCase() === PLACEHOLDER_API_KEY;
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
  return Boolean(apiKey) && !isPlaceholderApiKey(apiKey);
}

export function getSafeAiKeyInfo() {
  const { apiKey } = getAiConfig();
  const placeholderDetected = Boolean(apiKey) && isPlaceholderApiKey(apiKey);

  if (!apiKey || placeholderDetected) {
    return {
      configured: false,
      placeholderDetected,
      formatLooksValid: false,
      length: apiKey.length,
    };
  }

  return {
    configured: true,
    placeholderDetected: false,
    formatLooksValid: apiKey.startsWith('sk-or-v1-'),
    length: apiKey.length,
  };
}

export async function validateAiAuthentication() {
  const { apiKey } = getAiConfig();

  if (!apiKey) {
    throw new Error('Chave de API ausente. Defina OPENROUTER_API_KEY no arquivo .env.');
  }

  if (isPlaceholderApiKey(apiKey)) {
    throw new Error('O arquivo .env ainda contém o texto de exemplo. Substitua cole_sua_chave_aqui pela chave real do OpenRouter.');
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

export async function generateAiReply({ user, comment }) {
  const { apiUrl, apiKey, model } = getAiConfig();

  if (!apiKey) {
    throw new Error('Chave de API ausente. Defina OPENROUTER_API_KEY ou AI_API_KEY.');
  }

  if (isPlaceholderApiKey(apiKey)) {
    throw new Error('A chave ainda não foi preenchida no .env. Substitua cole_sua_chave_aqui pela chave real do OpenRouter.');
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
      max_tokens: 120,
    }),
    signal: AbortSignal.timeout(20000),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload?.error?.message || payload?.message || `HTTP ${response.status}`;
    throw new Error(`Falha no provedor de IA: ${detail}`);
  }

  const text = normalizeContent(payload?.choices?.[0]?.message?.content);

  if (!text) {
    throw new Error('O provedor respondeu sem texto utilizável.');
  }

  return {
    text,
    model: payload?.model || model,
  };
}
