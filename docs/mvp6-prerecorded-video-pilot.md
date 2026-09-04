# Piloto híbrido — cinco vídeos acionáveis por comentário

Status: **CINCO ATIVOS PRODUZIDOS; GATILHOS E REPRODUÇÃO IMPLEMENTADOS E TESTADOS LOCALMENTE NO WINDOWS; VALIDAÇÃO EM LIVE REAL PENDENTE**.

## Objetivo

Validar cinco falas pré-gravadas com áudio e sincronização labial produzidos no próprio vídeo. Esses clipes cobrem situações repetíveis da LIVE e convivem com a conversa dinâmica já implementada.

O piloto existe para responder a uma limitação confirmada: o MP4 `speaking` troca de estado junto com o TTS, mas a boca pré-renderizada não conhece os fonemas da fala gerada depois. Um clipe criado com sua fala fixa pode sincronizar melhor voz e boca, porém somente para aquela frase.

## Resultado dos ativos

O usuário informou que produziu e validou os cinco clipes. Nesta etapa, cópias foram organizadas na pasta oficial `MVP 6 - Vídeos Acionáveis`, no Google Drive do projeto, com nomes estáveis para uso pelo código. Os arquivos de origem foram preservados.

| Uso | Arquivo oficial | Estado |
|---|---|---|
| Boas-vindas | `bob-boas-vindas-v1.mp4` | produzido e validado pelo usuário |
| Hambúrguer | `bob-hamburguer-v1.mp4` | produzido e validado pelo usuário |
| Fenda do Biquíni | `bob-fenda-biquini-v1.mp4` | produzido e validado pelo usuário |
| Patrick | `bob-patrick-v1.mp4` | produzido e validado pelo usuário |
| Convite para IA | `bob-convite-ia-v1.mp4` | produzido e validado pelo usuário |

Classificação da evidência: aprovação audiovisual declarada pelo usuário; presença, formato, nomes e pasta conferidos no Drive. Os conteúdos não foram reproduzidos novamente por esta automação.

Os binários permanecem no Drive e devem ser copiados, em cada máquina de execução, para `prototypes/tiktok-live-node/assets/mvp6/`. O GitHub versiona somente o manifesto, a documentação e as regras que impedem o envio acidental dos MP4s.

## Decisão de arquitetura

Adotar um sistema híbrido:

- vídeos prontos para abertura, falas de ambiente e comentários temáticos recorrentes;
- IA + TTS para nomes, perguntas inéditas e respostas variáveis;
- agradecimento dinâmico para presentes específicos;
- uma única fila de mídia/áudio, sem sobreposição;
- os MP4s atuais permanecem como fallback.

O piloto será limitado a cinco ativos. Não produzir a biblioteca completa antes de comprovar acionamento, transmissão audiovisual e aceitação da experiência.

## Biblioteca inicial

| Uso | Arquivo previsto | Gatilhos planejados | Fala fixa |
|---|---|---|---|
| Boas-vindas | `bob-boas-vindas-v1.mp4` | abertura; `oi`, `olá`, `cheguei`, `primeira vez` | “Oi, pessoal! Bem-vindos à live! Mandem um oi no chat e venham conversar comigo!” |
| Hambúrguer | `bob-hamburguer-v1.mp4` | `hambúrguer`, `hamburguer`, `siri cascudo`, `sanduíche` | “Hambúrguer? Aí você falou a minha língua! Qual é o recheio perfeito para vocês?” |
| Fenda do Biquíni | `bob-fenda-biquini-v1.mp4` | `fenda do biquíni`, `fenda do biquini`, `fundo do mar` | “Na Fenda do Biquíni sempre tem aventura. Se vocês morassem aqui, qual seria o trabalho de vocês?” |
| Patrick | `bob-patrick-v1.mp4` | `patrick`, `estrela do mar`, `estrela-do-mar` | “O Patrick é meu melhor amigo. Às vezes ele demora pra entender, mas nunca demora pra aparecer!” |
| Convite para IA | `bob-convite-ia-v1.mp4` | silêncio; `como perguntar`, `como falar com você`, `como faço uma pergunta` | “Quer falar comigo? Escreva ia, depois a sua pergunta, e eu respondo aqui ao vivo!” |

