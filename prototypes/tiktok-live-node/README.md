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
EM TESTE, com fluxo básico já funcionando:
- comentários iniciados por `!ia` ou `ia` podem ser selecionados para a IA;
- a resposta aparece apenas no terminal;
- não existe envio automático de mensagem de volta ao TikTok;
- provedor e modelo são configuráveis por variáveis de ambiente;
- o fluxo comentário real → IA → resposta textual já gerou resposta válida em LIVE real;
- `openrouter/free` mostrou variação de modelo e chegou a selecionar um modelo de segurança que respondeu apenas `User Safety: safe`;
- a tentativa de fixar `qwen/qwen3-30b-a3b:free` falhou em execução real em 2026-09-01 com `This model is unavailable for free`; portanto esse slug não deve ser usado como hipótese atual de teste, mesmo que páginas de catálogo ainda possam exibi-lo como gratuito.

A escolha de provedor/modelo continua sendo apenas hipótese de protótipo. Não é decisão definitiva de arquitetura, fornecedor ou modelo comercial.

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
3. O modelo permanece configurável por `AI_MODEL`.
4. `openrouter/free` pode ser usado como fallback de validação do pipeline, mas não garante consistência de finalidade/qualidade entre chamadas.
5. Antes de fixar um modelo gratuito específico, confirme disponibilidade real via API no momento do teste.

O arquivo `.env` está ignorado pelo Git e não deve ser enviado ao repositório. Em máquinas já configuradas, `git pull` não altera o valor de `AI_MODEL` dentro do `.env` local.

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

Saída esperada quando o modelo escolhido está disponível:

```text
[DECISÃO IA] @usuario: selecionado.
[ENTRADA IA] @usuario: qual sua opinião sobre isso?
[RESPOSTA IA] modelo=...
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

1. No `.env` local da máquina de teste, substituir o slug indisponível `qwen/qwen3-30b-a3b:free` por uma opção confirmada como disponível no momento do teste.
2. Preferir um modelo conversacional específico para revalidar algumas respostas reais; se não houver opção gratuita confiável, usar temporariamente `openrouter/free` apenas para validar o pipeline.
3. Confirmar que comentários comuns não geram chamada à IA.
4. Confirmar que erro do provedor não derruba a conexão da LIVE — comportamento já observado em falhas anteriores, mas manter como critério de aceite da issue.
5. Observar latência e consistência de algumas respostas curtas.
6. Somente depois encerrar o MVP 2 e avançar para TTS.
