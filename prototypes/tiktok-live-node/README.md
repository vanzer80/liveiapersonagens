# Protótipo TikTok LIVE — Node.js

Objetivo: validar incrementalmente o fluxo `TikTok LIVE → IA → TTS → cena visual`, sem antecipar transmissão completa ou produto final.

> A captura atual usa uma biblioteca comunitária/não oficial. Ela serve ao protótipo e não representa uma decisão comercial definitiva.

## Estado atual

- **MVP 1 — captura TikTok LIVE:** VALIDADO em LIVE real.
- **MVP 2 — resposta textual com IA:** VALIDADO em LIVE real.
- **MVP 3 — TTS local:** VALIDADO no Windows e em LIVE real com voz pt-BR.
- **MVP 4 — cena visual:** EM IMPLEMENTAÇÃO; o primeiro preview local real do ramo Bob já executou `idle → thinking → speaking → idle` com os três MP4s aprovados e TTS externo.

No MVP 4, o controlador suporta duas variantes (`spongebob` e `influencer`) e os testes isolados da lógica de cena estão aprovados. Para a variante Bob Esponja, a imagem mestre e os três clipes iniciais já foram aprovados no Google Drive oficial:

- `spongebob-idle-v1.mp4`
- `spongebob-thinking-v1.mp4`
- `spongebob-speaking-v1.mp4`

## Primeiro preview local real — 2026-09-03

O usuário executou `npm run preview:spongebob` no Windows com os três ativos reais. A prévia abriu no navegador e os logs registraram:

```text
idle -> thinking -> speaking -> idle
estado_final=idle
```

Medições:

```text
voz=Microsoft Maria Desktop
idioma=pt-BR
geracao_ms=1813
reproducao_ms=12714
speaking_visivel_ms=14083
```

O áudio dos MP4s ficou mutado e o TTS externo foi ouvido no PC. O usuário confirmou que o fluxo funcionou.

### Pendência de sincronização

O smoke test atual usa `SCENE_TTS_LEAD_MS=450` para aproximar o início do `speaking` do áudio. Nesta execução, porém, a geração do TTS levou `1813 ms`. Pelos tempos registrados, o estado visual pode ter começado cerca de `1,36 s` antes da voz. Portanto, o carregamento dos ativos, as transições e o retorno ao `idle` estão validados para o ramo Bob, mas o critério de **início do speaking junto do playback** ainda precisa ser refinado.

O próximo ajuste técnico deve substituir o atraso fixo por sinalização real de início/fim do playback do TTS.

### Qualidade da voz

O usuário descreveu `Microsoft Maria Desktop` como **robotizada**. Isso não invalida o fluxo técnico; `windows-sapi` continua útil como fallback/prova de arquitetura. Depois do ajuste de sincronização, deve ser comparada uma opção neural em PT-BR considerando naturalidade, latência, custo e facilidade de integração.

## Requisitos

- Windows 11 para o teste de voz atual;
- Node.js 20 ou superior;
- npm;
- os três MP4 aprovados do Bob Esponja copiados para `assets/mvp4/`.

## Instalação

No terminal:

```bash
cd C:\liveiapersonagens\prototypes\tiktok-live-node
npm install
```

## Configuração de IA e TTS

O `.env` permanece local e não deve ser enviado ao GitHub. Para o TTS atual:

```env
TTS_ENABLED=true
TTS_PROVIDER=windows-sapi
TTS_VOICE=
TTS_RATE=0
```

Com `TTS_VOICE` vazio, o adaptador prefere uma voz `pt-BR` instalada no Windows.

## Teste controlado do TTS

```bash
npm run test:tts
```

Também é possível fornecer outra frase:

```bash
npm run test:tts -- "Olá, este é outro teste de voz."
```

## MVP 4 — preparar ativos locais

Copie os três arquivos aprovados para:

```text
C:\liveiapersonagens\prototypes\tiktok-live-node\assets\mvp4\
```

A pasta deve ficar assim:

```text
assets\mvp4\
  spongebob-idle-v1.mp4
  spongebob-thinking-v1.mp4
  spongebob-speaking-v1.mp4
```

Os MP4s não são versionados automaticamente pelo fluxo atual do repositório; a fonte oficial desses ativos é o Google Drive do projeto.

## MVP 4 — teste local integrado do Bob Esponja

Execute:

```bash
npm run preview:spongebob
```

O comando:

1. verifica se os três MP4s estão presentes;
2. abre automaticamente uma prévia vertical no navegador em `http://127.0.0.1:3333`;
3. inicia em `idle`;
4. troca para `thinking`, simulando que uma pergunta chegou;
5. inicia o TTS de uma frase de teste;
6. troca para `speaking` usando a temporização provisória atual;
7. mantém o vídeo `speaking` enquanto o TTS reproduz;
8. volta automaticamente ao `idle` quando o TTS termina;
9. deixa a prévia aberta em `idle` até `Ctrl+C`.

O áudio existente dentro dos MP4s fica **mutado no navegador**. A única voz considerada no teste é o TTS externo.

Uma frase diferente pode ser passada diretamente:

```bash
npm run preview:spongebob -- "Oi! Estou respondendo a uma pergunta da live agora."
```

### Ajustes opcionais

```env
SCENE_THINKING_MS=3000
SCENE_TTS_LEAD_MS=450
SCENE_PREVIEW_PORT=3333
```

`SCENE_TTS_LEAD_MS` permanece provisório e será removido/substituído por evento real de playback após a evidência desta execução.

## Executar captura/IA/TTS em TikTok LIVE

```bash
npm start -- nome_do_usuario
```

Comentários iniciados por `!ia` ou `ia` acionam o fluxo de IA. Comentários comuns continuam sendo apenas registrados no terminal.

## Testes automatizados

```bash
npm test
```

A lógica do controlador de cena cobre seleção de variante, transições, estado desconhecido e fallback restrito à mesma família visual.

## Próximos critérios do MVP 4

- substituir a temporização fixa por início/fim reais do playback do TTS;
- repetir o preview e confirmar `speaking` iniciando junto da voz;
- comparar uma alternativa neural PT-BR para reduzir a sensação de voz robotizada;
- gerar/aprovar imagem mestre e três clipes da influencer original;
- validar a mesma arquitetura nas duas variantes antes de transmissão real.