A palavra isolada `ia` continua reservada para uma pergunta dinâmica e não deve disparar o vídeo de convite.

## Prioridade da fila

1. Presente.
2. Pergunta iniciada por `ia` ou `!ia`.
3. Vídeo acionado por palavra.
4. Entrada agrupada.
5. Vídeo de ambiente.

Uma fala iniciada não é interrompida. A prioridade escolhe apenas o próximo item.

## Regras previstas para os gatilhos

- converter o comentário para minúsculas;
- remover diferenças de acento para comparação;
- reconhecer palavras ou expressões inteiras, não pedaços de outra palavra;
- permitir sinônimos configuráveis;
- aplicar cooldown inicial de 60 segundos por vídeo;
- deduplicar disparos simultâneos;
- não tocar MP4, TTS ou resposta de IA em paralelo;
- retornar ao `idle` ao final;
- registrar gatilho, arquivo, usuário e resultado no terminal.

Formato de configuração pretendido:

```json
{
  "triggers": [
    {
      "id": "hamburguer",
      "words": ["hambúrguer", "hamburguer", "siri cascudo", "sanduíche"],
      "video": "bob-hamburguer-v1.mp4",
      "cooldownSeconds": 60
    }
  ]
}
```

## Implementação — 03/09/2026

O contrato acima deixou de ser planejamento e virou código.

| Peça | Arquivo |
|---|---|
| Manifesto editável de gatilhos | `prototypes/tiktok-live-node/config/video-triggers.json` |
| Normalização, palavra inteira, cooldown | `prototypes/tiktok-live-node/src/video-triggers.js` |
| Roteamento de uma única resposta | `prototypes/tiktok-live-node/src/comment-router.js` |
| Reprodução com áudio e fim real | `src/scene-preview.js` e `src/live-scene.js` |
| Entrada na fila existente | `src/interaction.js` (`onVideo`, prioridade 70) |
| Teste local sem LIVE | `npm run test:videos -- <id>` |

### Como a resposta é escolhida

Para cada comentário existe **uma única** resposta principal:

1. `ia` / `!ia` com mensagem → IA + TTS dinâmico;
2. senão, comentário que casa um gatilho → vídeo pré-gravado;
3. senão, com `AI_RESPOND_ALL=true` → IA + TTS;
4. senão, nada.

Isso resolve o conflito em que "eu gosto do Patrick" tocaria o vídeo **e** geraria resposta de IA. A palavra `ia` sozinha continua reservada e nunca aciona o vídeo de convite.

### Áudio dos clipes

Os MP4s do MVP 4 seguem **mutados e em loop** (camada visual). Os cinco clipes do MVP 6 tocam **com o áudio do próprio arquivo, uma única vez, sem TTS junto**. O player recebe `loop=false` e `muted=false` apenas nesses clipes.

### Fim real da reprodução

O retorno ao `idle` usa o evento `ended` do player, reportado ao Node por `POST /api/media-ended`. Não há atraso fixo como contrato; `VIDEO_PLAYBACK_TIMEOUT_MS` existe apenas como rede de segurança.

### Autoplay com som

Edge e Chrome bloqueiam vídeo com áudio sem gesto do usuário. Isso foi **observado na prática** durante o teste local (`status=blocked`). A prévia passou a ser aberta em modo aplicativo com `--autoplay-policy=no-user-gesture-required` e perfil dedicado. Se nenhum navegador Chromium for encontrado, a página mostra um aviso para clicar uma vez e liberar o som.

### Evidência do teste local no Windows — 03/09/2026

```text
[TESTE VÍDEO] acionando gatilho=patrick arquivo=bob-patrick-v1.mp4
[TESTE VÍDEO] status=ended ok=true duracao_ms=10711
[TESTE VÍDEO] estado_final=idle

[TESTE VÍDEO] acionando gatilho=hamburguer arquivo=bob-hamburguer-v1.mp4
[TESTE VÍDEO] status=ended ok=true duracao_ms=10741
[TESTE VÍDEO] estado_final=idle
```

Classificação: **RESULTADO DE TESTE — local no Windows**. Comprova acionamento, reprodução completa pelo fim real e retorno ao `idle`. **Não** comprova que o espectador ouviu o áudio na LIVE, nem a transmissão pelo LIVE Studio.

