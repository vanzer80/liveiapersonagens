# Ativos visuais do MVP 4

O MVP 4 possui duas famílias visuais que usam o mesmo controlador e o mesmo TTS.

## Variante A — Bob Esponja licenciado

Os três ativos iniciais foram aprovados para o protótipo em 2026-09-03. Para executar a prévia local, copie do Google Drive oficial para esta pasta exatamente:

- `spongebob-idle-v1.mp4`
- `spongebob-thinking-v1.mp4`
- `spongebob-speaking-v1.mp4`

Depois execute, a partir de `prototypes/tiktok-live-node`:

```bash
npm run preview:spongebob
```

O áudio embutido nos MP4s é mutado na prévia. O TTS externo continua sendo a fonte de voz dinâmica.

## Variante B — influencer virtual original (adiada)

Adiada para uma segunda etapa por decisão do usuário em 2026-09-03. Permanecem pendentes:

- imagem mestre aprovada;
- `influencer-idle-v1.mp4`;
- `influencer-thinking-v1.mp4`;
- `influencer-speaking-v1.mp4`.

Contrato completo, prompts, regras de licença e checklist visual: [`../../../../docs/mvp4-visual-assets.md`](../../../../docs/mvp4-visual-assets.md).

## Regras

- não usar rascunhos reprovados como ativos finais;
- cada família deve preservar sua própria imagem mestre, roupa/visual, cenário, iluminação e enquadramento;
- o fallback permanece dentro da mesma família visual;
- a fala dinâmica vem do TTS externo; qualquer áudio presente nos clipes deve ser mutado/ignorado na integração;
- o usuário informou possuir licença para trabalhar com personagens da franquia Bob Esponja; antes de LIVE pública ou uso comercial, confirmar o escopo aplicável da licença conforme registrado na documentação do projeto.
