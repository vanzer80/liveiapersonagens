try {
  process.loadEnvFile?.('.env');
} catch {
  // .env é opcional; variáveis também podem ser definidas diretamente no terminal.
}

const DEFAULT_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openrouter/free';
const DEFAULT_PERSONA = [
  'Você é um personagem virtual brasileiro participando de uma transmissão ao vivo.',
  'Responda em português do Brasil, com naturalidade, simpatia e objetividade.',
  'Use no máximo duas frases curtas.',
  'Não diga que é uma IA e não invente fatos sobre o usuário.',
  'Se não souber algo, responda de forma simples e conversacional.',
].join(' ');

export function getAiConfig() {
  return {
    apiUrl: process.env.AI_API_URL || DEFAULT_API_URL,
    apiKey: process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || '',
    model: process.env.AI_MODEL || DEFAULT_MODEL,
    trigger: process.env.AI_TRIGGER || '!ia',
  };
}

export function isAiConfigured() {
  return Boolean(getAiConfig().apiKey);
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
