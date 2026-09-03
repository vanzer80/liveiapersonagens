# MVP 4 — Prompt operacional — SpongeBob idle V3

Status: **PRONTO PARA TERCEIRA E ÚLTIMA TENTATIVA GERATIVA DO IDLE**.

Imagem mestre obrigatória: `mvp4-spongebob-master-v1-approved.jpeg` no Google Drive oficial do projeto.

## Mudança de método

As tentativas 1 e 2 preservaram bem personagem/cenário/câmera, mas ambas produziram abertura de boca e expressões faciais incompatíveis com o estado `idle`. O V3 não depende apenas de instruções negativas.

No Google Flow, usar **Vídeo → Frames → Primeiro + Último** quando essa opção estiver disponível no modelo selecionado.

- Frame inicial: `mvp4-spongebob-master-v1-approved.jpeg`
- Frame final: **a mesma imagem** `mvp4-spongebob-master-v1-approved.jpeg`
- Proporção: `9:16`
- Duração preferida: `8 s`
- Sem fala/diálogo; desligar áudio se a interface permitir.

A documentação oficial do Google Flow confirma suporte a frames inicial/final, com disponibilidade variando por modelo/região.

## Prompt — copiar e colar

Animate the exact uploaded SpongeBob master frame as a nearly static livestream idle state.

The FIRST FRAME and LAST FRAME are the SAME approved master image. The animation must begin from that exact image and return exactly to that same image at the end.

ABSOLUTE FACE FREEZE:
Keep SpongeBob's entire face visually frozen to the approved master identity for the full clip. Preserve exactly the same mouth shape, closed relaxed smile, two front teeth, cheeks, nose, eye size, eye shape, irises, eyelashes and sponge-hole pattern.

Do not animate the mouth or jaw. Do not open the mouth. Do not show the inside of the mouth. Do not change the smile. Do not laugh, react, speak or form phonemes.

Keep the eyes open in the same neutral friendly shape as the master image. For this test, NO BLINKING and NO expressive eyelid motion. Do not squint, wink or make comedic eye expressions.

ALLOWED MOTION ONLY:
- extremely subtle breathing-like movement in the body below the face;
- barely perceptible relaxed arm/hand micro-movement;
- extremely small natural body sway;
- optional very subtle environmental underwater micro-motion in the background, without moving or replacing objects.

The face itself must remain visually unchanged.

IDENTITY AND CONTINUITY LOCK:
Preserve exactly the same yellow color, body proportions, sponge holes, clothing, red tie, brown pants, socks, shoes, arm length, leg length, studio, furniture, background objects, object positions, lighting, color temperature, depth of field and overall rendering style from the master image.

CAMERA LOCK:
Vertical 9:16. Straight-on eye-level locked camera. Same camera height, distance, lens perspective, framing, character size and centered position as the master. No zoom, pan, tilt, dolly, orbit, handheld motion, reframing, cuts or transitions.

LOOP:
Because the first and last frames are identical, all tiny movement must naturally resolve back into the exact approved master pose before the end. The loop must not create an obvious jump.

Only one SpongeBob. No other characters. No new props. No text, captions, subtitles, logos, watermark, TikTok UI, microphone, headset, costume changes, extra limbs, duplicated hands or visual morphing.

PRIORITY ORDER:
1. Preserve the approved master face without facial animation.
2. Return exactly to the same master frame at the end.
3. Preserve camera/framing.
4. Preserve environment/lighting.
5. Add only tiny body micro-motion.

If any movement risks changing the face, OMIT THAT MOVEMENT.

FINAL TARGET:
A technically stable idle loop for an interactive livestream: SpongeBob appears calmly present and alive through extremely small body motion while his face remains exactly like the approved master image, with closed mouth and neutral eyes for the entire clip.

## Critério de decisão

Se esta terceira tentativa ainda abrir a boca, alterar olhos de forma expressiva ou derivar a identidade, **não gerar uma quarta tentativa**. Para o protótipo, usar a imagem mestre estática como `idle`/fallback e reservar animação facial para `thinking` e `speaking`.

## Fontes operacionais

- Google Flow Help — Create videos in Google Flow: https://support.google.com/flow/answer/16353334
- Google Flow Help — models and supported features: https://support.google.com/flow/answer/16352836
