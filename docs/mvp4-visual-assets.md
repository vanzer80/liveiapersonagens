# MVP 4 — imagem mestre e clipes visuais

## Status

Especificação visual inicial definida para gerar a primeira imagem mestre candidata e os três clipes mínimos do MVP 4. A identidade visual só deve ser tratada como **aprovada** depois de revisão visual do usuário.

## Objetivo

Criar uma base visual simples, original e consistente para validar `idle → thinking → speaking → idle` antes de investir em avatar 3D em tempo real.

## Personagem mestre — candidato V1

### Identidade visual

- personagem humano adulto original, sem referência a personagem protegido;
- apresentação masculina, aproximadamente 35 anos;
- pele morena clara, rosto brasileiro/latino de aparência natural;
- cabelo castanho-escuro curto, levemente ondulado, penteado simples;
- barba curta e bem cuidada;
- olhos castanhos quentes;
- expressão amistosa, inteligente e levemente curiosa;
- proporções humanas realistas, com acabamento de personagem 3D cinematográfico de alta qualidade, sem aparência cartunesca;
- nada de cicatrizes, armaduras, símbolos, logos ou elementos que lembrem franquias conhecidas.

### Roupa fixa

- camiseta lisa grafite escura;
- jaqueta leve verde-oliva escura, aberta, sem estampas nem logotipos;
- roupa idêntica em todos os estados do primeiro conjunto.

### Cenário fixo

- estúdio acolhedor de transmissão com estética contemporânea;
- fundo desfocado com madeira escura, luzes práticas quentes e poucos elementos abstratos;
- sem texto, telas legíveis, marcas, logos ou elementos de interface incorporados ao vídeo;
- iluminação principal suave e quente no rosto, recorte discreto no cabelo/ombros;
- profundidade de campo moderada para separar o personagem do fundo.

### Enquadramento fixo

- vertical `9:16`;
- personagem centralizado, do meio do tórax para cima;
- câmera na altura dos olhos;
- lente equivalente aproximada de retrato natural, sem grande angular;
- espaço moderado acima da cabeça e nas laterais para futura sobreposição de UI;
- câmera bloqueada: sem zoom, pan, tilt ou handheld.

## Prompt mestre para imagem

> Original adult male humanoid host, around 35 years old, light brown Brazilian/Latino skin tone, short slightly wavy dark brown hair, neatly trimmed short beard, warm brown eyes, friendly intelligent expression, realistic human facial proportions, high-end cinematic 3D character rendering with lifelike skin and hair, not cartoon, not stylized as any known franchise character. He wears a plain dark graphite t-shirt and an open dark olive lightweight jacket with no logos or patterns. Medium close-up from mid chest upward, centered, eye-level camera, vertical 9:16. Cozy contemporary livestream studio in the background with dark wood, subtle warm practical lights and soft abstract details, shallow depth of field, warm soft key light on face, subtle rim light, locked camera, clean composition with room for future overlays. No text, no watermark, no logo, no UI, no weapons, no armor, no costume changes.

## Regras de consistência para todos os clipes

1. Usar a imagem mestre como referência/ingredient principal em todas as gerações.
2. Preservar exatamente rosto, cabelo, barba, roupa, cenário, luz, enquadramento e posição de câmera.
3. Alterar apenas expressão, olhar, mãos e pequenos movimentos de tronco necessários ao estado.
4. Não adicionar texto, interface, nomes, legendas, objetos novos ou mudanças de cenário.
5. Não gerar fala audível, nomes ou frases. O áudio final vem do TTS dinâmico.
6. Evitar movimentos grandes de câmera, entrada/saída de quadro e gestos que cruzem o rosto.
7. Manter boca e mandíbula naturais. Em `speaking`, produzir movimento de fala genérico sem frase específica.
8. Preferir movimentos suaves que possam repetir sem salto visual perceptível.

## Contrato dos ativos

