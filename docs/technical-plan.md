# Plano técnico inicial

## Objetivo

Validar o fluxo técnico em etapas, começando pela captura de eventos de uma TikTok LIVE.

## Sequência de validação

### Etapa 1 — Captura de eventos
Critério de sucesso inicial:
- conectar a uma LIVE de teste;
- receber comentários;
- exibir nome/identificação disponível do usuário;
- registrar eventos no terminal;
- observar estabilidade, desconexões e reconexões.

### Etapa 2 — Resposta textual
Somente após a Etapa 1 estar validada:
- selecionar eventos relevantes;
- gerar resposta coerente com uma persona;
- evitar resposta mecânica a todo comentário;
- registrar entrada, decisão e saída para diagnóstico.

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

Ainda não definida oficialmente. A escolha deve ser feita com base no primeiro experimento de captura, priorizando simplicidade, custo baixo, qualidade das bibliotecas disponíveis e facilidade de manutenção.
