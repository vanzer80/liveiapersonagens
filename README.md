# Live IA — Personagens Interativos

Plataforma modular para criação de personagens de IA voltados a transmissões ao vivo.

## Estado do projeto

**Fase atual:** protótipo / validação técnica inicial.

O objetivo imediato não é construir um SaaS completo. Primeiro precisamos validar, em etapas, que a experiência funciona tecnicamente e em uma live real.

## Estado dos marcos técnicos

- MVP 1 — captura de eventos: validado em LIVE real.
- MVP 2 — resposta textual com IA: validado em LIVE real e encerrado na Issue #2.
- MVP 3 — TTS local: implementação inicial disponível; validação auditiva no Windows e em LIVE real pendente na Issue #3.

O protótipo atual converte a resposta textual em WAV e reproduz o áudio localmente com uma voz instalada no Windows. Essa escolha é apenas uma hipótese gratuita para validação, não o fornecedor definitivo do produto.

## Ordem de implementação

1. Leitura de comentários/eventos.
2. Resposta textual.
3. TTS.
4. Avatar.
5. Presentes e prioridades.
6. Live real.
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
- [#3 — MVP 3: TTS local](https://github.com/vanzer80/liveiapersonagens/issues/3) — aberta até o teste real no Windows.