| Estado | Arquivo | Proporção | Alvo de duração | Loop | Fallback |
| --- | --- | --- | --- | --- | --- |
| `idle` | `mvp4-idle-v1.mp4` | 9:16 | 6–8 s | sim | ele mesmo |
| `thinking` | `mvp4-thinking-v1.mp4` | 9:16 | 4–6 s | sim | `idle` |
| `speaking` | `mvp4-speaking-v1.mp4` | 9:16 | 6–8 s | sim enquanto TTS toca | `idle` |

Requisitos de entrega dos vídeos:

- resolução preferida: `1080x1920` quando disponível; aceitar `720x1280` para protótipo;
- MP4 com codec amplamente reproduzível;
- sem áudio de fala; ambiente deve ser removível ou muito discreto;
- primeiro e último quadro visualmente próximos quando o estado for marcado como loop;
- manter uma única versão aprovada por estado no conjunto ativo; variações futuras usam sufixo `v2`, `v3` etc.

## Prompt Flow/Veo — idle

> Use the uploaded master character image as the strict visual identity reference. Keep exactly the same person, face, hair, beard, clothing, studio background, lighting, framing and locked eye-level camera. Vertical 9:16 medium close-up. The character is calmly waiting during a livestream: subtle breathing, one natural blink, tiny eye movement toward the camera, minimal relaxed shoulder movement, neutral friendly expression. No speaking, mouth mostly closed, no large gestures, no camera motion, no new objects, no text, no logo, no UI. Make the motion smooth and loop-friendly, with the ending pose close to the opening pose. Preserve photorealistic cinematic 3D rendering and natural human anatomy.

## Prompt Flow/Veo — thinking

> Use the uploaded master character image as the strict visual identity reference. Keep exactly the same person, face, hair, beard, clothing, studio background, lighting, framing and locked eye-level camera. Vertical 9:16 medium close-up. The character has just heard a viewer question and is briefly thinking: attentive eyes, a small thoughtful eyebrow movement, slight head tilt, brief glance a little off-center and back toward camera, subtle closed-mouth breath, one small restrained hand gesture near the lower edge of frame if natural. No speaking, no exaggerated acting, no camera motion, no new objects, no text, no logo, no UI. Motion should be calm, realistic and loop-friendly. Preserve photorealistic cinematic 3D rendering and natural human anatomy.

## Prompt Flow/Veo — speaking

> Use the uploaded master character image as the strict visual identity reference. Keep exactly the same person, face, hair, beard, clothing, studio background, lighting, framing and locked eye-level camera. Vertical 9:16 medium close-up. The character is speaking conversationally to the livestream audience without any specific recorded sentence: natural generic mouth and jaw movement, subtle facial expression changes, occasional blink, small believable head movements and restrained hand gestures below face level. Keep energy warm and engaged, not theatrical. No audible dialogue, no names, no fixed phrases, no camera motion, no new objects, no text, no logo, no UI. The movement should remain visually stable and be suitable to loop while an external dynamic TTS track plays. Preserve photorealistic cinematic 3D rendering and natural human anatomy.

## Checklist visual antes de aceitar cada geração

- rosto reconhecidamente igual à imagem mestre;
- mesma barba, cabelo e cor de pele;
- mesma roupa e cores;
- mesmo cenário e iluminação;
- mesma distância e altura de câmera;
- mãos e dedos sem deformações evidentes;
- ausência de texto/logos/UI;
- nenhum diálogo fixo no áudio;
- movimento compatível com o estado;
- emenda do loop aceitável para o protótipo.

## Próximo passo após aprovação visual

Gerar os três arquivos no Flow/Veo com a mesma imagem mestre. Depois, colocá-los em `prototypes/tiktok-live-node/assets/mvp4/` usando exatamente os nomes definidos acima. Somente então o critério “três clipes iniciais consistentes” da Issue #4 pode ser marcado como concluído.
