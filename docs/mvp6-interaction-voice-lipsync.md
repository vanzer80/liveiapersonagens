# MVP 6 — Interação contínua, voz neural e sincronização labial

Status: **ORQUESTRAÇÃO IMPLEMENTADA; CINCO VÍDEOS FIXOS COM GATILHOS E REPRODUÇÃO TESTADOS; SETE MASTERS VISUAIS APROVADOS; VOZ NEURAL FISH AUDIO VALIDADA EM LIVE REAL (04/09/2026); LIP SYNC DINÂMICO FONEMA/VISEMA IMPLEMENTADO E VALIDADO EM TESTE CONTROLADO NO WINDOWS (04/09/2026); TESTE EM LIVE REAL COM ESPECTADOR PENDENTE**.

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
| Vídeo acionado | 70 | clipe pré-gravado com fala embutida; um por comentário, cooldown de 60 s |
| Entrada | 60 | nomes são agrupados por 10 s; no máximo 3 nomes por fala |
| Curtida | 30 | reservada para marcos, sem narrar cada curtida |
| Abertura | 50 | uma frase três segundos depois da conexão real |
| Silêncio | 10 | uma frase curta após intervalo variável de 30 a 45 s sem atividade |

A fala que já começou não é interrompida. A prioridade escolhe o próximo item. A fila aceita no máximo 12 itens; em saturação, conteúdo de baixa prioridade é descartado antes de conteúdo importante.

Falar “constantemente” não significa falar sem pausa. A regra de silêncio existe para manter movimento sem cobrir comentários, presentes ou respostas.

## Respostas sem gatilho (AI_RESPOND_ALL) — 03/09/2026

Foi adicionado um modo **experimental e opcional** que permite ao Bob responder a comentários **sem** o espectador escrever `ia`/`!ia`.

- **Padrão:** `AI_RESPOND_ALL=false` — o gatilho `ia`/`!ia` continua sendo o comportamento padrão e o fallback.
- **Ativado:** `AI_RESPOND_ALL=true` — todo comentário com conteúdo real (ao menos uma letra ou dígito) entra no fluxo de resposta; comentários vazios ou só de emoji/pontuação são descartados. O texto completo do comentário é usado, sem exigir prefixo.
- **Reversível:** basta alternar a variável no `.env`; nenhum código precisa mudar para voltar ao modo com gatilho.

A decisão de responder ou não a cada comentário fica isolada na função pura `resolveCommentForAi` em `src/ai.js`, coberta por testes automatizados nos dois modos.

### RESULTADO DE TESTE — 03/09/2026

Em uma **TikTok LIVE real** com `AI_RESPOND_ALL=true`, o Bob respondeu a comentário(s) **sem** o prefixo `ia`. Classificação: **validação inicial positiva em LIVE real**.

O que foi comprovado: `AI_RESPOND_ALL=true` funciona em LIVE real; um comentário sem `ia` entra no fluxo de resposta; o modo não depende mais obrigatoriamente do gatilho.

O que **não** foi comprovado (permanece PENDENTE): comportamento com vários espectadores simultâneos, comentários em alta frequência, atraso acumulado, respostas a comentários antigos, saturação da fila e limites do provedor de IA. Como a fala/TTS é **serial** (uma voz por vez), em chat movimentado os comentários podem acumular e as respostas chegar atrasadas — RISCO ainda não medido.

Se o teste sob carga demonstrar necessidade, a próxima alternativa (HIPÓTESE) é uma seleção inteligente que priorize o comentário mais recente/relevante, com descarte de comentários antigos e/ou cooldown. Ainda não decidido se `responder-a-todos` será padrão ou permanecerá apenas como modo opcional.

Suíte automatizada após esta integração: **42/42 testes passando** no Windows.

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

### RESULTADO DE TESTE — Validação em LIVE Real (04/09/2026)

Em transmissão ao vivo real na conta `@luisbossgpt` (`roomId=7681569537938787080`), a voz neural do Fish Audio foi ouvida com clareza no aparelho celular do espectador.

