# Protótipo TikTok LIVE — Node.js

Objetivo atual: validar o fluxo incremental do projeto. Captura e resposta textual estão validadas; a próxima etapa é TTS local/terminal.

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
VALIDADO em TikTok LIVE real:
- comentários iniciados por `!ia` ou `ia` são selecionados para a IA;
- comentários comuns não acionam o modelo;
- resposta curta em PT-BR aparece no terminal;
- erros e fallbacks não derrubam a captura;
- modelo principal e fallbacks são configuráveis;
- fallback real já foi validado com `minimax/minimax-m3:free`;
- a amostra final produziu cinco respostas com latências de `6890`, `2653`, `1548`, `2283` e `1621 ms`;
- média de `2999 ms`, mediana de `2283 ms`, mínimo de `1548 ms` e máximo de `6890 ms`;
- a LIVE continuou recebendo eventos durante e depois das respostas;
- a Issue #2 foi encerrada como concluída.

Limitação registrada: enquanto `aiBusy` está ativo, outro comentário elegível é ignorado. Isso protege o protótipo contra chamadas simultâneas, mas uma fila ou regra de prioridade será necessária antes da live completa.

A escolha de OpenRouter, Nemotron e MiniMax continua sendo hipótese de protótipo, não decisão definitiva de arquitetura ou fornecedor.

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

## Resultado da validação final do MVP 2

A bateria final confirmou cinco respostas bem-sucedidas com `nvidia/nemotron-3.5-lightning:free`:

| Chamada | Latência |
|---|---:|
| 1 | 6890 ms |
| 2 | 2653 ms |
| 3 | 1548 ms |
| 4 | 2283 ms |
| 5 | 1621 ms |

Critérios confirmados:
- resposta curta, natural e coerente em PT-BR;
- comentários comuns não geram chamada à IA;
- eventos continuam chegando durante e depois da resposta;
- medição automática de latência funciona;
- uso de fallback é registrado separadamente;
- reconexão manual à mesma LIVE funciona.

## Próxima etapa — MVP 3: TTS local

Converter a resposta textual validada em áudio reproduzido no computador, ainda sem avatar e sem transmissão completa. O adaptador de TTS deve permanecer substituível e registrar latência, sucesso, erro e duração do áudio.
