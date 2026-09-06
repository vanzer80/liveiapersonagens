# Continuidade — próximo chat

> Atualização complementar de 2026-09-06: continuar da branch `feat/mvp6-auto-speech`, correções publicadas em `e88822ecbf13ba871db319e1629fc008e404811b`, [PR #16](https://github.com/vanzer80/liveiapersonagens/pull/16) em rascunho, dependente do PR #15. Não reimplementar. 205 testes encontrados em Linux: 204 aprovados, 0 falhas, 1 Windows não executado. Rotação/TTS agora alternam; convites por modo, cancelamento e recuperação corrigidos. Documentos oficiais 03 (seção 35) e 04 (seção 20) atualizados e relidos, histórico preservado; Issue #9 atualizada. Windows com Fish real e LIVE com espectador pendentes. Evidências, links e reversão no [relatório complementar](mvp6-auto-speech-complementary-review.md).


## Direção vigente

A influencer virtual foi adiada. A prioridade é colocar o Bob Esponja em uma TikTok LIVE real e confirmar que os espectadores recebem imagem, voz e respostas aos comentários.

## Leitura obrigatória antes de alterar código

Google Drive: `00 - Documento Mestre - Visão do Produto`, `03 - Registro de Decisões e Pendências` e o documento específico da etapa. No GitHub: `README.md`, `docs/technical-plan.md`, este handoff e a Issue #9 (Issue #8 como histórico do MVP 5).

## Estado confirmado

- MVP 1: captura TikTok validada em LIVE real.
- MVP 2: resposta textual validada em LIVE real.
- MVP 3: TTS validado no Windows e em LIVE real.
- MVP 4: ramo Bob validado localmente com imagem mestre e clipes `idle`, `thinking` e `speaking`.
- Sincronização final por callbacks: início do `speaking` 1 ms após o callback; retorno a `idle` confirmado.
- Microsoft Maria Desktop funciona, mas foi percebida como robotizada.
- Influencer: adiada para segunda etapa.
- Presentes, fila e prioridades: implementados no código; teste real pendente.
- Entradas: agrupadas por 10 segundos, com até três nomes por fala.
- MVP 5: Bob em LIVE real VALIDADO com imagem, voz e respostas recebidas no celular do espectador em 04/09/2026.
- MVP 6: voz neural Fish Audio (`reference_id=a1a7bc39e7ba490a9b51dae6873d21f9`, `s2.1-pro-free`) VALIDADA EM LIVE REAL no celular do espectador em 04/09/2026.
- Correção de cabeçalho WAV de streaming: o Fish Audio entrega `data chunk length = 0xFFFFFF00`, o que fazia o `System.Media.SoundPlayer` abortar em ~600 ms; a função `sanitizeWavHeader()` em `src/tts.js` reescreve os tamanhos reais de `data` e `RIFF`, permitindo reprodução contínua completa (áudios de 10 a 14 segundos reproduzidos com sucesso).
- Diagnóstico histórico de delay (04/09/2026): o registro oficial informa gerações Fish de 1819/2047/2287 ms e inferência/fallback de IA na faixa reportada de 32–38 s. A faixa anterior de 1,3–2,5 s neste handoff não tinha evidência específica e foi substituída por esses valores atribuídos. Nenhuma dessas medidas é resultado ou garantia para a revisão de 06/09/2026; ainda falta medir a versão atual no PC/celular.
- Modo `AI_RESPOND_ALL`: validado com respostas dinâmicas reais; fila descarta duplicatas e respeita serialização.
- Composição no LIVE Studio: Bob enquadrado corretamente com captura de janela `msedge.exe`, cena vertical `Em branco` e modo `Ajustar`, sem câmera real.
- A fonte `Adicionar link` rejeitou o endereço HTTP local na versão testada do LIVE Studio.
- MVP 6/7 — Lip sync dinâmico fonema/visema: PIPELINE TÉCNICO IMPLEMENTADO E AUDITADO EM TESTE CONTROLADO NO WINDOWS (`npm run test:lipsync`) com Fish Audio SSE timestamps, motor PT-BR com 9 visemas, composição sem dupla boca no navegador a 60 fps, fallback seguro sem alignment (`LIP_SYNC_APPROXIMATE_FALLBACK=false`), e 160/160 testes passando (17 suítes). Validação em LIVE real com espectador confirmando no celular: PENDENTE.
- MVP 6 — Falas automáticas por inatividade: revisão complementar publicada; 205 testes encontrados em Linux, 204 aprovados, 0 falhas, 1 dependente de Windows não executado (18 suítes). A alegação anterior de 177/177 não se reproduziu no baseline Linux (174 aprovados, 3 falhas) e fica no relatório histórico. Intervalo de 5 segundos mede elegibilidade após disponibilidade real; geração e transmissão adicionam tempo. Rotação e TTS alternam, preservando prioridade humana; 25 frases por modo, sem repetição imediata. Cancelamento e recuperação cobertos por testes; fala autorizada ao player termina antes da próxima interação. Validação do novo player no Windows, reconexão real e LIVE com espectador: PENDENTES.

## Implementação atual

O comando abaixo ativa a cena Bob, o TTS e a reconexão automática enquanto a conta ainda não entrou ao vivo:

```powershell
npm run live:bob -- familiasilvahumor
```

Durante uma interação elegível:

```text
comentário ia/!ia
  → thinking
  → resposta da IA
  → callback de início do TTS
  → speaking
  → callback de fim do TTS
  → idle
```

A prévia fica em `http://127.0.0.1:3333`. Os MP4s do MVP 4 (`idle`, `thinking`, `speaking`) são reproduzidos **sem áudio e em loop**; a voz desse fluxo vem exclusivamente do provedor TTS selecionado.

Os cinco clipes do MVP 6 em `assets\mvp6\` são a exceção: tocam **com o áudio do próprio arquivo**, uma única vez e sem TTS junto. Para testá-los sem abrir uma LIVE:

```powershell
npm run test:videos -- patrick
```

## Próximo teste obrigatório no Windows

1. inspecionar Git e preservar alterações locais; atualizar `feat/mvp6-auto-speech` apenas com avanço seguro;
2. confirmar os ativos existentes do MVP 4 e os clipes de rotação do MVP 6, sem regenerá-los;
3. executar `npm test`, `npm run test:tts` e `npm run test:lipsync`, com Fish real e fallback aproximado desligado; parar se falhar;
4. confirmar voz, transições e lip sync no PC; usar a prévia do navegador, captura de janela e áudio do sistema já configurados no LIVE Studio;
5. somente com LIVE já ativa e autorizada, executar `npm run live:bob -- familiasilvahumor` com ambiente e rotação habilitados, `AI_RESPOND_ALL=true` e intervalo `5000`;
6. no celular do espectador, observar três ciclos automáticos entre vídeos, comentário em idle, durante preparação e durante fala audível; no modo responder a todos, não exigir prefixo `ia`;
7. observar presente natural ou autorizado, sem exigir compra; confirmar retomada após cada interação, imagem, voz, sincronização e ausência de sobreposição;
8. registrar tempos separados de geração, player local e recepção no celular; se comparar `3000`, encerrar com Ctrl+C, executar no mesmo terminal e restaurar `5000` após o teste.

Não declarar a transmissão validada sem confirmação no dispositivo do espectador.

## Depois do teste

Se funcionar, acrescentar as medições e evidências observadas ao relatório, Drive 03/04 e Issue/PR. Lip sync e o pack provisório já estão implementados: avaliar sua homologação, sem refazer o pipeline. Se falhar, separar o diagnóstico entre fonte visual, captura de áudio, provedor TTS, conexão TikTok e lógica da aplicação. Não fazer merge automático; o PR #16 depende do #15.

## Restrições

- não publicar `.env`, chaves ou tokens;
- `tiktok-live-connector` continua comunitário/não oficial;
- confirmar o escopo da licença informada antes de uso público/comercial;
- não retomar influencer, SaaS ou escala antes do teste real atual.

Procedimento detalhado: [`mvp5-live-bob.md`](mvp5-live-bob.md).

Interação, voz e lip sync: [`mvp6-interaction-voice-lipsync.md`](mvp6-interaction-voice-lipsync.md).

Retrospectiva do LIVE Studio: [`mvp5-live-studio-retrospective.md`](mvp5-live-studio-retrospective.md).

Acompanhamento atual: [Issue #9 — Interação, voz neural e lip sync](https://github.com/vanzer80/liveiapersonagens/issues/9). Histórico: [Issue #8 — Bob Esponja em TikTok LIVE real](https://github.com/vanzer80/liveiapersonagens/issues/8).
