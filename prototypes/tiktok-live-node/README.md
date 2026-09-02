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
- a tentativa de fixar `qwen/qwen3-30b-a3b:free` falhou em execução real em 2026-09-01 com `This model is unavailable for free`; portanto esse slug não deve ser usado como hipótese atual de teste;
- o protótipo agora tenta automaticamente fallbacks gratuitos quando o modelo configurado está indisponível, responde sem texto útil ou devolve somente classificação de segurança.

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
3. O modelo principal permanece configurável por `AI_MODEL`.
4. Os modelos de fallback podem ser definidos por `AI_FALLBACK_MODELS`, separados por vírgula.
5. A configuração de exemplo atual usa `nvidia/nemotron-3.5-lightning:free` como principal e fallbacks gratuitos específicos.
6. A disponibilidade de modelos gratuitos pode mudar sem aviso; por isso o fallback automático faz parte da robustez do protótipo.

O arquivo `.env` está ignorado pelo Git e não deve ser enviado ao repositório. Em máquinas já configuradas, `git pull` não altera o valor de `AI_MODEL` dentro do `.env` local. Mesmo assim, o código passa a tentar fallbacks automaticamente após o pull.

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

Saída esperada quando algum dos modelos disponíveis responder corretamente:

```text
[DECISÃO IA] @usuario: selecionado.
[ENTRADA IA] @usuario: qual sua opinião sobre isso?
[RESPOSTA IA] modelo=... latencia_ms=...
[RESPOSTA IA] @usuario: ...
```

Quando o modelo principal falhar e um fallback responder, o terminal também registra:

```text
[FALLBACK IA] principal=... utilizado=...
[RESPOSTA IA] modelo=... latencia_ms=...
```

`latencia_ms` mede o tempo total desde o início da chamada até a resposta final, incluindo tentativas de fallback. Em caso de falha completa, o tempo também aparece em `[ERRO IA]`.

A regra de gatilho é temporária e existe para evitar chamadas em todos os comentários durante a validação técnica.

## Eventos do MVP 1

Durante a live, eventos aparecem aproximadamente assim:

```text
[COMENTÁRIO] @usuario: mensagem
[ENTRADA] @usuario
[LIKE] @usuario | quantidade=5
[PRESENTE] @usuario | giftId=1234
```

## Teste final para fechar o MVP 2

Após `git pull`, faça cinco chamadas curtas em uma mesma LIVE:

```text
ia sugira um nome curto para uma assistente virtual
ia crie uma ideia de personagem divertido
ia conte uma piada curta e leve
ia dê uma dica simples para organizar o dia
ia invente um cumprimento para quem entrou na live
```

Em cada chamada, confirme:

1. aparece `[RESPOSTA IA] modelo=... latencia_ms=...`;
2. a resposta é curta, natural e coerente em PT-BR;
3. comentário comum sem `ia` ou `!ia` não aciona o modelo;
4. a LIVE continua recebendo eventos depois da resposta;
5. se houver troca de modelo, aparece `[FALLBACK IA] principal=... utilizado=...`.

Registre os cinco valores de `latencia_ms` e qual modelo respondeu. Somente depois dessa amostra consistente o MVP 2 pode ser encerrado e o TTS iniciado.
