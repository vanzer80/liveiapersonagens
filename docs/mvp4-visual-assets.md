# MVP 4 — imagens mestre e clipes visuais

## Status

A direção visual do MVP 4 foi ampliada para um teste comparativo com **duas variantes**, usando o mesmo pipeline técnico `idle → thinking → speaking → idle`, o mesmo controlador de cena e o mesmo TTS.

A especificação anterior do host humano masculino original fica substituída por esta comparação.

## Governança de direitos

- O usuário informou em 2026-09-03 que obteve licença para trabalhar com personagens da franquia Bob Esponja.
- O contrato/licença não está armazenado neste repositório e seu escopo não foi verificado pelo projeto.
- Antes de LIVE pública ou uso comercial, confirmar que a licença cobre o uso pretendido, incluindo quando aplicável TikTok/TikTok LIVE, conteúdo gerado ou alterado por IA, animação/representação visual, voz/interação dinâmica, monetização, territórios, prazo e regras de aprovação de marca.
- Personagens protegidos sem autorização continuam fora da estratégia.

## Objetivo do teste comparativo

Comparar dois gatilhos visuais muito diferentes sem alterar a arquitetura:

1. **Variante A — Bob Esponja licenciado:** reconhecimento imediato, carisma e força de uma IP conhecida.
2. **Variante B — influencer virtual original:** aparência humana realista, beleza, presença de câmera e potencial de atenção/relacionamento.

O objetivo não é decidir o produto final apenas pela aparência. Primeiro mediremos consistência visual, qualidade das transições e adequação à interação; depois, em LIVE, poderemos comparar atenção, retenção e resposta do público.

---

# Variante A — Bob Esponja licenciado

## Imagem mestre

Usar o personagem Bob Esponja dentro do escopo da licença informada pelo usuário.

### Direção visual

- aparência reconhecível e consistente do personagem licenciado;
- acabamento 3D cinematográfico de alta qualidade, preservando o caráter cartunesco;
- expressão simpática, energética e convidativa;
- cenário fixo de estúdio/livestream inspirado em ambiente submarino alegre, sem textos ou interfaces incorporadas;
- vertical `9:16`;
- enquadramento médio, personagem centralizado e com espaço para overlays futuros;
- câmera fixa, sem zoom, pan ou cortes nos clipes básicos.

### Prompt mestre — Bob Esponja

> Create a high-quality vertical 9:16 cinematic 3D livestream portrait of SpongeBob SquarePants, preserving his licensed recognizable character identity and proportions. He is centered in a friendly underwater livestream studio, looking directly toward the viewer with an inviting cheerful expression. Use polished cinematic 3D rendering, soft warm key lighting, subtle rim light, clean underwater background details, moderate depth of field and enough negative space for future livestream overlays. Locked eye-level camera, stable framing. No text, no subtitles, no watermark, no UI, no extra characters.

## Prompts dos estados — Bob Esponja

### `idle`

> Use the approved SpongeBob master image as the strict visual identity reference. Preserve exactly the same character appearance, colors, proportions, environment, lighting, framing and locked camera. SpongeBob calmly waits during a livestream with subtle breathing-like body motion, one natural blink, tiny eye movement and a small friendly neutral smile. No speaking, no large gestures, no camera movement, no text, no logo, no UI. Make the beginning and ending pose visually close for looping.

### `thinking`

> Use the approved SpongeBob master image as the strict visual identity reference. Preserve exactly the same character appearance, colors, proportions, environment, lighting, framing and locked camera. SpongeBob has just heard a viewer question and briefly thinks: slight head tilt, small thoughtful eye movement, subtle eyebrow/face change and a restrained thinking gesture, then returns attention toward camera. Mouth mostly closed. No audible speech, no camera movement, no text, no logo, no UI. Keep the action calm and loop-friendly.

### `speaking`

> Use the approved SpongeBob master image as the strict visual identity reference. Preserve exactly the same character appearance, colors, proportions, environment, lighting, framing and locked camera. SpongeBob speaks conversationally to the livestream audience using generic non-language-specific mouth motion, small expressive head movements and restrained hand gestures. No specific sentence or audible dialogue. Keep the motion suitable for looping while external dynamic TTS audio plays. No camera movement, no text, no logo, no UI.

---

# Variante B — influencer virtual feminina original

## Identidade visual candidata V1

- mulher adulta original, aproximadamente 25–30 anos;
- aparência brasileira/latina, humana e fotorealista;
- bonita e fotogênica sem aparência artificial exagerada;
- cabelo castanho longo, saudável e levemente ondulado;
- olhos castanhos, expressão confiante, simpática e inteligente;
- maquiagem natural e elegante;
- proporções humanas realistas;
- nenhuma semelhança intencional com celebridade, influencer real ou pessoa pública;
- roupa moderna e elegante, sem marcas ou logos;
- personagem apresentada como influencer virtual/IA quando exigido pela plataforma.

### Roupa fixa

- top/camiseta elegante em tom neutro;
- jaqueta ou blazer casual contemporâneo;
- sem decote excessivo, logos, estampas ou elementos de marca;
- roupa idêntica nos três estados do primeiro conjunto.

### Cenário fixo

