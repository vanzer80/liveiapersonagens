# Live IA — Personagens Interativos

Plataforma modular para criação de personagens de IA voltados a transmissões ao vivo.

## Estado do projeto

**Fase atual:** protótipo / validação técnica inicial.

O objetivo imediato não é construir um SaaS completo. Primeiro precisamos validar, em etapas, que a experiência funciona tecnicamente e em uma live real.

## Primeiro marco técnico

Conectar a uma TikTok LIVE de teste e exibir no terminal os eventos disponíveis, começando por:

- comentários;
- identificação do usuário;
- outros eventos públicos disponíveis de forma confiável.

IA de diálogo, TTS e avatar entram somente depois que essa captura estiver validada.

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
│   └── README.md
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
