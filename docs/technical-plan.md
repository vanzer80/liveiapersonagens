# Plano técnico inicial

> **DOCUMENTO HISTÓRICO/BASE.** Este arquivo preserva o plano técnico inicial e a evolução das primeiras validações. Trechos que usam “status”, “pendente”, “próxima etapa” ou descrevem provedores/fluxos como atuais refletem o momento em que foram registrados e não devem ser usados isoladamente como estado corrente. Para o estado vigente, consulte o README, o Google Drive (`00 - Documento Mestre - Visão do Produto` e `03 - Registro de Decisões e Pendências`) e, para trabalho ainda não integrado, os PRs/branches correspondentes.

## Estado vigente resumido — 2026-09-06

- MVP 5 audiovisual: **validado em TikTok LIVE real em 04/09/2026**, com imagem e voz recebidas pelo espectador e respostas dinâmicas consecutivas.
- Fish Audio: **voz dinâmica principal do protótipo**, validada em LIVE real; Microsoft Maria/Windows SAPI permanece fallback técnico reversível.
- `main`: contém a base já integrada e validada correspondente ao commit `94ddacf` antes desta reconciliação documental, acrescida apenas de correções documentais desta tarefa.
- PR #15 (`feat/mvp6-lip-sync`): lip sync dinâmico implementado e testado no Windows; **não integrado a main**; homologação visual em LIVE real pendente.
- PR #16 (`feat/mvp6-auto-speech`): falas automáticas revisadas; **não integrado a main**; rascunho com base no PR #15; revisão Linux com 205 testes encontrados, 204 aprovados, 0 falhas e 1 não executado por depender de Windows/SoundPlayer; Windows/Fish real/LIVE pendentes.

A sequência abaixo permanece útil como histórico de validação e referência de arquitetura do protótipo.

## Objetivo

Validar o fluxo técnico em etapas, começando pela captura de eventos de uma TikTok LIVE.

## Sequência de validação histórica

### Etapa 1 — Captura de eventos
**Status histórico: VALIDADA NO PROTÓTIPO REAL em 2026-09-01.**

Validado:
- conexão a uma LIVE de teste;
- recebimento de comentários em tempo real;
- identificação disponível do usuário;
- registro dos eventos no terminal;
- encerramento e nova conexão manual reproduzíveis no ambiente testado.

Aprendizado relevante: na versão testada do conector, o texto do comentário apareceu no campo `content`; o protótipo mantém fallback entre campos possíveis em vez de assumir um campo fixo.

### Etapa 2 — Resposta textual
**Status histórico: VALIDADA EM LIVE REAL.**

Foram validados seleção de comentários, resposta textual, fallback de modelo, continuidade da captura e medição de latência. A escolha de OpenRouter/modelos gratuitos permanece de protótipo e não define fornecedor comercial definitivo.

### Etapa 3 — TTS
**Status histórico: VALIDADA NO WINDOWS E EM LIVE REAL.**

O primeiro adaptador utilizou Windows SAPI/Microsoft Maria para provar o fluxo. Posteriormente, Fish Audio foi integrado, corrigido para compatibilidade com o SoundPlayer do Windows e validado em LIVE real em 04/09/2026. Fish Audio passou a ser a voz dinâmica principal do protótipo; Maria permanece fallback.

Pesquisa comparativa histórica: [`research/tts-mvp3.md`](../research/tts-mvp3.md).

### Etapa 4 — Cena visual com personagem
**Status histórico: RAMO BOB VALIDADO LOCALMENTE; INFLUENCER ADIADA.**

A biblioteca visual do Bob usa clipes pré-renderizados para estados como `idle`, `thinking` e `speaking`, controlados por eventos/callbacks do TTS. O fluxo local e o retorno a `idle` foram validados no Windows.

### Etapa 5 — Bob em LIVE real
**Status atual do marco: VALIDADO EM LIVE REAL em 04/09/2026.**

A composição do TikTok LIVE Studio, imagem no celular do espectador e áudio dinâmico foram confirmados. O documento histórico do procedimento permanece em [`mvp5-live-bob.md`](mvp5-live-bob.md).

### Etapa 6 — Interação, voz, vídeos e lip sync

Parte desta etapa está em `main`; parte está em PRs abertos:

- fila/prioridades, vídeos e voz neural possuem implementações e validações específicas já integradas;
- Fish Audio está validado em LIVE real;
- Rosa/Sandy possui validação ponta a ponta específica em LIVE;
- lip sync fonema/visema está no PR #15, testado no Windows e ainda sem homologação visual em LIVE;
- falas automáticas revisadas estão no PR #16, dependem do #15 e ainda aguardam Windows/Fish real/LIVE.

Plano técnico de interação/voz: [`mvp6-interaction-voice-lipsync.md`](mvp6-interaction-voice-lipsync.md).

## Princípios

- manter os componentes desacoplados sempre que isso não aumentar desnecessariamente a complexidade;
- evitar escolher arquitetura definitiva antes dos testes;
- registrar falhas e limitações encontradas;
- distinguir claramente protótipo experimental de solução comercial aprovada;
- bibliotecas comunitárias de TikTok podem ser usadas para pesquisa/protótipo, mas não devem ser tratadas automaticamente como API oficial ou arquitetura comercial definitiva;
- teste automatizado, Linux, Windows e LIVE real são níveis de evidência distintos.

## Stack

Ainda não definida oficialmente. Node.js + `tiktok-live-connector` seguem como combinação validada para o protótipo de captura, não como arquitetura comercial aprovada. A camada de IA e TTS permanecem substituíveis por configuração.
