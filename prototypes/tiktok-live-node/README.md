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
- somente comentários iniciados por `!ia` são enviados à IA;
- a resposta aparece apenas no terminal;
- não existe envio automático de mensagem de volta ao TikTok;
- provedor e modelo são configuráveis por variáveis de ambiente.

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

A hipótese inicial de protótipo usa uma API compatível com OpenAI via OpenRouter. Isso não é uma decisão definitiva de arquitetura.

1. Copie `.env.example` para `.env`.
2. Coloque sua chave no campo `OPENROUTER_API_KEY`.
3. O modelo padrão de teste é `openrouter/free`, mas pode ser trocado por `AI_MODEL`.

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

Para chamar a IA no MVP 2, envie um comentário começando por `!ia`:

```text
!ia qual sua opinião sobre isso?
```

Saída esperada:

```text
[DECISÃO IA] @usuario: selecionado.
[ENTRADA IA] @usuario: qual sua opinião sobre isso?
[RESPOSTA IA] modelo=...
[RESPOSTA IA] @usuario: ...
```

A regra `!ia` é temporária e existe para evitar custo/chamadas em todos os comentários durante a validação técnica.

## Eventos do MVP 1

Durante a live, eventos aparecem aproximadamente assim:

```text
[COMENTÁRIO] @usuario: mensagem
[ENTRADA] @usuario
[LIKE] @usuario | quantidade=5
[PRESENTE] @usuario | giftId=1234
```

## Próximas validações

1. Confirmar uma chamada real de IA usando um comentário `!ia` da LIVE.
2. Medir latência da resposta textual.
3. Refinar persona provisória.
4. Substituir o gatilho manual por uma regra simples de seleção/priorização.
5. Somente depois avançar para TTS.
