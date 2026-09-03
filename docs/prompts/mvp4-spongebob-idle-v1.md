# MVP 4 — Prompt operacional — SpongeBob idle V1

Status: **PRONTO PARA GERAÇÃO**.

Imagem mestre obrigatória: `mvp4-spongebob-master-v1-approved.jpeg` (Google Drive oficial do projeto).

Arquivo de saída esperado: `spongebob-idle-v1.mp4`.

## Objetivo

Gerar o primeiro clipe visual da variante SpongeBob mantendo identidade, cenário, iluminação, enquadramento e câmera o mais próximos possível da imagem mestre aprovada. O clipe será usado como estado base/fallback do controlador de cena.

## Prompt — copiar e colar no Flow/Veo

Use the uploaded approved SpongeBob master image as the ABSOLUTE and STRICT visual reference for this animation. Do not redesign, reinterpret or restyle the character or the environment.

Preserve exactly the same SpongeBob identity shown in the reference image: same face, same eye size and shape, same blue irises, same eyelashes, same nose, same cheeks, same front teeth, same smile shape, same yellow color, same sponge-hole pattern and positions, same body proportions, same arms, same legs, same white shirt, same red tie, same brown square pants, same socks and same black shoes.

Preserve the environment exactly as shown in the master image: same underwater livestream studio, same background composition, same colors, same background objects, same object positions, same depth of field, same practical lights and same overall underwater atmosphere.

Preserve the camera exactly: vertical 9:16, straight-on view, eye-level locked camera, same camera height, same camera distance, same lens perspective, same framing, same character scale and same centered position. Absolutely no zoom, no pan, no tilt, no dolly, no orbit, no handheld motion, no reframing and no cuts.

ACTION — IDLE STATE:

SpongeBob is calmly waiting during a livestream while looking generally toward the viewer.

The motion must be extremely subtle and natural:
- very gentle breathing-like body movement;
- one or two soft natural blinks during the entire clip;
- extremely small eye micro-movements while maintaining attention toward the camera;
- tiny relaxed arm and hand micro-movements caused only by natural idle posture;
- extremely subtle body sway or posture adjustment;
- maintain the same small friendly relaxed smile from the master image.

SpongeBob does NOT speak.

His mouth must remain closed in the same relaxed smile for almost the entire clip. Do not generate talking mouth shapes, phonemes, chewing motion or exaggerated facial animation.

Do not wave.
Do not point.
Do not jump.
Do not dance.
Do not walk.
Do not turn around.
Do not make large gestures.
Do not change pose significantly.
Do not interact with objects.

LOOP REQUIREMENT:

Create a smooth loop-friendly idle animation. The final body pose, face, eyes, arms, camera framing and overall composition should return as close as possible to the opening frame so the video can repeat continuously without an obvious visual jump.

The character must remain in approximately the exact same screen position throughout the entire clip.

VISUAL CONTINUITY LOCK:

Do not change:
- SpongeBob's face;
- body proportions;
- sponge-hole pattern;
- eye proportions;
- tooth size or spacing;
- nose shape;
- clothing;
- clothing colors;
- arm or leg length;
- studio design;
- furniture;
- background objects;
- lighting direction;
- color temperature;
- camera position;
- framing;
- lens perspective;
- depth of field.

No morphing.
No identity drift.
No costume drift.
No background drift.
No lighting drift.
No camera drift.

TECHNICAL TARGET:

Vertical 9:16 video.
Target duration: 6 to 8 seconds.
Single continuous shot.
Locked camera.
Smooth animation.
Stable character identity.
Loop-friendly beginning and ending.
No dialogue and no spoken audio.
If audio is generated automatically, use only extremely subtle neutral underwater room ambience; preferably generate without meaningful audio because dynamic TTS will be added externally later.

IMPORTANT NEGATIVE CONSTRAINTS:

Only one SpongeBob in the scene.
No Patrick.
No Squidward.
No Sandy.
No Mr. Krabs.
No Plankton.
No additional characters or silhouettes.
No new props.
No text.
No subtitles.
No captions.
No speech bubbles.
No watermark.
No logos.
No TikTok interface.
No livestream UI.
No microphone entering the frame.
No headset.
No costume change.
No extra arms.
No extra legs.
No duplicated hands.
No malformed fingers.
No distorted eyes.
No changing teeth.
No exaggerated expressions.
No camera movement.
No scene transition.

PRIORITY ORDER:

1. Preserve the approved master image identity.
2. Preserve camera and framing.
3. Preserve background and lighting.
4. Keep movement subtle and believable.
5. Make the clip loop smoothly.

If there is any conflict between adding motion and preserving the master image, ALWAYS prioritize preserving the master image.

FINAL TARGET:

A clean, stable and nearly motionless SpongeBob livestream idle loop that looks like the approved master image has naturally come to life, with only subtle breathing, blinking and micro-movements. It must be suitable as the permanent base idle state of an interactive AI livestream character and as the fallback visual whenever no other state is active.

## Revisão antes de aprovar

- identidade igual à imagem mestre;
- rosto, olhos, dentes e furos estáveis;
- roupa e proporções sem mudanças;
- cenário e luz sem deriva perceptível;
- câmera totalmente fixa;
- sem fala ou boca conversando;
- movimentos mínimos;
- início e fim suficientemente próximos para loop;
- sem personagens ou objetos novos.
