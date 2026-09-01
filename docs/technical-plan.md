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
**Status: EM TESTE COM FLUXO BÁSICO FUNCIONANDO.**

Objetivos desta etapa:
- selecionar eventos relevantes;
- gerar resposta coerente com uma persona;
- evitar resposta mecânica a todo comentário;
- registrar entrada, decisão e saída para diagnóstico.

Estado do teste:
- gatilho temporário `!ia` ou `ia` seleciona o comentário para IA;
- comentário real já percorreu TikTok → captura → OpenRouter → resposta textual válida no terminal;
- resposta continua somente no terminal nesta etapa; não há escrita automática no chat do TikTok;
- provedor/modelo ficam configuráveis;
- `openrouter/free` mostrou comportamento variável porque pode selecionar modelos gratuitos diferentes, inclusive um modelo de segurança que retornou apenas `User Safety: safe`;
- hipótese atual de revalidação: fixar `qwen/qwen3-30b-a3b:free` para tornar qualidade e latência mais reproduzíveis;
- esta escolha é somente de protótipo e não define arquitetura comercial, fornecedor definitivo ou modelo final.

Antes de encerrar a Etapa 2, revalidar:
- algumas respostas reais com o modelo específico;
- comentário comum sem chamada à IA;
- erro do provedor sem derrubar a conexão da LIVE;
- latência e consistência suficientes para então avançar a TTS.

### Etapa 3 — TTS
Adicionar voz com foco em:
- baixo custo inicial;
- latência aceitável;
- estabilidade;
- possibilidade futura de troca do provedor.

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