- **Decisão:** Adotar `TTS_PROVIDER=fish-audio` com modelo `s2.1-pro-free` e referência `a1a7bc39e7ba490a9b51dae6873d21f9` como voz dinâmica principal do Bob Esponja, mantendo a voz nativa Microsoft Maria do Windows apenas como fallback reversível.
- **Configuração:**
  - `TTS_ENABLED=true`
  - `TTS_PROVIDER=fish-audio`
  - `FISH_AUDIO_REFERENCE_ID=a1a7bc39e7ba490a9b51dae6873d21f9`
  - `FISH_AUDIO_MODEL=s2.1-pro-free`
  - `FISH_AUDIO_API_URL=https://api.fish.audio/v1/tts`
  - `FISH_AUDIO_LATENCY=balanced`
  - Captura no TikTok LIVE Studio: Áudio do Sistema direcionado para o dispositivo de saída (Alto-falantes Realtek Audio).
- **Correção técnica necessária (WAV header sanitization):** A API do Fish Audio entrega áudio WAV com cabeçalho de streaming (`data chunk length = 0xFFFFFF00`). O `System.Media.SoundPlayer` nativo do Windows abortava a reprodução após ~600 ms devido a esse tamanho não finalizado. Foi implementada a função pura `sanitizeWavHeader()` em `src/tts.js`, que recalcula e grava os tamanhos reais de `data` e `RIFF` no buffer. Após essa correção, as falas foram reproduzidas na íntegra (áudios de 10,7 s e 13,5 s reproduzidos do início ao fim sem cortes).
- **Resultado obtido:**
  - Respostas dinâmicas inéditas da IA faladas com a voz neural do Fish Audio e confirmadas pelo espectador no celular.
  - Exemplos executados na LIVE:
    - *"Oi, @Peres Shop! Tô ótimo, pronto pra dar um show de diversão aqui no Siri Cascudo! 🎉"* — geração Fish Audio em 2287 ms, reprodução completa de 13558 ms.
    - *"Oi, @Peres Shop! Eu moro no Abacaxi Marítimo, lá no fundo do mar..."* — geração Fish Audio em 2047 ms, reprodução completa de 10710 ms.
    - *"Oi, Peres Shop! Vamos sim, bora pra praia pegar aquela onda! 🏖️"* — geração Fish Audio em 1819 ms, reprodução completa de 6484 ms.
  - Transições `idle → thinking → speaking → idle` perfeitamente sincronizadas via callbacks `onPlaybackStart` e `onPlaybackEnd`.
  - Ausência de conflito entre vídeos acionados e falas dinâmicas.
- **Limitação observada:** O tempo de resposta entre o envio do comentário pelo espectador e o início da fala do Bob apresentou atraso perceptível de 30 a 40 segundos. O diagnóstico comprovou que a lentidão **não foi causada pelo Fish Audio** (cuja síntese levou apenas 1,8 a 2,5 s), mas sim pelo tempo de resposta dos modelos gratuitos de IA no OpenRouter (o modelo principal `nemotron` falhou/entrou em timeout e acionou o fallback `minimax-m3:free`, que levou 32 a 38 segundos por inferência).
- **Risco:** Em lives com chat mais ativo, delays de 30 a 40 s na IA podem fazer o personagem responder a comentários defasados, gerando perda de contexto com o público.
- **Pendências:**
  - Otimizar o tempo de inferência do modelo de texto (avaliar modelo mais rápido ou provedor pago/direto com SLA estável de < 2 s);
  - Validação do lip-sync dinâmico em TikTok LIVE real com espectador confirmando visual no celular.

## Sincronização Labial Dinâmica (Lip Sync) — Implementado e Validado (04/09/2026)

Em 04/09/2026, foi implementada e validada de ponta a ponta a sincronização labial dinâmica do Bob Esponja para respostas inéditas da IA sintetizadas pelo Fish Audio.

### Arquitetura da Solução

1. **Alinhamento Temporal via Fish Audio SSE:**
   - Chamada para `POST https://api.fish.audio/v1/tts/stream/with-timestamp`.
   - Streaming SSE entrega chunks de áudio em base64 e snapshots cumulativos de alinhamento (`chunk_audio_offset_sec` + `segments: [{ text, start, end }]`).
   - Consolidação por `chunk_seq` com regra *latest-wins* em `consolidateFishAlignment()`.
   - Sanitização de cabeçalho WAV (`sanitizeWavHeader`) para áudio contínuo sem truncamento.

