# Plano técnico inicial

## Objetivo

Validar o fluxo técnico em etapas, começando pela captura de eventos de uma TikTok LIVE.

## Sequência de validação

### Etapa 1 — Captura de eventos
**Status: VALIDADA NO PROTÓTIPO REAL em 2026-09-01.**

Validado:
- conexão a uma LIVE de teste;
- recebimento de comentários em tempo real;
- identificação disponível do usuário;
- registro dos eventos no terminal;
- encerramento e nova conexão manual reproduzíveis no ambiente testado.

Aprendizado relevante: na versão testada do conector, o texto do comentário apareceu no campo `content`; o protótipo mantém fallback entre campos possíveis em vez de assumir um campo fixo.

### Etapa 2 — Resposta textual
**Status: VALIDADA EM LIVE REAL.**

Objetivos desta etapa:
- selecionar eventos relevantes;
- gerar resposta coerente com uma persona;
- evitar resposta mecânica a todo comentário;
- registrar entrada, decisão e saída para diagnóstico.

Validado em teste real:
- gatilho temporário `!ia` ou `ia` seleciona o comentário para IA;
- comentário comum sem gatilho permanece apenas como comentário e não chama a IA;
- comentário real percorreu TikTok → captura → OpenRouter → modelo conversacional → resposta textual válida no terminal;
- `nvidia/nemotron-3.5-lightning:free` gerou resposta conversacional em português para comentário real após a correção de configuração;
- a conexão da LIVE permaneceu ativa e continuou recebendo eventos depois da resposta da IA;
- provedor e modelo permanecem configuráveis;
- o protótipo possui modelos alternativos para reduzir impacto quando um modelo gratuito fica indisponível;
- a amostra final gerou cinco respostas com latências de `6890`, `2653`, `1548`, `2283` e `1621 ms`;
- média de `2999 ms` e mediana de `2283 ms`;
- a captura continuou ativa e a Issue #2 foi encerrada como concluída.

Aprendizados desta etapa:
- `openrouter/free` mostrou comportamento variável e chegou a selecionar um modelo de segurança que retornou apenas `User Safety: safe`;
- `qwen/qwen3-30b-a3b:free` ficou indisponível gratuitamente durante o teste de 2026-09-01;
- a disponibilidade de modelos gratuitos pode mudar, então a aplicação não deve depender de um único slug gratuito;
- a escolha atual de OpenRouter e Nemotron continua sendo somente de protótipo e não define arquitetura comercial, fornecedor definitivo ou modelo final.

Limitação preservada para etapa futura:
- enquanto `aiBusy` está ativo, um segundo comentário elegível é ignorado de forma controlada;
- implementar fila ou regra de prioridade antes da live completa, sem antecipar essa complexidade no TTS local;
- continuar registrando mudanças de disponibilidade dos modelos gratuitos.

### Etapa 3 — TTS
**Status: VALIDADA NO WINDOWS E INTEGRADA EM LIVE REAL.**

Implementado no protótipo:
- transformar a resposta textual validada em áudio;
- adaptador separado em `src/tts.js`;
- provedor inicial `windows-sapi`, sem nova chave ou custo;
- preferência automática por uma voz `pt-BR` instalada no Windows;
- geração de WAV temporário, reprodução local e limpeza do arquivo;
- normalização mínima de Markdown, emojis e URLs;
- configuração por ambiente e teste controlado com `npm run test:tts`;
- logs separados de geração, voz, latência, reprodução e erro;
- falha de TTS isolada para não derrubar a captura nem apagar a resposta textual.

Validado no Windows em 2026-09-03:
- voz `Microsoft Maria Desktop` selecionada automaticamente em `pt-BR`;
- geração do WAV concluída em 884 ms;
- reprodução audível concluída em 7508 ms;
- o transporte do script PowerShell foi estabilizado com `-EncodedCommand` em UTF-16LE;
- nove testes automatizados aprovados e zero vulnerabilidades na auditoria.

Hipótese provisória: `System.Speech.Synthesis.SpeechSynthesizer` do Windows foi escolhido por não exigir conta, chave ou pagamento. Naturalidade e adequação da voz ao personagem ainda precisam ser avaliadas; o fornecedor continua substituível.

Validado em LIVE real em 2026-09-03:
- comentários comuns permaneceram somente como comentários e não acionaram IA nem TTS;
- duas respostas reais do modelo principal foram convertidas em voz;
- geração do TTS em `455 ms` e `377 ms`;
- reprodução em `7699 ms` e `7072 ms`;
- o usuário confirmou que ouviu as duas respostas;
- um comentário simultâneo foi recebido e ignorado com segurança por `aiBusy`;
- uma nova interação foi processada após a primeira reprodução, confirmando continuidade.

O som permaneceu somente no dispositivo de áudio do PC. Isso é esperado: o MVP 3 gera e reproduz voz localmente, mas ainda não compõe nem envia áudio e vídeo ao TikTok. O tratamento de configuração inválida já é coberto por teste automatizado e retorna erro de TTS sem lançar exceção; a injeção de falha durante LIVE fica registrada como teste de regressão não bloqueante.

A Issue #3 foi encerrada. A limitação de `aiBusy` foi preservada: ainda não há fila.

Pesquisa comparativa: [`research/tts-mvp3.md`](../research/tts-mvp3.md).

### Etapa 4 — Cena visual com personagem
**Status: ESPECIFICADA; IMPLEMENTAÇÃO PENDENTE NA ISSUE #4.**

Decisão para o protótipo:
- usar um personagem original, humanoide e realista com aparência 3D;
- gerar no Flow/Veo uma biblioteca de clipes verticais pré-renderizados;
- tratar os clipes como vídeo 2D, não como modelo 3D controlável em tempo real;
- manter a fala dinâmica no adaptador TTS; os clipes principais devem ser mudos ou ter apenas ambiente;
- aceitar sincronização labial aproximada nesta etapa;
- preservar separação entre controlador de cena, TTS, ativos visuais e transmissão.

Estados iniciais:
- `idle`;
- `listening` ou `thinking`;
- `speaking`;
- `thanks-small-gift`;
- `thanks-special-gift`;
- `celebrate-like-goal`;
- `laugh` ou `surprise`.

Contrato técnico pretendido:

```text
evento TikTok
  → decisão e resposta da IA
  → TTS dinâmico
  → controlador escolhe o estado visual
  → compositor local reproduz o clipe correspondente
  → retorno ao estado idle
```

O primeiro resultado deve ser uma prévia local vertical com transições de estado e áudio sincronizado de forma aceitável. OBS/TikTok LIVE Studio e o envio efetivo do áudio aos espectadores continuam na Etapa 6.

### Etapa 5 — Presentes e prioridades
Adicionar eventos de presentes e regras de prioridade após validar disponibilidade e confiabilidade técnica.

### Etapa 6 — Live real
Rodar o fluxo completo em ambiente real e medir estabilidade e qualidade da experiência.

## Princípios

- manter os componentes desacoplados sempre que isso não aumentar desnecessariamente a complexidade;
- evitar escolher arquitetura definitiva antes dos testes;
- registrar falhas e limitações encontradas;
- distinguir claramente protótipo experimental de solução comercial aprovada;
- bibliotecas comunitárias de TikTok podem ser usadas para pesquisa/protótipo, mas não devem ser tratadas automaticamente como API oficial ou arquitetura comercial definitiva.

## Stack

Ainda não definida oficialmente. Node.js + `tiktok-live-connector` seguem como combinação validada para o protótipo de captura, não como arquitetura comercial aprovada. A camada de IA também permanece intercambiável durante a validação.
