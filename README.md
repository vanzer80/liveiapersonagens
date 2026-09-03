# Live IA — Personagens Interativos

Plataforma modular para criação de personagens de IA voltados a transmissões ao vivo.

## Estado do projeto

**Fase atual:** protótipo / validação técnica inicial.

O objetivo imediato não é construir um SaaS completo. Primeiro precisamos validar, em etapas, que a experiência funciona tecnicamente e em uma live real.

## Estado dos marcos técnicos

- MVP 1 — captura de eventos: validado em LIVE real.
- MVP 2 — resposta textual com IA: validado em LIVE real e encerrado na Issue #2.
- MVP 3 — TTS local: validado no Windows e integrado em LIVE real; concluído na Issue #3.
- MVP 4 — cena visual: ramo Bob Esponja validado localmente com ativos reais e callbacks do TTS; influencer adiada por decisão do usuário.
- MVP 5 — transmissão do Bob em LIVE real: integração implementada no protótipo; validação audiovisual por espectador ainda pendente.
- MVP 6 — interação contínua e voz neural: orquestração implementada; modo experimental `AI_RESPOND_ALL` (responder a comentários sem o gatilho `ia`) com validação inicial positiva em LIVE real em 03/09/2026, ainda sem teste sob carga; piloto híbrido com cinco vídeos produzidos, validados pelo usuário e organizados no Drive oficial; gatilhos e teste integrado ainda pendentes.

O protótipo converte a resposta textual em WAV e reproduz o áudio localmente com uma voz instalada no Windows. O teste controlado selecionou `Microsoft Maria Desktop` em `pt-BR`, gerou o áudio em 884 ms e concluiu uma reprodução audível. Em LIVE real, duas respostas foram faladas com geração de 455 ms e 377 ms e reprodução de 7699 ms e 7072 ms. A captura continuou ativa. Essa escolha continua sendo uma hipótese gratuita para validação, não o fornecedor definitivo do produto.

O comando `npm run live:bob -- <usuario>` inicia a cena vertical, aguarda a conta entrar ao vivo e integra `thinking`, `speaking` e `idle` ao fluxo comentário → IA → TTS. O TikTok LIVE Studio deve capturar a URL local e o áudio do sistema. Essa saída ainda precisa ser confirmada no celular de um espectador antes de ser declarada validada.

## Ordem de implementação

1. Leitura de comentários/eventos.
2. Resposta textual.
3. TTS.
4. Cena visual com personagem e clipes de reação.
5. Bob em LIVE real com comentário, imagem e voz.
6. Presentes, fila e prioridades.
7. Produto para testadores.

## Estrutura inicial

```text
liveiapersonagens/
├── README.md
├── CONTRIBUTING.md
├── docs/
│   ├── README.md
│   └── technical-plan.md
├── prototypes/
│   └── README.md
├── research/
│   ├── README.md
│   └── tts-mvp3.md
└── tests/
    └── README.md
```

## Fonte oficial de verdade

O Google Drive do projeto é a memória persistente e a fonte oficial para visão de produto, decisões, pendências, arquitetura conceitual, pesquisa e escopo do MVP.

O GitHub deve registrar principalmente código, testes, experimentos técnicos, issues e histórico de implementação. Nenhuma hipótese técnica deve ser tratada como decisão definitiva apenas por aparecer no código.

## Princípio de desenvolvimento

**Validar antes de construir.** Não antecipar painel SaaS completo, cobrança, marketplace, aplicativo mobile ou arquitetura para escala antes de comprovar o fluxo básico.

## Repositório

`vanzer80/liveiapersonagens`

Issues de validação:

- [#2 — MVP 2: resposta textual](https://github.com/vanzer80/liveiapersonagens/issues/2) — concluída;
- [#3 — MVP 3: TTS local](https://github.com/vanzer80/liveiapersonagens/issues/3) — concluída;
- [#4 — MVP 4: cena visual com clipes Flow/Veo](https://github.com/vanzer80/liveiapersonagens/issues/4) — concluída para o ramo Bob; influencer adiada;
- [#8 — MVP 5: Bob Esponja em TikTok LIVE real](https://github.com/vanzer80/liveiapersonagens/issues/8) — etapa atual.
- [#9 — MVP 6: interação, voz neural e lip sync](https://github.com/vanzer80/liveiapersonagens/issues/9) — orquestração pronta; cinco vídeos do piloto organizados; gatilhos e validação integrada pendentes.

Procedimento da etapa atual: [`docs/mvp5-live-bob.md`](docs/mvp5-live-bob.md). Retrospectiva de erros e acertos na configuração do LIVE Studio: [`docs/mvp5-live-studio-retrospective.md`](docs/mvp5-live-studio-retrospective.md).

Interação e voz: [`docs/mvp6-interaction-voice-lipsync.md`](docs/mvp6-interaction-voice-lipsync.md). Piloto dos cinco vídeos acionáveis: [`docs/mvp6-prerecorded-video-pilot.md`](docs/mvp6-prerecorded-video-pilot.md).
