# MVP 4 — Prompt operacional — SpongeBob speaking V1

Status: **PRONTO PARA GERAÇÃO**.

Imagem mestre obrigatória: `mvp4-spongebob-master-v1-approved.jpeg` no Google Drive oficial do projeto.

Arquivo esperado após aprovação: `spongebob-speaking-v1.mp4`.

## Objetivo

Gerar o estado visual de fala da variante Bob Esponja para acompanhar o TTS externo e dinâmico já validado. O clipe não deve conter frase, nome ou diálogo fixo. A sincronização labial será aproximada no protótipo.

## Configuração recomendada no Flow/Veo

- usar a imagem mestre aprovada como referência principal;
- vertical `9:16`;
- alvo de `8–10 s`;
- câmera fixa;
- sem fala inteligível ou diálogo gravado;
- se houver áudio gerado automaticamente, ele será mutado/ignorado na integração;
- o clipe poderá ser repetido enquanto o TTS estiver tocando.

## Prompt — copiar e colar

Use the uploaded approved SpongeBob master image as the ABSOLUTE and STRICT visual identity reference for this SPEAKING animation.

Preserve exactly the same SpongeBob identity shown in the approved master image: same face, eye size and shape, blue irises, eyelashes, nose, cheeks, two front teeth, yellow color, sponge-hole pattern and positions, body proportions, arms, legs, white shirt, red tie, brown square pants, socks and black shoes.

Preserve exactly the same underwater livestream studio, background composition, colors, objects, object positions, practical lights, depth of field, lighting direction, color temperature and overall rendering style.

CAMERA LOCK:
Vertical 9:16. Straight-on, eye-level locked camera. Keep the exact same camera height, camera distance, lens perspective, framing, character scale and centered position as the approved master image.

No zoom.
No pan.
No tilt.
No dolly.
No orbit.
No handheld movement.
No reframing.
No cuts.
No scene transitions.

ACTION — SPEAKING STATE:

SpongeBob is speaking directly to a livestream viewer in a friendly, conversational and natural way.

He must look engaged and alive, but NOT theatrical, exaggerated or hyperactive.

The animation must represent GENERIC CONVERSATIONAL SPEECH only. It must NOT correspond to any specific sentence, language, name, phrase or recorded dialogue.

SPEECH MOTION:

- begin conversational mouth movement almost immediately after the first frame;
- use varied but moderate generic mouth shapes suggesting normal speech;
- alternate naturally between small, medium and occasional slightly wider mouth openings;
- include brief natural closed-mouth pauses between imaginary words or phrases;
- move the jaw smoothly without extreme stretching;
- keep the two front teeth recognizable and stable;
- keep cheeks, nose and face proportions stable;
- never morph or redesign the mouth region;
- avoid exaggerated cartoon shouting shapes.

The mouth animation should look plausible while ANY external Portuguese TTS sentence is playing, without being tied to exact phonemes.

DO NOT lip-sync to a specific prerecorded phrase.
DO NOT form visibly recognizable words.
DO NOT repeatedly use the same mouth shape in a mechanical rhythm.
DO NOT keep the mouth permanently open.
DO NOT create screaming, laughing or shocked expressions.

EYES AND FACE:

Maintain warm direct engagement with the viewer.

Allowed:
- occasional natural blinks;
- tiny eye micro-movements;
- subtle friendly expression changes;
- very small eyebrow/eyelid changes compatible with conversation.

Do not roll the eyes dramatically.
Do not cross the eyes.
Do not wink repeatedly.
Do not make exaggerated comedic expressions.
Do not distort the eyes, teeth or cheeks.

HEAD AND BODY MOTION:

Use small natural conversational movements only:
- subtle head nods;
- tiny head tilts;
- gentle breathing/body sway;
- one or two restrained hand or arm gestures below face level.

Gestures must never cover the mouth, teeth or eyes.

Do not wave continuously.
Do not point aggressively.
Do not jump.
Do not dance.
Do not walk.
Do not turn away from camera.
Do not move significantly toward or away from the camera.
Do not rotate to profile.

LOOP / LONG TTS COMPATIBILITY:

This clip may be repeated while external TTS is still playing.

Make the speaking performance loop-friendly:
- keep body position stable throughout;
- avoid any action with a clear beginning or final payoff;
- avoid counting gestures or one-time reactions;
- avoid large arm movements;
- keep the ending posture visually close to the opening posture;
- a brief natural closed-mouth micro-pause near the loop boundary is acceptable;
- the transition from the last frame back to the first frame should not create an obvious jump.

When the external TTS finishes, the scene controller will switch back to the approved idle state.

IDENTITY AND CONTINUITY LOCK:

No identity drift.
No face morphing.
No eye-size changes.
No sponge-hole changes.
No tooth-size or tooth-spacing changes.
No clothing drift.
No background drift.
No lighting drift.
No camera drift.
No new props.
No new characters.
No extra limbs.
No duplicated hands.

AUDIO RULE:

Do NOT include any intelligible spoken words, names or dialogue.

Prefer silent visual animation. If the generation system automatically creates audio, it must contain no intelligible speech and will be MUTED during integration. External dynamic TTS is the only voice source for the interactive character.

TECHNICAL TARGET:

Vertical 9:16.
Target duration: 8 to 10 seconds.
Single continuous shot.
Locked camera.
Stable visual identity.
Generic conversational mouth movement.
Loop-friendly motion.
No fixed dialogue.
No subtitles or UI.

NEGATIVE CONSTRAINTS:

Only one SpongeBob.
No Patrick.
No Squidward.
No Sandy.
No Mr. Krabs.
No Plankton.
No other characters or silhouettes.
No text.
No subtitles.
No captions.
No speech bubbles.
No watermark.
No logos.
No TikTok interface.
No livestream UI.
No microphone blocking the face.
No headset.
No costume changes.
No scene transition.
No shouting.
No screaming.
No laughing fit.
No extreme facial deformation.

PRIORITY ORDER:

1. Preserve the approved master identity.
2. Produce clear generic conversational speaking motion.
3. Preserve teeth, eyes and facial proportions without morphing.
4. Preserve camera and framing.
5. Preserve environment and lighting.
6. Keep gestures restrained and loop-friendly.
7. Avoid any fixed sentence or intelligible generated speech.

If a gesture or facial movement risks changing SpongeBob's identity, REDUCE OR OMIT THE MOVEMENT.

FINAL TARGET:

A clean and stable SpongeBob SPEAKING loop for an interactive AI livestream. He should look like he is naturally talking directly to a viewer through varied generic mouth movement, occasional blinks, tiny head movements and restrained gestures, while remaining visually identical to the approved master image. The animation must work convincingly underneath changing external Portuguese TTS responses and must contain no fixed spoken content of its own.

## Critério de aprovação

- identidade e cenário consistentes com a imagem mestre;
- câmera fixa;
- boca claramente em estado de fala, mas sem deformação;
- dentes e olhos estáveis;
- movimento de boca genérico e variado, não preso a frase específica;
- gestos pequenos sem cobrir o rosto;
- nenhuma fala inteligível embutida;
- loop aceitável para repetir durante TTS mais longo;
- retorno visual simples para o `idle` após o fim do TTS.
