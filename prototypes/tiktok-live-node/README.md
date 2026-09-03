# Protótipo TikTok LIVE — Node.js

Objetivo: validar incrementalmente o fluxo `TikTok LIVE → IA → TTS → cena visual`, sem antecipar transmissão completa ou produto final.

> A captura atual usa uma biblioteca comunitária/não oficial. Ela serve ao protótipo e não representa uma decisão comercial definitiva.

## Estado atual

- **MVP 1 — captura TikTok LIVE:** VALIDADO em LIVE real.
- **MVP 2 — resposta textual com IA:** VALIDADO em LIVE real.
- **MVP 3 — TTS local:** VALIDADO no Windows e em LIVE real com voz pt-BR.
- **MVP 4 — cena visual:** EM IMPLEMENTAÇÃO.

No MVP 4, o controlador suporta duas variantes (`spongebob` e `influencer`) e os testes isolados da lógica de cena estão aprovados. Para a variante Bob Esponja, a imagem mestre e os três clipes iniciais já foram aprovados no Google Drive oficial:

- `spongebob-idle-v1.mp4`
- `spongebob-thinking-v1.mp4`
- `spongebob-speaking-v1.mp4`

O próximo critério é executar a prévia local real `idle → thinking → speaking + TTS → idle`.

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
6. troca aproximadamente junto do áudio para `speaking`;
7. mantém o vídeo `speaking` enquanto o TTS reproduz;
8. volta automaticamente ao `idle` quando o TTS termina;
9. deixa a prévia aberta em `idle` até `Ctrl+C`.

O áudio existente dentro dos MP4s fica **mutado no navegador**. A única voz que deve ser considerada no teste é o TTS externo.

Uma frase diferente pode ser passada diretamente:

```bash
npm run preview:spongebob -- "Oi! Estou respondendo a uma pergunta da live agora."
```

### Ajustes opcionais

Se necessário, os tempos podem ser ajustados por variáveis de ambiente:

```env
SCENE_THINKING_MS=3000
SCENE_TTS_LEAD_MS=450
SCENE_PREVIEW_PORT=3333
```

`SCENE_TTS_LEAD_MS` é provisório: usa como referência as latências de geração observadas no TTS já validado para aproximar o início do `speaking` do início da reprodução da voz. Se o teste mostrar diferença perceptível, esse ponto será refinado antes da integração em LIVE real.

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

## Critério de aprovação do teste local do MVP 4

Considerar o primeiro teste integrado do Bob aprovado quando for observado:

- `idle` reproduzindo normalmente no início;
- mudança clara para `thinking`;
- mudança para `speaking` próxima do início da voz;
- MP4s sem áudio próprio audível;
- `speaking` permanecendo visualmente ativo durante o TTS;
- retorno automático para `idle` ao fim da voz;
- nenhuma quebra do processo caso um ativo esteja ausente — o controlador deve tratar o erro/fallback de forma segura.

Somente depois desse teste local deve ser ligada a cena visual ao fluxo real de comentários da TikTok LIVE.
