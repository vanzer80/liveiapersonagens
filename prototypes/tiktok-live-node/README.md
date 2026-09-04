# Protótipo TikTok LIVE — Node.js

Objetivo: validar incrementalmente o fluxo `TikTok LIVE → IA → TTS → cena visual`, sem antecipar transmissão completa ou produto final.

> A captura atual usa uma biblioteca comunitária/não oficial. Ela serve ao protótipo e não representa uma decisão comercial definitiva.

## Estado atual

- **MVP 1 — captura TikTok LIVE:** VALIDADO em LIVE real.
- **MVP 2 — resposta textual com IA:** VALIDADO em LIVE real.
- **MVP 3 — TTS local:** VALIDADO no Windows e em LIVE real com voz pt-BR.
- **MVP 4 — cena visual:** RAMO BOB VALIDADO localmente; influencer adiada para uma segunda etapa.
- **MVP 5 — Bob em LIVE real:** composição visual funcionou no LIVE Studio; confirmação do áudio por um espectador ainda pendente.
- **MVP 6 — interação e voz neural:** fila, boas-vindas, presentes, fala de ambiente e adaptador Fish Audio implementados; validação real pendente.
- **MVP 6 — vídeos acionáveis:** cinco clipes com fala embutida, gatilhos por palavra, cooldown e fila integrados; testados localmente no Windows, validação em LIVE real pendente.

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

O usuário descreveu `Microsoft Maria Desktop` como **robotizada**. Ela permanece como fallback. O protótipo agora também aceita `fish-audio`, com chave e referência de voz mantidas somente no `.env`. A API neural ainda precisa ser validada no Windows e recebida por outro celular antes de substituir o fallback.

O clipe `speaking` sincroniza o começo e o fim da fala, mas sua boca foi pré-renderizada e não conhece os fonemas do TTS. Sincronização labial verdadeira exigirá bocas controláveis e marcas temporais; detalhes em [`../../docs/mvp6-interaction-voice-lipsync.md`](../../docs/mvp6-interaction-voice-lipsync.md).

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

Para testar uma voz neural autorizada pelo Fish Audio:

```env
TTS_PROVIDER=fish-audio
FISH_AUDIO_API_KEY=cole_sua_chave_aqui
FISH_AUDIO_REFERENCE_ID=id_da_voz_autorizada
FISH_AUDIO_MODEL=s2.1-pro-free
FISH_AUDIO_LATENCY=balanced
```

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

### Modo experimental: responder a todos os comentários

Para o personagem responder a **qualquer** comentário, sem exigir o gatilho, defina no `.env`:

```env
AI_RESPOND_ALL=true
```

Nesse modo, todo comentário com conteúdo real vira uma resposta da IA (comentários vazios ou só de emoji/pontuação são ignorados). O gatilho `AI_TRIGGER` continua funcionando como padrão quando `AI_RESPOND_ALL=false`.

> **Experimento não validado (HIPÓTESE).** A fala é serial: uma voz por vez, com ~8 a 12 s por resposta. Em chat movimentado, a fila (máx. 12 itens) acumula atraso e o personagem passa a responder comentários antigos. Presentes e a regra de uma pergunta pendente por usuário continuam ativos. Só uma LIVE real confirma se esse ritmo funciona; se atrapalhar, o próximo passo é uma seleção que priorize o comentário mais recente/relevante.

## MVP 6 — cinco vídeos acionáveis por comentário

Cinco clipes pré-gravados com a fala **já embutida** respondem a temas repetidos, sem gastar IA nem TTS.

| Vídeo | Aciona com |
|---|---|
| `bob-boas-vindas-v1.mp4` | oi, olá, cheguei, primeira vez, bom dia, boa tarde, boa noite |
| `bob-hamburguer-v1.mp4` | hambúrguer, hamburguer, siri cascudo, sanduíche, lanche |
| `bob-fenda-biquini-v1.mp4` | fenda do biquíni, fenda do biquini, fundo do mar |
| `bob-patrick-v1.mp4` | patrick, estrela do mar, estrela-do-mar |
| `bob-convite-ia-v1.mp4` | como perguntar, como falar com você, como faço uma pergunta |

