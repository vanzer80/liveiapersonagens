# MVP 6 — Interação contínua, voz neural e sincronização labial

Status: **ORQUESTRAÇÃO E ADAPTADOR DE VOZ IMPLEMENTADOS; TESTE REAL E LIP SYNC VERDADEIRO PENDENTES**.

## Objetivo

Transformar a cena já enquadrada no TikTok LIVE Studio em uma apresentação que:

- cumprimente quem chega sem interromper a LIVE a cada entrada;
- responda perguntas iniciadas por `ia` ou `!ia`;
- agradeça presentes;
- faça perguntas curtas quando o chat estiver silencioso;
- nunca reproduza duas falas ao mesmo tempo;
- permita trocar a voz robotizada do Windows por uma voz neural autorizada.

## Política de conversa implementada

| Evento | Prioridade | Comportamento |
|---|---:|---|
| Presente | 100 | agradecimento nominal entra antes dos demais itens pendentes |
| Pergunta `ia`/`!ia` | 80 | resposta da IA é enfileirada; uma pergunta pendente por usuário |
| Entrada | 60 | nomes são agrupados por 10 s; no máximo 3 nomes por fala |
| Curtida | 30 | reservada para marcos, sem narrar cada curtida |
| Abertura | 50 | uma frase três segundos depois da conexão real |
| Silêncio | 10 | uma frase curta após intervalo variável de 30 a 45 s sem atividade |

A fala que já começou não é interrompida. A prioridade escolhe o próximo item. A fila aceita no máximo 12 itens; em saturação, conteúdo de baixa prioridade é descartado antes de conteúdo importante.

Falar “constantemente” não significa falar sem pausa. A regra de silêncio existe para manter movimento sem cobrir comentários, presentes ou respostas.

## Falas editáveis

As falas deixaram de ficar presas no código e agora estão em:

```text
prototypes/tiktok-live-node/config/live-lines.json
```

O arquivo contém:

- `opening`: falas de abertura; uma delas é escolhida a cada execução;
- `ambient`: falas para períodos sem interação.

O programa valida o JSON, remove linhas vazias e repetidas e limita cada texto a 280 caracteres. Se o arquivo estiver ausente ou inválido, usa falas internas e registra o motivo no PowerShell. O relógio da abertura e do silêncio começa apenas depois que `connection.connect()` confirma a sala; assim, o Bob não fala enquanto o conector ainda está aguardando a conta entrar ao vivo.

Configuração opcional no `.env`:

```env
INTERACTION_LINES_FILE=config/live-lines.json
INTERACTION_OPENING_ENABLED=true
INTERACTION_OPENING_DELAY_MS=3000
INTERACTION_AMBIENT_ENABLED=true
INTERACTION_AMBIENT_MIN_SILENCE_MS=30000
INTERACTION_AMBIENT_MAX_SILENCE_MS=45000
```

O intervalo variável evita que a apresentação pareça um cronômetro. Toda fala concluída reinicia o período de silêncio. Atividade do público também reinicia esse período.

## Eventos do TikTok usados

O conector comunitário documenta `MEMBER` para entrada, `CHAT` para comentário e `GIFT` para presente. Presentes do tipo sequência emitem atualizações intermediárias; por isso, o programa espera `repeatEnd=true` antes do agradecimento. Isso evita agradecer duas vezes o mesmo presente.

Fonte técnica: [TikTok-Live-Connector](https://github.com/zerodytrash/TikTok-Live-Connector#message-events). O projeto continua tratando essa dependência como não oficial e sujeita a mudanças no protocolo do TikTok.

## Voz neural

O adaptador `src/tts.js` passou a aceitar:

- `windows-sapi`: fallback local já validado, mas percebido como robotizado;
- `fish-audio`: gera WAV neural pela API e usa o mesmo ciclo de reprodução e cena.

Configuração local, nunca versionada com a chave real:

```env
TTS_ENABLED=true
TTS_PROVIDER=fish-audio
FISH_AUDIO_API_KEY=cole_sua_chave_aqui
FISH_AUDIO_REFERENCE_ID=id_da_voz_autorizada
FISH_AUDIO_MODEL=s2.1-pro-free
FISH_AUDIO_API_URL=https://api.fish.audio/v1/tts
FISH_AUDIO_LATENCY=balanced
```

O endpoint, o campo `reference_id` e o cabeçalho de modelo seguem a [documentação oficial do Fish Audio](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech). A chave fica somente no `.env`. Antes de usar uma voz de personagem em LIVE pública ou comercial, confirmar que a autorização cobre a voz, a plataforma e o tipo de uso.

O guia oficial do Fish Audio orienta criar a chave na área de API, mantê-la secreta e usar o identificador do modelo presente na URL da voz. O adaptador atual usa WAV e aguarda o arquivo completo antes de tocar. A documentação também oferece streaming para reduzir o tempo até a primeira palavra; isso fica como melhoria posterior, depois da validação da voz básica.

## Por que o lip sync atual não pode ficar exato

Os arquivos `idle`, `thinking` e `speaking` são vídeos pré-renderizados. O clipe `speaking` contém uma animação de boca fixa, criada antes de a resposta e o áudio existirem. Os callbacks atuais sincronizam corretamente o **início e o fim do estado falando**, mas não têm como transformar os movimentos internos do vídeo em fonemas da frase nova.

Portanto:

- corrigir atraso melhora a troca `thinking → speaking → idle`;
- redimensionar ou trocar a velocidade do MP4 não produz sincronização silábica;
- voz neural melhora o timbre, mas não corrige a boca por si só.

## Próximo incremento visual recomendado

Para sincronização verdadeira, o compositor deve receber o áudio gerado e controlar formas de boca. O caminho recomendado para o personagem 2D é:

1. preparar uma base do personagem e 6 a 9 bocas transparentes;
2. gerar o áudio antes da fala;
3. extrair marcas temporais de fonemas/visemas;
4. trocar as bocas no navegador durante a reprodução;
5. manter os MP4s atuais como fallback.

O Fish Audio oferece um fluxo com áudio e alinhamento temporal, documentado em [TTS com timestamps](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech-stream-with-timestamps), mas alinhamento de texto não equivale automaticamente a formas de boca. A etapa visual ainda precisa de um mapa de fonema para boca ou de um alinhador dedicado.

## Validação no Windows

1. Atualizar o repositório e executar `npm ci`.
2. Abrir `config/live-lines.json`, revisar as falas e salvar sem remover aspas, vírgulas, colchetes ou chaves.
3. Adicionar a chave e a referência autorizada ao `.env`.
4. Testar somente a voz com `npm run test:tts -- "Oi, pessoal! Bem-vindos à live!"`.
5. Executar `npm run live:bob -- <usuario>`.
6. Manter a cena em branco com a captura da janela do Edge e sem câmera real.
7. Confirmar no mixer do LIVE Studio que o áudio do sistema se movimenta.
8. Iniciar a LIVE e aguardar o PowerShell mostrar `Conectado`; a abertura deve tocar após três segundos.
9. Entrar por outro celular, aguardar a saudação agrupada e enviar duas perguntas `ia`.
10. Permanecer sem comentar por até 45 segundos e confirmar uma fala de ambiente.
11. Confirmar no celular a imagem, a voz neural e a ordem das falas.

O incremento só estará validado quando o som for ouvido no dispositivo do espectador. O áudio ouvido apenas no computador não comprova a transmissão.