2. **Motor Fonético/Visêmico PT-BR (`src/lip-sync.js`):**
   - Mapeamento determinístico de grafemas, dígrafos e encontros consonantais do Português do Brasil em 9 visemas:
     - `rest`: silêncio / boca em repouso neutro.
     - `a`: vogais abertas (A, Á, À, Ã, Â).
     - `e`: vogais médias / fechadas (E, É, Ê, I, Í, Y).
     - `o`: vogais arredondadas (O, Ó, Ô).
     - `u`: lábios protusos (U, Ú).
     - `mbp`: oclusão bilabial (M, B, P).
     - `fv`: labiodental fricativa (F, V).
     - `l`: língua no palato (L, LH, R, RR, S, Z, T, D, N, NH, J, X, CH).
     - `wq`: semivogal arredondada / velar (W, Q, GU, QU).
   - Suavização temporal com tempo mínimo de sustentação (`LIP_SYNC_MIN_HOLD_MS=65ms`) para evitar jitter/flicker.
   - Término estrito garantido em `rest`.

3. **Arquitetura Visual Sem Dupla Boca:**
   - Durante a fala dinâmica com lip-sync, o elemento `<video>` é ocultado/pausado.
   - Entra em cena a base neutra com boca fechada (`assets/mvp7/lipsync/bob-neutral-base.png`).
   - As camadas de boca (`mouth-*.png`) são renderizadas em canvas idêntico (720x1280 transparente), garantindo alinhamento pixel-a-pixel sem frestas ou deslocamentos.
   - O compositor no navegador (`src/scene-preview.js`) roda um único loop de alta precisão via `requestAnimationFrame` global permanente que executa continuamente e anima exclusivamente quando `activeLipSync && activeLipSync.enabled`, com busca binária na timeline pré-carregada. Fora de `speaking`, `activeLipSync` é nulo e o overlay permanece oculto.
   - **Janela de Polling Visual:** o navegador consulta o estado do backend via `setInterval(tick, 150)`. O compositor utiliza o `startedAt` absoluto e compensa a defasagem no relógio da timeline. No início visual imediato da fala, existe uma janela teórica de atraso de até ~150 ms para o primeiro frame de boca aparecer no browser.
   - Ao final do áudio, a sobreposição é imediatamente ocultada e a prévia retorna ao vídeo em loop `idle`.

4. **Sincronização com Áudio no Windows:**
   - O player nativo PowerShell (`System.Media.SoundPlayer`) emite o marcador `AUDIO_PLAYBACK_START` no `stdout` imediatamente antes de `$player.PlaySync()`.
   - O marcador é emitido imediatamente antes de `PlaySync` e usado como referência temporal de início da reprodução no processo, eliminando o atraso de spawn do PowerShell (~200 a 400 ms). Não representa a física vibração mecânica do cone do alto-falante, mas o início síncrono da execução da API de áudio no SO.

5. **Fallbacks e Segurança:**
   - Protegido por feature flag: `LIP_SYNC_ENABLED=false` (padrão) preserva integralmente o comportamento tradicional com `spongebob-speaking-v1.mp4`.
   - **Fallback sem alignment**: se o Fish Audio stream falhar ou não retornar timestamps válidos, o sistema recorre transparentemente ao `/v1/tts` regular. Por padrão (`LIP_SYNC_APPROXIMATE_FALLBACK=false`), o lip-sync visual permanece DESATIVADO (`activeLipSync = null`), caindo de forma 100% segura para o speaking tradicional sem nunca perder a voz do Bob nem falhar a interação.
   - Nenhuma interferência sobre os 5 vídeos acionáveis do MVP 6 (Patrick, Hambúrguer, etc.), que tocam áudio nativo intacto.

### Classificação dos Ativos Visuais (Regra de Transparência)

Conforme a diretriz de rigor técnico:
- Os 10 arquivos PNG em `assets/mvp7/lipsync/` foram classificados oficialmente como:
  > **PACK DE DESENVOLVIMENTO / PROVISÓRIO PARA VALIDAÇÃO DO PIPELINE TÉCNICO**