- estúdio contemporâneo de creator/livestream;
- fundo elegante com iluminação quente e detalhes modernos desfocados;
- sem telas legíveis, textos, marcas ou UI incorporada;
- luz principal suave no rosto e recorte discreto no cabelo/ombros.

### Enquadramento fixo

- vertical `9:16`;
- plano médio fechado, do meio do tórax para cima;
- câmera na altura dos olhos;
- personagem centralizada;
- espaço para overlays futuros;
- câmera bloqueada.

### Prompt mestre — influencer virtual

> Create an original adult female virtual influencer, around 25–30 years old, with a beautiful natural Brazilian/Latina appearance, warm brown eyes, long slightly wavy brown hair, elegant natural makeup, confident friendly intelligent expression and realistic human facial proportions. She must not resemble any real celebrity or known influencer. Photorealistic cinematic rendering with subtle high-end digital-human polish. She wears a tasteful modern neutral top with a casual elegant jacket or blazer, no logos or patterns. Medium close-up from mid chest upward, centered, eye-level camera, vertical 9:16. Contemporary creator livestream studio with warm practical lights, elegant blurred background, shallow depth of field, soft flattering key light and subtle rim light. Locked camera, clean composition with room for future overlays. No text, no watermark, no logo, no UI.

## Prompts dos estados — influencer

### `idle`

> Use the approved virtual influencer master image as the strict visual identity reference. Keep exactly the same face, hair, skin tone, clothing, studio, lighting, framing and locked camera. She calmly waits during a livestream with subtle breathing, one natural blink, tiny eye movement toward camera and minimal relaxed shoulder movement. Neutral friendly expression, mouth mostly closed. No speaking, no large gestures, no camera motion, no text, no logo, no UI. Make the ending pose close to the opening pose for looping.

### `thinking`

> Use the approved virtual influencer master image as the strict visual identity reference. Keep exactly the same face, hair, skin tone, clothing, studio, lighting, framing and locked camera. She has just heard a viewer question and briefly thinks: attentive eyes, slight head tilt, small thoughtful eyebrow movement, brief glance a little off-center and back toward camera, subtle closed-mouth breath. No speaking, no exaggerated acting, no camera motion, no text, no logo, no UI. Keep the motion calm, realistic and loop-friendly.

### `speaking`

> Use the approved virtual influencer master image as the strict visual identity reference. Keep exactly the same face, hair, skin tone, clothing, studio, lighting, framing and locked camera. She speaks conversationally to the livestream audience without any specific recorded sentence: natural generic mouth and jaw movement, subtle facial expression changes, occasional blink, small believable head movements and restrained hand gestures below face level. Warm engaged energy, not theatrical. No audible dialogue, no names, no fixed phrases, no camera motion, no text, no logo, no UI. Suitable to loop while external dynamic TTS audio plays.

---

# Contrato dos ativos

Cada variante usa seu próprio prefixo e os mesmos três estados.

| Variante | Estado | Arquivo | Alvo | Loop | Fallback |
| --- | --- | --- | --- | --- | --- |
| Bob Esponja | `idle` | `spongebob-idle-v1.mp4` | 6–8 s | sim | ele mesmo |
| Bob Esponja | `thinking` | `spongebob-thinking-v1.mp4` | 4–6 s | sim | `idle` da mesma variante |
| Bob Esponja | `speaking` | `spongebob-speaking-v1.mp4` | 6–8 s | sim durante TTS | `idle` da mesma variante |
| Influencer | `idle` | `influencer-idle-v1.mp4` | 6–8 s | sim | ele mesmo |
| Influencer | `thinking` | `influencer-thinking-v1.mp4` | 4–6 s | sim | `idle` da mesma variante |
| Influencer | `speaking` | `influencer-speaking-v1.mp4` | 6–8 s | sim durante TTS | `idle` da mesma variante |

Requisitos comuns:

- vertical `9:16`, preferencialmente `1080x1920`;
- MP4 amplamente reproduzível;
- sem fala fixa incorporada;
- TTS permanece externo e dinâmico;
- primeiro e último quadro próximos quando marcado como loop;
- nenhuma troca de câmera, cenário ou roupa dentro do conjunto base;
- fallback nunca pode cruzar variantes: Bob volta para `spongebob-idle`, influencer volta para `influencer-idle`.

## Checklist antes de aceitar uma geração

- identidade reconhecidamente igual à imagem mestre da variante;
- mesma roupa, cenário, luz, distância e altura de câmera;
- ausência de texto, logos, UI e artefatos visuais graves;
- movimento compatível com o estado;
- nenhum diálogo fixo no áudio;
- loop aceitável para o protótipo;
- no caso de Bob Esponja, geração dentro do padrão visual e das restrições aplicáveis da licença;
- no caso da influencer, nenhuma semelhança evidente com pessoa real conhecida.

## Próxima execução

1. gerar uma imagem mestre candidata de Bob Esponja;
2. gerar uma imagem mestre candidata da influencer virtual;
3. aprovar ou ajustar cada mestre;
4. gerar `idle`, `thinking` e `speaking` para cada variante;
5. adaptar o contrato/configuração do controlador para selecionar uma variante sem duplicar a lógica;
6. executar a prévia local das duas variantes com o mesmo TTS;
7. somente depois comparar desempenho em LIVE real.