## Padrão de produção dos cinco vídeos

- usar a imagem mestre aprovada como referência visual;
- manter exatamente personagem, proporções, roupa, cores, cenário, iluminação e enquadramento;
- orientação vertical 9:16;
- câmera fixa, sem corte, zoom, pan ou troca de ângulo;
- um único personagem e um único falante;
- português brasileiro, dicção clara e voz consistente entre os cinco clipes;
- usar a mesma referência de voz de um único falante quando esse recurso estiver disponível e autorizado;
- sincronizar a boca com a fala fixa;
- começar e terminar próximo da pose neutra para facilitar a volta ao `idle`;
- sem música, legendas, texto na tela, interface de chat, logotipos ou marcas d’água visíveis;
- a fala deve terminar por completo dentro do clipe.

O Google Flow permite usar Ingredients como referências visuais e, nas gerações compatíveis, uma referência de voz de um único falante. Referência oficial: [Create videos in Google Flow](https://support.google.com/flow/answer/16353334).

## Prompts de produção

Em cada geração:

1. selecionar vídeo vertical 9:16;
2. escolher geração de 10 segundos;
3. para novas gerações ou substituições do Bob, adicionar `master-spongebob-live-v1-approved.jpeg` como Ingredient; o antigo `mvp4-spongebob-master-v1-approved.jpeg` permanece apenas como referência histórica dos clipes já produzidos;
4. usar a mesma voz salva/referência de voz em todos os clipes, quando disponível e autorizada;
5. gerar um vídeo por vez e aprovar antes do próximo.

### 1. Boas-vindas

```text
Use the uploaded approved master image as the exact visual reference for the character and environment. Create a vertical 9:16 livestream clip with a locked camera and the same full-body framing, background, lighting, colors, clothing, facial features and proportions. Only this character is present and only this character speaks. He looks toward the audience, smiles naturally and gives one small welcoming wave, with subtle body movement. Use the same approved single-speaker voice reference used for every clip: youthful, high-pitched, energetic, cheerful cartoon voice, speaking clear Brazilian Portuguese, natural and not robotic. Accurate lip sync to every syllable. The character says exactly in Brazilian Portuguese: "Oi, pessoal! Bem-vindos à live! Mandem um oi no chat e venham conversar comigo!" Do not paraphrase or add words. Start and finish near the neutral idle pose. No cuts, zoom, camera movement, extra characters, extra voices, singing, music, subtitles, captions, on-screen text, chat interface, logos or visible watermarks.
```

### 2. Hambúrguer

```text
Use the uploaded approved master image as the exact visual reference for the character and environment. Create a vertical 9:16 livestream clip with a locked camera and the same full-body framing, background, lighting, colors, clothing, facial features and proportions. Only this character is present and only this character speaks. He reacts with delighted surprise to the word hamburger, briefly raises his eyebrows and makes one small enthusiastic hand gesture; do not add food or props. Use the same approved single-speaker voice reference used for every clip: youthful, high-pitched, energetic, cheerful cartoon voice, speaking clear Brazilian Portuguese, natural and not robotic. Accurate lip sync to every syllable. The character says exactly in Brazilian Portuguese: "Hambúrguer? Aí você falou a minha língua! Qual é o recheio perfeito para vocês?" Do not paraphrase or add words. Start and finish near the neutral idle pose. No cuts, zoom, camera movement, extra characters, extra voices, singing, music, subtitles, captions, on-screen text, chat interface, logos or visible watermarks.
```

### 3. Fenda do Biquíni

```text
Use the uploaded approved master image as the exact visual reference for the character and environment. Create a vertical 9:16 livestream clip with a locked camera and the same full-body framing, background, lighting, colors, clothing, facial features and proportions. Only this character is present and only this character speaks. He gestures gently toward the surrounding underwater setting, then looks back at the audience with friendly curiosity. Do not add new locations or characters. Use the same approved single-speaker voice reference used for every clip: youthful, high-pitched, energetic, cheerful cartoon voice, speaking clear Brazilian Portuguese, natural and not robotic. Accurate lip sync to every syllable. The character says exactly in Brazilian Portuguese: "Na Fenda do Biquíni sempre tem aventura. Se vocês morassem aqui, qual seria o trabalho de vocês?" Do not paraphrase or add words. Start and finish near the neutral idle pose. No cuts, zoom, camera movement, extra characters, extra voices, singing, music, subtitles, captions, on-screen text, chat interface, logos or visible watermarks.
```

### 4. Patrick

```text
Use the uploaded approved master image as the exact visual reference for the character and environment. Create a vertical 9:16 livestream clip with a locked camera and the same full-body framing, background, lighting, colors, clothing, facial features and proportions. Only this character is present and only this character speaks. He smiles affectionately when mentioning Patrick, makes a small amused shrug, then ends with a playful expression. Patrick must not appear. Use the same approved single-speaker voice reference used for every clip: youthful, high-pitched, energetic, cheerful cartoon voice, speaking clear Brazilian Portuguese, natural and not robotic. Accurate lip sync to every syllable. The character says exactly in Brazilian Portuguese: "O Patrick é meu melhor amigo. Às vezes ele demora pra entender, mas nunca demora pra aparecer!" Do not paraphrase or add words. Start and finish near the neutral idle pose. No cuts, zoom, camera movement, extra characters, extra voices, singing, music, subtitles, captions, on-screen text, chat interface, logos or visible watermarks.
```

### 5. Convite para perguntar com IA

```text
Use the uploaded approved master image as the exact visual reference for the character and environment. Create a vertical 9:16 livestream clip with a locked camera and the same full-body framing, background, lighting, colors, clothing, facial features and proportions. Only this character is present and only this character speaks. He looks directly toward the audience and makes one small inviting gesture toward the lower part of the screen, without creating text or a chat interface. Use the same approved single-speaker voice reference used for every clip: youthful, high-pitched, energetic, cheerful cartoon voice, speaking clear Brazilian Portuguese, natural and not robotic. Accurate lip sync to every syllable. The character says exactly in Brazilian Portuguese: "Quer falar comigo? Escreva ia, depois a sua pergunta, e eu respondo aqui ao vivo!" Do not paraphrase or add words. Start and finish near the neutral idle pose. No cuts, zoom, camera movement, extra characters, extra voices, singing, music, subtitles, captions, on-screen text, chat interface, logos or visible watermarks.
```

## Critérios de aceite dos ativos

Resultado desta etapa: os cinco arquivos foram aprovados pelo usuário. Os critérios abaixo permanecem como referência para revalidação e substituição futura de qualquer clipe:

- personagem completo, sem deformação ou corte;
- cenário e enquadramento coerentes entre os cinco;
- fala exata em PT-BR, sem palavras extras;
- uma única voz, com timbre e volume consistentes;
- boca acompanha a fala de modo convincente;
- nenhum ruído, música ou segunda voz;
- nenhum texto ou elemento visual indesejado;
- início e fim adequados para transição com `idle`.

## Critérios de validação integrada

Com os cinco MP4s aprovados e organizados:

- [x] implementar configuração e seleção por gatilho;
- [x] criar testes de normalização, palavras inteiras, cooldown, prioridade e deduplicação;
- [x] confirmar que cada comentário aciona somente o vídeo esperado (teste automatizado);
- [x] confirmar que `ia <pergunta>` continua usando IA/TTS (teste automatizado);
- [x] confirmar retorno ao `idle` no teste local do Windows;
- [ ] verificar no celular do espectador imagem e áudio sincronizados;
- [ ] confirmar que não há sobreposição durante uma LIVE real;
- [ ] confirmar continuidade da captura de eventos depois dos acionamentos.

Suíte automatizada após esta etapa: **82/82 testes passando** no Windows.

## Fora deste piloto

- produzir todos os 24 vídeos de ambiente;
- substituir respostas dinâmicas por vídeos;
- declarar lip sync dinâmico resolvido;
- remover o TTS ou os MP4s atuais de fallback;
- implementar painel, editor visual ou biblioteca comercial.


## Masters visuais aprovados para próximas gerações — 04/09/2026

**DECISÃO DO USUÁRIO:** sete imagens passam a ser os MASTERs visuais aprovados e a base de referência para os próximos vídeos de cada personagem.

Os arquivos binários ficam no Google Drive, na pasta oficial `MVP 6 - Masters Visuais` (Drive folder ID `1zBBmvVfkeLjwIzIiD-v8eu7Wffe1tVmk`). O GitHub registra somente nomes, IDs e regras de uso.

| Personagem | Arquivo oficial | Drive ID |
|---|---|---|
| Bob Esponja | `master-spongebob-live-v1-approved.jpeg` | `1zf25YxE3JmoCOb7F1ZR6fduxqSpowTFs` |
| Gary | `master-gary-v1-approved.jpeg` | `1l2TrUB1UP1_5OglLC-Vex6w0mueBoah6` |
| Lula Molusco | `master-squidward-v1-approved.jpeg` | `1AwsQAR7Osvs9dvprVfhrCmb-iDxg6mEP` |
| Patrick Estrela | `master-patrick-v1-approved.jpeg` | `1Z6bzRB6PmXR4C0b5zPCK3ov9JX6vCkM-` |
| Seu Siriguejo | `master-mr-krabs-v1-approved.jpeg` | `106BRk5qNqy8T9Gpj1LfsCEz52oQvNWx6` |
| Sandy Bochechas | `master-sandy-v1-approved.jpeg` | `1InwO_wiyLBI-Tqy1p6Cnj5excr2Z9Rcb` |
| Plankton | `master-plankton-v1-approved.jpeg` | `1nJpXWN0AzU0AEyXSDF2EOnBFkLZmzVM0` |

### Regra de uso

- cada novo vídeo deve usar o MASTER correspondente ao personagem como referência visual principal;
- preservar identidade, proporções, cores, roupa/acessórios, acabamento visual e características reconhecíveis do MASTER;
- cenário, pose e composição podem variar conforme o prompt, exceto quando a cena exigir continuidade exata;
- aprovação como MASTER é visual; não significa que o personagem já esteja implementado no código, tenha gatilho próprio ou tenha sido validado em LIVE real;
- os cinco vídeos acionáveis já produzidos permanecem válidos e **não precisam ser regenerados** por causa desta mudança;
- o antigo `mvp4-spongebob-master-v1-approved.jpeg` continua documentado como referência histórica do processo anterior, mas não é o MASTER preferencial para novas gerações do Bob.


## Riscos e governança

A qualidade pode variar entre gerações, inclusive voz, boca, volume, cenário e proporções. Uma imagem visualmente boa não comprova áudio ou sincronização. Antes de uso público ou comercial, confirmar que a autorização informada cobre personagem, voz, IA, animação, TikTok LIVE e monetização.


## Primeiro vídeo dedicado a presente — Rosa com Sandy — 04/09/2026

**RESULTADO DE ATIVO:** o usuário gerou e entregou um clipe específico para reação ao presente Rosa. Nome canônico adotado pelo projeto: `bob-gift-rosa-sandy-v1.mp4`.

Cena: Sandy Bochechas entra com uma rosa física rosa, entrega a flor ao Bob Esponja e apenas o Bob fala em PT-BR agradecendo o presente. A rosa é um objeto físico da cena, não um elemento gráfico de TikTok.

QA técnico realizado no arquivo recebido:
- duração: **8,000 s**;
- resolução: **720x1280**;
- vídeo: **H.264, 24 fps**;
- áudio: **AAC estéreo, 48 kHz**;
- SHA-256: `5df972b75beab68baeeb1ff87bb55ce943df398505e4f1d3aff6564dc3471afd`;
- inspeção visual de quadros amostrados não mostrou texto, comentários, barras, ícones, presentes gráficos, interface do TikTok ou overlays; a única rosa observada é a flor física da cena.

**CLASSIFICAÇÃO:** ativo produzido e inspecionado localmente. Isso não equivale a validação em TikTok LIVE real.

**USO PREVISTO:** mapear o evento real de presente Rosa (por `giftName` e/ou `giftId` confirmado em LIVE) para este clipe, com prioridade de presente. Se o mapeamento não casar ou o arquivo estiver ausente, preservar o agradecimento dinâmico por TTS como fallback.

**PENDÊNCIAS OPERACIONAIS:** o binário deve permanecer fora do Git e ser sincronizado para a pasta oficial de ativos do Drive e para `prototypes/tiktok-live-node/assets/mvp6/` na máquina Windows. A integração presente → vídeo ainda precisa ser implementada/testada no roteador de presentes e depois validada em LIVE real.
