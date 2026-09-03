# Live IA — Personagens Interativos

Plataforma modular para criação de personagens de IA voltados a transmissões ao vivo.

## Estado do projeto

**Fase atual:** protótipo / validação técnica inicial.

O objetivo imediato não é construir um SaaS completo. Primeiro precisamos validar, em etapas, que a experiência funciona tecnicamente e em uma live real.

## Estado dos marcos técnicos

- MVP 1 — captura de eventos: validado em LIVE real.
- MVP 2 — resposta textual com IA: validado em LIVE real e encerrado na Issue #2.
- MVP 3 — TTS local: validado no Windows e integrado em LIVE real; concluído na Issue #3.
- MVP 4 — cena visual com personagem: especificado e aberto na Issue #4.

O protótipo converte a resposta textual em WAV e reproduz o áudio localmente com uma voz instalada no Windows. O teste controlado selecionou `Microsoft Maria Desktop` em `pt-BR`, gerou o áudio em 884 ms e concluiu uma reprodução audível. Em LIVE real, duas respostas foram faladas com geração de 455 ms e 377 ms e reprodução de 7699 ms e 7072 ms. A captura continuou ativa. Essa escolha continua sendo uma hipótese gratuita para validação, não o fornecedor definitivo do produto.

O áudio ouvido somente no PC é o comportamento esperado desta fase: ainda não existe composição audiovisual nem envio da saída do computador ao TikTok. O MVP 4 validará a cena visual local; o roteamento por OBS/TikTok LIVE Studio permanece para a etapa de transmissão completa.

## Ordem de implementação

1. Leitura de comentários/eventos.
2. Resposta textual.
3. TTS.
4. Cena visual com personagem e clipes de reação.
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
- [#3 — MVP 3: TTS local](https://github.com/vanzer80/liveiapersonagens/issues/3) — concluída;
- [#4 — MVP 4: cena visual com clipes Flow/Veo](https://github.com/vanzer80/liveiapersonagens/issues/4) — próxima etapa.
