# MVP 4 — Ativos visuais

Status: **EM IMPLEMENTAÇÃO**.

O MVP 4 compara duas variantes visuais usando o mesmo pipeline técnico, controlador de estados e TTS:

- **Variante A — Bob Esponja licenciado**, conforme licença informada pelo usuário; o escopo contratual ainda deve ser confirmado antes de LIVE pública/uso comercial.
- **Variante B — influencer virtual feminina original**, sem semelhança intencional com celebridade ou influenciadora real.

A especificação anterior de um host masculino original foi substituída por este teste comparativo.

## Objetivo do MVP 4

Validar se uma biblioteca pequena de clipes pré-renderizados consegue representar `idle`, `thinking` e `speaking`, reagir ao TTS e voltar de forma segura ao `idle` antes de qualquer avatar 3D em tempo real ou transmissão completa.

## Variante A — Bob Esponja

### Imagem mestre

A imagem mestre oficial foi aprovada em 2026-09-03 e está no Google Drive como:

`mvp4-spongebob-master-v1-approved.jpeg`

Todos os clipes devem preservar a mesma identidade, proporções, rosto, olhos, dentes, roupa, cores, cenário, iluminação, enquadramento e câmera.

### Ativos aprovados

- `spongebob-idle-v1.mp4` — aprovado para o protótipo;
- `spongebob-thinking-v1.mp4` — aprovado para o protótipo;
- `spongebob-speaking-v1.mp4` — aprovado para o protótipo.

O áudio embutido dos MP4s deve ser mutado/ignorado durante a integração. A fala dinâmica é responsabilidade do TTS externo.

### Primeiro preview local real

Em 2026-09-03, o usuário executou `npm run preview:spongebob` no Windows com os três ativos reais. O navegador abriu a prévia local e o fluxo registrou:

```text
idle -> thinking -> speaking -> idle
estado_final=idle
```

Medições do TTS:

```text
voz=Microsoft Maria Desktop
idioma=pt-BR
geracao_ms=1813
reproducao_ms=12714
speaking_visivel_ms=14083
```

O usuário confirmou funcionamento e voz audível no PC.

### Sincronização

A primeira versão usou atraso fixo de 450 ms antes de entrar em `speaking`. Como a geração real do TTS levou 1813 ms, o visual podia antecipar o áudio em cerca de 1,36 s.

O smoke test foi atualizado para observar o sinal de início da reprodução do TTS e só então trocar para `speaking`. Esse ajuste é provisório e precisa ser validado novamente no Windows. O contrato definitivo deve usar evento/callback explícito no adaptador TTS, sem depender de logs.

### Qualidade de voz

O usuário descreveu `Microsoft Maria Desktop` como robotizada. Essa voz continua suficiente como fallback/prova técnica, mas uma alternativa neural pt-BR deve ser comparada depois da sincronização, considerando naturalidade, latência, custo e integração.

## Variante B — influencer virtual original

### Direção visual

- adulta, aproximadamente 25–30 anos;
- aparência brasileira/latina;
- atraente de forma natural e elegante;
- olhos castanhos;
- cabelo castanho longo e levemente ondulado;
- maquiagem natural;
- expressão confiante, amigável e inteligente;
- proporções humanas realistas;
- sem semelhança intencional com celebridades ou influenciadoras reais;
- top neutro elegante + jaqueta/blazer casual;
- estúdio contemporâneo de creator/livestream;
- vertical 9:16, medium close-up, câmera fixa.

### Prompt mestre

Create an original adult female virtual influencer, around 25–30 years old, with a beautiful natural Brazilian/Latina appearance, warm brown eyes, long slightly wavy brown hair, elegant natural makeup, confident friendly intelligent expression and realistic human facial proportions. She must not resemble any real celebrity or known influencer. Photorealistic cinematic rendering with subtle high-end digital-human polish. She wears a tasteful modern neutral top with a casual elegant jacket or blazer, no logos or patterns. Medium close-up from mid chest upward, centered, eye-level camera, vertical 9:16. Contemporary creator livestream studio with warm practical lights, elegant blurred background, shallow depth of field, soft flattering key light and subtle rim light. Locked camera, clean composition with room for future overlays. No text, no watermark, no logo, no UI.

### Ativos esperados

- `influencer-idle-v1.mp4`
- `influencer-thinking-v1.mp4`
- `influencer-speaking-v1.mp4`

## Contrato comum dos ativos

- proporção 9:16;
- preferencialmente 1080x1920;
- MP4;
- câmera fixa;
- sem texto/UI incorporada;
- identidade, roupa, cenário e luz estáveis dentro da variante;
- `idle` deve ser loop-friendly;
- `thinking` deve comunicar reflexão sem fala;
- `speaking` deve ter movimento de boca genérico compatível com TTS variável;
- fallback sempre para o `idle` da mesma variante;
- nunca cruzar fallback entre Bob Esponja e influencer.

## Próximos passos

1. repetir `npm run preview:spongebob` com a nova sinalização provisória de playback e confirmar o início do `speaking` junto da voz;
2. evoluir o adaptador TTS para evento/callback explícito de playback;
3. comparar um TTS neural pt-BR para naturalidade;
4. gerar e aprovar a imagem mestre da influencer;
5. gerar `idle`, `thinking` e `speaking` da influencer;
6. executar a mesma prévia local na variante influencer;
7. somente depois comparar as duas variantes em contexto mais próximo da LIVE.
