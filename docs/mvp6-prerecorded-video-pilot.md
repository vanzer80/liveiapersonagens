# Piloto híbrido — cinco vídeos acionáveis por comentário

Status: **DESENHO APROVADO; ATIVOS, GATILHOS E TESTE REAL PENDENTES**.

## Objetivo

Validar cinco falas pré-gravadas com áudio e sincronização labial produzidos no próprio vídeo. Esses clipes cobrem situações repetíveis da LIVE e convivem com a conversa dinâmica já implementada.

O piloto existe para responder a uma limitação confirmada: o MP4 `speaking` troca de estado junto com o TTS, mas a boca pré-renderizada não conhece os fonemas da fala gerada depois. Um clipe criado com sua fala fixa pode sincronizar melhor voz e boca, porém somente para aquela frase.

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

Este arquivo ainda não existe; o exemplo é contrato de planejamento, não implementação.

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
3. adicionar `mvp4-spongebob-master-v1-approved.jpeg` como Ingredient;
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

Cada arquivo precisa ser revisto do início ao fim e aprovado individualmente:

- personagem completo, sem deformação ou corte;
- cenário e enquadramento coerentes entre os cinco;
- fala exata em PT-BR, sem palavras extras;
- uma única voz, com timbre e volume consistentes;
- boca acompanha a fala de modo convincente;
- nenhum ruído, música ou segunda voz;
- nenhum texto ou elemento visual indesejado;
- início e fim adequados para transição com `idle`.

## Critérios de validação integrada

Após a aprovação dos cinco MP4s:

- implementar configuração e seleção por gatilho;
- criar testes de normalização, palavras inteiras, cooldown, prioridade e deduplicação;
- confirmar que cada comentário aciona somente o vídeo esperado;
- confirmar que `ia <pergunta>` continua usando IA/TTS;
- verificar no celular do espectador imagem e áudio sincronizados;
- confirmar que não há sobreposição;
- confirmar retorno ao `idle` e continuidade da captura de eventos.

## Fora deste piloto

- produzir todos os 24 vídeos de ambiente;
- substituir respostas dinâmicas por vídeos;
- declarar lip sync dinâmico resolvido;
- remover o TTS ou os MP4s atuais de fallback;
- implementar painel, editor visual ou biblioteca comercial.

## Riscos e governança

A qualidade pode variar entre gerações, inclusive voz, boca, volume, cenário e proporções. Uma imagem visualmente boa não comprova áudio ou sincronização. Antes de uso público ou comercial, confirmar que a autorização informada cobre personagem, voz, IA, animação, TikTok LIVE e monetização.
