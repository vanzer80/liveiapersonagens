# Protótipo TikTok LIVE — Node.js

Objetivo atual: validar o fluxo incremental do projeto, começando pela captura de eventos públicos de uma TikTok LIVE e avançando agora para resposta textual com IA.

> Este protótipo usa uma biblioteca comunitária/não oficial baseada em engenharia reversa. Ele serve para validação técnica e não representa uma escolha definitiva para produção/comercialização.

## Estado atual

### MVP 1 — Captura de eventos
VALIDADO em teste real:
- conexão com LIVE ativa;
- entrada de usuários;
- comentários em tempo real;
- identificação do usuário;
- texto completo do comentário com extração robusta por múltiplos campos do payload.

### MVP 2 — Resposta textual com IA
EM TESTE:
- comentários iniciados por `!ia` ou `ia` podem ser selecionados para a IA;
- a resposta aparece apenas no terminal;
- não existe envio automático de mensagem de volta ao TikTok;
- provedor e modelo são configuráveis por variáveis de ambiente;
- o fluxo comentário real → IA → resposta textual já gerou resposta válida em LIVE real;
- `openrouter/free` mostrou variação de modelo e chegou a selecionar um modelo de segurança que respondeu apenas `User Safety: safe`;
- para a próxima revalidação, a hipótese de teste usa um modelo gratuito específico: `qwen/qwen3-30b-a3b:free`.

A escolha desse modelo é apenas para tornar o teste reproduzível. Não é uma decisão definitiva de arquitetura, fornecedor ou modelo comercial.

## Requisitos

- Node.js 20 ou superior
- npm
- um usuário do TikTok que esteja AO VIVO no momento do teste

## Instalação

No terminal, entre nesta pasta:

```bash
cd prototypes/tiktok-live-node
npm install
```

## Configurar IA para o MVP 2

A hipótese atual de protótipo usa uma API compatível com OpenAI via OpenRouter. Isso não é uma decisão definitiva de arquitetura.

1. Copie `.env.example` para `.env`.
2. Coloque sua chave no campo `OPENROUTER_API_KEY`.
3. O modelo de teste atual é `qwen/qwen3-30b-a3b:free`, mas pode ser trocado por `AI_MODEL`.

O arquivo `.env` está ignorado pelo Git e não deve ser enviado ao repositório.

## Executar

```bash
npm start -- nome_do_usuario
```

Pode usar com ou sem `@`.

Exemplo:

```bash
npm start -- @criador
```

## Teste controlado da IA

Comentários comuns continuam apenas sendo exibidos:

```text
[COMENTÁRIO] @usuario: oi pessoal
```

Para chamar a IA no MVP 2, envie um comentário começando por `!ia` ou por `ia`:

```text
!ia qual sua opinião sobre isso?
```

ou:

```text
ia qual sua opinião sobre isso?
```

Saída esperada:

```text
[DECISÃO IA] @usuario: selecionado.
[ENTRADA IA] @usuario: qual sua opinião sobre isso?
[RESPOSTA IA] modelo=qwen/qwen3-30b-a3b:free
[RESPOSTA IA] @usuario: ...
```

A regra de gatilho é temporária e existe para evitar chamadas em todos os comentários durante a validação técnica.

## Eventos do MVP 1

Durante a live, eventos aparecem aproximadamente assim:

```text
[COMENTÁRIO] @usuario: mensagem
[ENTRADA] @usuario
[LIKE] @usuario | quantidade=5
[PRESENTE] @usuario | giftId=1234
```

## Próximas validações

1. Revalidar respostas reais usando o modelo gratuito específico configurado.
2. Confirmar que comentários comuns não geram chamada à IA.
3. Confirmar que erro do provedor não derruba a conexão da LIVE.
4. Observar latência e consistência de algumas respostas curtas.
5. Somente depois encerrar o MVP 2 e avançar para TTS.