- Objetivo: validar integração, alinhamento temporal, ausência de regressão e fluidez no navegador.
- Os modelos mestres de 720x1280 foram derivados dos frames de referência 3D existentes para garantir estabilidade visual.

### Resultados do Teste Controlado no Windows (`npm run test:lipsync`)

Executado em 04/09/2026 com as três frases de homologação:

| Frase | Segmentos Fish | Visemas Gerados | Duração da Timeline | Latência de Síntese | Reprodução de Áudio | Resultado |
|---|---:|---:|---:|---:|---:|---|
| *"Oi, eu sou o Bob!"* | 5 | 10 | 1.672 ms | 728 ms | 3.195 ms | **Sucesso (idle → thinking → speaking → idle)** |
| *"Olá, pessoal! Bem-vindos à nossa live na Fenda do Biquíni!"* | 11 | 40 | 4.830 ms | 1.323 ms | 5.523 ms | **Sucesso (idle → thinking → speaking → idle)** |
| *"Bob preparou um hambúrguer para Patrick e foi visitar a Fenda do Biquíni."* | 13 | 50 | 4.365 ms | 1.705 ms | 4.941 ms | **Sucesso (idle → thinking → speaking → idle)** |

- **Total de testes automatizados:** 160/160 testes passando (17 suítes, 0 falhas). Sendo 23 testes dedicados no motor de lip-sync (`test/lip-sync.test.js`), 7 testes de cena/compositor (`test/lip-sync-scene.test.js`), 17 testes de TTS e reprodução (`test/tts.test.js`), e 113 testes de regressão dos módulos de interação, rotação e presentes.
- **Status do Lip Sync:** PIPELINE TÉCNICO E TESTE CONTROLADO NO WINDOWS 100% CONCLUÍDOS; VALIDAÇÃO EM TRANSMISSÃO AO VIVO REAL NO TIKTOK LIVE STUDIO COM ESPECTADOR CONFIRMANDO NO CELULAR: **PENDENTE**.

## Piloto híbrido com vídeos acionáveis

Foi aprovada a produção de cinco vídeos pré-gravados antes da implementação dos gatilhos. Eles cobrem boas-vindas, hambúrguer, Fenda do Biquíni, Patrick e convite para perguntas com `ia`. A fala e o áudio ficam embutidos nesses clipes para buscar melhor voz e lip sync nas frases fixas; nomes, presentes e perguntas inéditas permanecem dinâmicos.

A prioridade `presente > pergunta dinâmica > vídeo acionado > entrada > ambiente` foi **implementada em 03/09/2026**, com palavras inteiras, normalização de acentos, cooldown de 60 segundos e uma única mídia por vez. Os clipes tocam com o áudio do próprio MP4, sem TTS junto, e voltam ao `idle` pelo fim real da reprodução. Testado localmente no Windows (82/82 testes e dois clipes acionados de ponta a ponta); a validação em LIVE real, com o espectador ouvindo o áudio, continua pendente.

Especificação, gatilhos, prompts e critérios: [`docs/mvp6-prerecorded-video-pilot.md`](mvp6-prerecorded-video-pilot.md).

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
## Referência operacional — geração manual das falas fixas do Bob

**FATO INFORMADO PELO USUÁRIO em 03/09/2026:** as falas fixas/pré-gravadas do Bob estão sendo geradas manualmente no Fish Audio pela página:

`https://fish.audio/pt/app/text-to-speech/?modelId=a1a7bc39e7ba490a9b51dae6873d21f9`

Identificador operacional observado no link:

```text
modelId=a1a7bc39e7ba490a9b51dae6873d21f9
```

A documentação oficial do Fish Audio informa que o identificador da voz presente na URL pode ser usado como `reference_id` em integrações TTS. Este registro serve para reproduzir o fluxo manual usado na produção das falas fixas.

**Importante:** o uso manual desse modelo nas falas pré-gravadas não significa que o mesmo modelo já esteja aprovado como voz dinâmica do pipeline via API. Caso ele seja adotado no `FISH_AUDIO_REFERENCE_ID`, ainda é necessário validar autorização de uso, compatibilidade com a API, naturalidade, latência, custo e áudio recebido pelo espectador em LIVE real.

Fonte oficial Fish Audio: https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech
