# Live IA — Personagens Interativos

Plataforma modular para criação de personagens de IA voltados a transmissões ao vivo.

## Estado do projeto

**Fase atual:** protótipo / validação técnica incremental.

O objetivo imediato não é construir um SaaS completo. Primeiro validamos, em etapas, que a experiência funciona tecnicamente e em uma LIVE real.

## Estado dos marcos técnicos

- MVP 1 — captura de eventos: validado em LIVE real.
- MVP 2 — resposta textual com IA: validado em LIVE real e encerrado na Issue #2.
- MVP 3 — TTS: validado no Windows e em LIVE real; concluído na Issue #3.
- MVP 4 — cena visual: ramo Bob Esponja validado localmente com ativos reais e callbacks do TTS; influencer adiada por decisão do usuário.
- MVP 5 — transmissão do Bob: **validado em LIVE real em 04/09/2026**, com imagem e voz recebidas no celular do espectador e respostas dinâmicas consecutivas.
- MVP 6 em `main` — interação/fila, vídeos e voz neural: Fish Audio (PT-BR) validado em LIVE real e adotado como voz dinâmica principal do protótipo; Microsoft Maria/Windows SAPI permanece fallback técnico. O fluxo Rosa/Sandy possui validação ponta a ponta específica em LIVE. Outros cenários continuam sujeitos aos níveis de evidência documentados.

### Trabalho recente ainda não integrado a `main`

`main` **não contém todo o trabalho técnico mais recente**:

- **PR #15 — `feat/mvp6-lip-sync`**: lip sync dinâmico fonema/visema implementado e auditado; teste controlado no Windows aprovado com 160/160 testes, 0 falhas, 17 suítes. O pack visual é provisório e a homologação visual em TikTok LIVE real com espectador permanece pendente. Este código **não está integrado a `main`**.
- **PR #16 — `feat/mvp6-auto-speech`**: revisão das falas automáticas por inatividade, em rascunho e **dependente do PR #15**. Na revisão Linux foram encontrados 205 testes: 204 aprovados, 0 falhas e 1 não executado por depender de Windows/SoundPlayer. Windows com Fish real e homologação em LIVE permanecem pendentes. Este código **não está integrado a `main`**.

A presença de implementação em PR aberto não equivale a funcionalidade existente em `main`, e teste automatizado/Windows não equivale a validação em LIVE real.

## Voz e transmissão validadas

Com Fish Audio, o protótipo gera áudio neural via API e o reproduz no Windows com áudio capturado pelo TikTok LIVE Studio. Na validação de 04/09/2026, três respostas dinâmicas consecutivas chegaram ao celular do espectador. Os valores observados de síntese naquele teste foram 1819, 2047 e 2287 ms; são medições históricas, não SLA nem garantia para versões posteriores.

O comando `npm run live:bob -- <usuario>` inicia a cena vertical, aguarda a conta entrar ao vivo e integra `thinking`, `speaking` e `idle` ao fluxo comentário → IA → TTS. Na configuração validada, o TikTok LIVE Studio captura a janela do navegador e o áudio do sistema.

## Ordem de implementação histórica

1. Leitura de comentários/eventos.
2. Resposta textual.
3. TTS.
4. Cena visual com personagem e clipes de reação.
5. Bob em LIVE real com comentário, imagem e voz.
6. Presentes, fila e prioridades.
7. Produto para testadores.

Essa lista descreve a progressão histórica do protótipo; para estado corrente, use a seção acima e as fontes canônicas.

## Estrutura inicial

```text
liveiapersonagens/
├── README.md
├── CONTRIBUTING.md
├── docs/
├── prototypes/
├── research/
└── tests/
```

## Fontes de verdade e continuidade

O Google Drive do projeto é a fonte canônica para visão do produto, decisões, pendências, aprendizados e escopo consolidado. Consulte principalmente:

- `00 - Documento Mestre - Visão do Produto` — visão e estado consolidado;
- `03 - Registro de Decisões e Pendências` — decisões vigentes e pendências;
- `04 - Aprendizados - Erros e Acertos` — evidências e aprendizados.

O GitHub registra código, testes, documentação técnica operacional, Issues, branches e PRs. Para trabalho não integrado, consulte a branch/commit/PR correspondente; não infira o estado de desenvolvimento apenas a partir de `main`.

## Princípio de desenvolvimento

**Validar antes de construir.** Não antecipar painel SaaS completo, cobrança, marketplace, aplicativo mobile ou arquitetura para escala antes de comprovar as hipóteses necessárias.

## Acompanhamento

- [#8 — MVP 5: Bob Esponja em TikTok LIVE real](https://github.com/vanzer80/liveiapersonagens/issues/8) — marco audiovisual concluído após validação em LIVE real; mantido como histórico.
- [#9 — MVP 6: interação, voz neural e lip sync](https://github.com/vanzer80/liveiapersonagens/issues/9) — acompanhamento técnico atual dos incrementos de interação, voz, vídeos e lip sync.
- [PR #15 — lip sync dinâmico](https://github.com/vanzer80/liveiapersonagens/pull/15) — implementado/testado no Windows; LIVE visual pendente; fora de `main`.
- [PR #16 — falas automáticas](https://github.com/vanzer80/liveiapersonagens/pull/16) — rascunho dependente do #15; revisão Linux aprovada com um teste Windows não executado; Windows/Fish/LIVE pendentes.
- [#17 — experimento de infraestrutura em DigitalOcean](https://github.com/vanzer80/liveiapersonagens/issues/17) — experimento paralelo; não é arquitetura comercial definitiva.

Procedimento/histórico do MVP 5: [`docs/mvp5-live-bob.md`](docs/mvp5-live-bob.md). Retrospectiva do LIVE Studio: [`docs/mvp5-live-studio-retrospective.md`](docs/mvp5-live-studio-retrospective.md).

Interação e voz: [`docs/mvp6-interaction-voice-lipsync.md`](docs/mvp6-interaction-voice-lipsync.md). Piloto dos cinco vídeos: [`docs/mvp6-prerecorded-video-pilot.md`](docs/mvp6-prerecorded-video-pilot.md). Rotações: [`docs/mvp6-live-ambient-rotations.md`](docs/mvp6-live-ambient-rotations.md).