Copie os cinco MP4s do Google Drive para `assets\mvp6\`. Eles **não** são versionados no Git.

As palavras podem ser editadas sem programar:

```powershell
notepad .\config\video-triggers.json
```

### Regras aplicadas

- comparação em minúsculas e sem acento (`HAMBÚRGUER` = `hamburguer`);
- só casa **palavra ou expressão inteira** — `hamburgueria` não aciona o vídeo do hambúrguer;
- **um comentário aciona no máximo um vídeo**, escolhendo a expressão mais específica;
- **cooldown de 60 segundos por vídeo**, contado só quando ele realmente entra na fila;
- `ia` e `!ia` continuam reservados para a IA: `ia o patrick é legal?` gera resposta dinâmica, **não** o vídeo;
- com `AI_RESPOND_ALL=true`, um comentário que aciona vídeo **não** gera também resposta de IA;
- os clipes tocam com o **áudio do próprio MP4**, uma única vez e sem TTS junto;
- o retorno ao `idle` usa o fim **real** do vídeo, não um tempo fixo.

### Testar sem abrir uma LIVE

```bash
npm run test:videos
```

Lista os cinco vídeos e diz quais estão presentes. Para acionar um deles:

```bash
npm run test:videos -- patrick
```

O comando abre a prévia, fica em `idle`, toca o clipe escolhido, espera o fim real e volta para `idle`.

### Ajustes opcionais

```env
VIDEO_TRIGGERS_ENABLED=true
VIDEO_TRIGGERS_FILE=config/video-triggers.json
VIDEO_ASSETS_DIRECTORY=assets/mvp6
VIDEO_TRIGGER_COOLDOWN_SECONDS=60
VIDEO_AMBIENT_ENABLED=false
```

O comando `npm run live:bob` já ativa os vídeos automaticamente.

> **Áudio:** Edge e Chrome bloqueiam vídeo com som sem um clique do usuário. Por isso a prévia é aberta em modo aplicativo com a política de autoplay liberada e um perfil próprio. Se o som não sair, clique uma vez na janela da prévia.

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
7. retorna a `idle` ao terminar ou se ocorrer falha;
8. agrupa entradas por 10 segundos e pronuncia até três nomes;
9. enfileira perguntas, boas-vindas e presentes por prioridade;
10. depois que a conexão for confirmada, faz uma abertura após 3 segundos;
11. após um intervalo variável de 30 a 45 segundos sem atividade, usa uma frase curta para movimentar o chat;
12. lê as falas do arquivo `config/live-lines.json`, que pode ser editado sem alterar o código;
13. em presentes enviados em sequência, agradece somente quando a sequência termina.

### Personalizar as falas sem programar

Abra no Bloco de Notas:

```powershell
notepad .\config\live-lines.json
```

O arquivo tem duas listas:

- `opening`: uma das frases, escolhida a cada execução, é dita três segundos depois de o PowerShell mostrar `Conectado`;
- `ambient`: frases percorridas em ordem quando o chat fica silencioso por 30 a 45 segundos.

Cada frase precisa ficar entre aspas, separada da próxima por vírgula. Não coloque vírgula depois da última frase de cada lista. Salve o arquivo em UTF-8 e mantenha as chaves e os colchetes. Se o JSON estiver inválido, o programa registra um aviso e usa falas internas de segurança.

Os tempos podem ser ajustados somente no `.env`:

```env
INTERACTION_LINES_FILE=config/live-lines.json
INTERACTION_OPENING_ENABLED=true
INTERACTION_OPENING_DELAY_MS=3000
INTERACTION_AMBIENT_ENABLED=true
INTERACTION_AMBIENT_MIN_SILENCE_MS=30000
INTERACTION_AMBIENT_MAX_SILENCE_MS=45000
```

Valores menores que 10 segundos para falas de ambiente são limitados pelo programa para evitar fala excessiva. Entradas, perguntas e presentes continuam tendo prioridade sobre as frases de ambiente.

Na versão testada do TikTok LIVE Studio, `Adicionar link` rejeitou a URL HTTP local. Use captura de janela, selecione a prévia do Edge, escolha uma cena vertical **em branco** e mantenha o modo `Ajustar`. O layout `Câmera em tela cheia` enquadrou o vídeo, mas exigiu uma câmera visível ao iniciar a LIVE; a cena em branco eliminou essa exigência e manteve apenas o personagem. A cena `4:3 | Câmera abaixo` deixa a fonte em um espaço horizontal; `Preencher` corta o Bob e `Expandir` deforma a imagem. Ative o áudio do sistema no mixer para que o TTS chegue aos espectadores.

A transmissão só estará validada depois que outro dispositivo confirmar imagem e voz em LIVE real. Procedimento: [`../../docs/mvp5-live-bob.md`](../../docs/mvp5-live-bob.md). Erros e acertos da primeira configuração: [`../../docs/mvp5-live-studio-retrospective.md`](../../docs/mvp5-live-studio-retrospective.md).

## Testes automatizados

```bash
npm test
```

A lógica do controlador de cena cobre seleção de variante, transições, estado desconhecido e fallback restrito à mesma família visual.

## Próximos critérios

- confirmar a voz Fish Audio primeiro no computador e depois em outro celular;
- validar boas-vindas agrupadas, presente e duas perguntas consecutivas;
- criar os ativos de boca para lip sync verdadeiro;
- retomar a influencer somente em etapa posterior.
