# Protótipo TikTok LIVE — Node.js

Objetivo: validar incrementalmente o fluxo `TikTok LIVE → IA → TTS → cena visual`, sem antecipar transmissão completa ou produto final.

> A captura atual usa uma biblioteca comunitária/não oficial. Ela serve ao protótipo e não representa uma decisão comercial definitiva.

## Estado atual

- **MVP 1 — captura TikTok LIVE:** VALIDADO em LIVE real.
- **MVP 2 — resposta textual com IA:** VALIDADO em LIVE real.
- **MVP 3 — TTS local:** VALIDADO no Windows e em LIVE real com voz pt-BR.
- **MVP 4 — cena visual:** RAMO BOB VALIDADO localmente; influencer adiada para uma segunda etapa.
- **MVP 5 — Bob em LIVE real:** integração pronta no código; confirmação audiovisual por um espectador pendente.

O controlador ainda suporta duas variantes, mas a direção vigente prioriza `spongebob`. A imagem mestre e os três clipes iniciais do Bob foram aprovados no Google Drive oficial:

- `spongebob-idle-v1.mp4`
- `spongebob-thinking-v1.mp4`
- `spongebob-speaking-v1.mp4`

## Previews locais reais — 2026-09-03

No primeiro teste real, o fluxo completo funcionou e retornou ao `idle`, mas o atraso fixo de 450 ms mostrou-se inadequado porque a geração do TTS levou 1813 ms.

No segundo teste, a transição passou a usar o sinal real de playback e registrou:

```text
sync_mode=tts-playback-signal
speaking_inicio_apos_playback_ms=12
speaking_visivel_ms=12484
voz=Microsoft Maria Desktop
idioma=pt-BR
geracao_ms=1252
reproducao_ms=12493
estado_final=idle
```

O resultado de **12 ms** é aceitável para a sincronização aproximada prevista no MVP. O atraso fixo foi descartado.

### Contrato de sincronização atual

Após essa evidência, o adaptador `tts.js` passou a expor callbacks opcionais:

- `onPlaybackStart`: chamado após a geração do áudio e imediatamente antes de iniciar a reprodução;
- `onPlaybackEnd`: chamado após a reprodução terminar.

O `scene-smoke.js` usa esses callbacks para controlar `speaking`, sem interceptar mensagens de log. O teste final no Windows registrou:

```text
[TESTE CENA] sync_mode=tts-playback-callback
[TESTE CENA] speaking_inicio_apos_callback_ms=1
[TESTE CENA] speaking_visivel_ms=12457
[TESTE CENA] estado_final=idle
```

Os callbacks são opcionais para manter compatibilidade com chamadas anteriores de `speakText`.

O ciclo local do Bob está concluído para o protótipo e não deve ser repetido por rotina.

### Qualidade da voz

O usuário descreveu `Microsoft Maria Desktop` como **robotizada**. Isso não invalida o fluxo técnico; `windows-sapi` continua útil como fallback/prova de arquitetura. A próxima comparação de TTS deve usar uma opção neural em PT-BR considerando naturalidade, latência, custo e facilidade de integração.

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
5. gera o TTS de uma frase de teste;
6. usa `onPlaybackStart` para trocar para `speaking`;
7. mantém o vídeo `speaking` durante a reprodução;
8. usa o fim do playback para concluir o ciclo e volta automaticamente ao `idle`;
9. deixa a prévia aberta em `idle` até `Ctrl+C`.

O áudio existente dentro dos MP4s fica **mutado no navegador**. A única voz considerada no teste é o TTS externo.

Uma frase diferente pode ser passada diretamente:

```bash
npm run preview:spongebob -- "Oi! Estou respondendo a uma pergunta da live agora."
```

### Ajustes opcionais

```env
SCENE_THINKING_MS=3000
SCENE_PREVIEW_PORT=3333
```

`SCENE_TTS_LEAD_MS` não é mais usado.

## Executar captura/IA/TTS em TikTok LIVE

```bash
npm start -- nome_do_usuario
```

Comentários iniciados por `!ia` ou `ia` acionam o fluxo de IA. Comentários comuns continuam sendo apenas registrados no terminal.

## Executar o Bob integrado à LIVE

Use o comando único:

```bash
npm run live:bob -- nome_do_usuario
```

O comando:

1. ativa a variante Bob, o TTS e uma persona curta de LIVE;
2. verifica os três MP4s aprovados;
3. abre `http://127.0.0.1:3333` em `idle`;
4. tenta conectar ao TikTok a cada cinco segundos enquanto a conta ainda não estiver ao vivo;
5. entra em `thinking` quando um comentário `ia`/`!ia` é selecionado;
6. entra em `speaking` no callback real de início do TTS;
7. retorna a `idle` ao terminar ou se ocorrer falha.

Na versão testada do TikTok LIVE Studio, `Adicionar link` rejeitou a URL HTTP local. Use captura de janela, selecione a prévia do Edge, escolha a cena `Câmera em tela cheia` e mantenha o modo `Ajustar`. A cena `4:3 | Câmera abaixo` deixa a fonte em um espaço horizontal; `Preencher` corta o Bob e `Expandir` deforma a imagem. Ative o áudio do sistema no mixer para que o TTS chegue aos espectadores.

A transmissão só estará validada depois que outro dispositivo confirmar imagem e voz em LIVE real. Procedimento: [`../../docs/mvp5-live-bob.md`](../../docs/mvp5-live-bob.md). Erros e acertos da primeira configuração: [`../../docs/mvp5-live-studio-retrospective.md`](../../docs/mvp5-live-studio-retrospective.md).

## Testes automatizados

```bash
npm test
```

A lógica do controlador de cena cobre seleção de variante, transições, estado desconhecido e fallback restrito à mesma família visual.

## Próximos critérios

- executar a transmissão pelo TikTok LIVE Studio;
- confirmar imagem e voz em outro celular;
- validar duas respostas consecutivas;
- depois implementar agradecimento de presentes, fila e prioridade;
- comparar TTS neural e retomar a influencer em etapa posterior.
