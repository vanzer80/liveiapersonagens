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
**Status: NÚCLEO VALIDADO EM LIVE REAL em 2026-09-01.**

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
- o protótipo possui modelos alternativos para reduzir impacto quando um modelo gratuito fica indisponível.

Aprendizados desta etapa:
- `openrouter/free` mostrou comportamento variável e chegou a selecionar um modelo de segurança que retornou apenas `User Safety: safe`;
- `qwen/qwen3-30b-a3b:free` ficou indisponível gratuitamente durante o teste de 2026-09-01;
- a disponibilidade de modelos gratuitos pode mudar, então a aplicação não deve depender de um único slug gratuito;
- a escolha atual de OpenRouter e Nemotron continua sendo somente de protótipo e não define arquitetura comercial, fornecedor definitivo ou modelo final.

Pendências de robustez que não bloqueiam o início da próxima etapa:
- observar latência e consistência em uma amostra maior de respostas;
- confirmar em execução real a troca automática para um modelo alternativo quando o principal estiver indisponível;
- continuar registrando mudanças de disponibilidade dos modelos gratuitos.

### Etapa 3 — TTS
Próxima etapa de implementação.

Adicionar voz com foco em:
- transformar a resposta textual validada em áudio;
- baixo custo inicial;
- baixa latência para conversa em LIVE;
- voz adequada ao personagem;
- estabilidade;
- possibilidade futura de troca do provedor.

A primeira validação de TTS deve continuar somente no ambiente local/terminal, sem antecipar avatar ou transmissão completa.

### Etapa 4 — Avatar
Integrar representação visual somente depois que captura, decisão e voz estiverem funcionando.

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
