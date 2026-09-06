# MVP 5 — Bob Esponja em TikTok LIVE real

Status: **VALIDADO EM TIKTOK LIVE REAL EM 04/09/2026; DOCUMENTO PRESERVADO COMO PROCEDIMENTO E HISTÓRICO DO MARCO**.

> **Nota de estado:** o texto abaixo preserva o procedimento e os critérios usados para chegar à validação. As referências a “primeiro teste”, “pendente” e instruções de preparação descrevem o estágio anterior à evidência de 04/09/2026. O estado vigente do projeto deve ser conferido no README, no Google Drive (`00 - Documento Mestre - Visão do Produto` e `03 - Registro de Decisões e Pendências`) e nas Issues/PRs atuais.

Acompanhamento histórico: [Issue #8](https://github.com/vanzer80/liveiapersonagens/issues/8).

## Resultado que encerrou o marco

Em 04/09/2026, uma TikTok LIVE real confirmou no dispositivo do espectador o fluxo audiovisual do Bob: imagem e voz chegaram ao celular, respostas dinâmicas foram reproduzidas e o ciclo visual `idle → thinking → speaking → idle` permaneceu coordenado pelos callbacks do TTS. A validação posterior da voz Fish Audio registrou três respostas dinâmicas consecutivas recebidas pelo espectador, superando o critério mínimo de duas respostas consecutivas deste marco.

Essa evidência encerra a pendência central do MVP 5. Melhorias posteriores — voz neural, fila, presentes, vídeos acionáveis, lip sync fonema/visema e falas automáticas — pertencem aos incrementos seguintes e não reabrem o marco audiovisual já validado.

## Objetivo histórico

Confirmar em um dispositivo de espectador o fluxo completo:

```text
comentário com ia/!ia
  → captura TikTok
  → estado thinking
  → resposta textual
  → TTS dinâmico
  → estado speaking
  → TikTok LIVE Studio transmite imagem e áudio
  → retorno ao idle
```

## Decisão de escopo

Em 2026-09-03, o usuário decidiu adiar a influencer e avançar diretamente para uma LIVE prática com o Bob. O primeiro teste manteve o gatilho `ia`/`!ia`, a voz funcional do Windows e apenas uma interação por vez. Presentes, fila e voz neural ficaram para os incrementos seguintes.

## O que foi implementado para o marco

- cena visual integrada ao comando normal de captura;
- `thinking` durante a geração da IA;
- `speaking` iniciado por `onPlaybackStart`;
- retorno a `idle` por `onPlaybackEnd`;
- retorno seguro a `idle` quando IA ou TTS falham;
- comando único `npm run live:bob -- <usuario>`;
- tentativa automática de conexão enquanto a conta ainda não está ao vivo;
- saída vertical local em `http://127.0.0.1:3333`;
- selo de depuração oculto por padrão;
- áudio dos MP4s mutado na prévia dinâmica;
- validação obrigatória dos três ativos antes de iniciar a cena.

## Preparação no TikTok LIVE Studio

Na versão instalada durante o primeiro teste, a fonte `Adicionar link` rejeitou `http://127.0.0.1:3333` com a mensagem “Digite o URL correto”. A rota operacional usada foi captura de janela.

1. Iniciar o comando do Bob antes de entrar ao vivo.
2. Abrir a prévia no Edge, preferencialmente em modo aplicativo.
3. Selecionar uma visualização vertical e uma cena `Em branco`, sem fonte de câmera.
4. Adicionar uma captura de **janela**, selecionar `msedge.exe` e usar `Ajustar`.
5. Não usar `Câmera em tela cheia` como configuração final: ela pode bloquear o início da LIVE quando a câmera real está oculta.
6. Não usar a cena `4:3 | Câmera abaixo`: ela prende a fonte em um espaço horizontal.
7. Não usar `Preencher` para corrigir esse espaço, pois corta o personagem; não usar `Expandir`, pois deforma a proporção.
8. Remover fontes antigas de tela inteira e confirmar que somente o Bob aparece.
9. No mixer, ativar o áudio do sistema/dispositivo de saída usado pelo TTS.
10. Manter microfone e outras fontes mutados quando não forem necessários.
11. Iniciar a LIVE e aguardar a conexão automática do programa.

Retrospectiva completa da preparação: [`mvp5-live-studio-retrospective.md`](mvp5-live-studio-retrospective.md).

## Teste do espectador usado como critério

O teste de encerramento exigia outro celular e, preferencialmente, outra conta para:

1. entrar na LIVE;
2. enviar comentário elegível;
3. confirmar visualmente o ciclo de estados;
4. confirmar que a voz foi ouvida pelo celular;
5. enviar uma segunda interação;
6. confirmar que captura e resposta continuavam funcionando.

## Critérios de aceite

- [x] vídeo vertical do Bob recebido por um espectador;
- [x] TTS recebido pelo espectador, não somente ouvido no PC;
- [x] duas ou mais respostas consecutivas funcionando;
- [x] transições visuais coerentes com a voz no fluxo validado;
- [x] retorno automático a `idle`;
- [x] captura TikTok permaneceu operacional durante a validação;
- [x] tratamento de erro/retorno seguro preservado pela implementação e regressões automatizadas;
- [x] resultado e limitações documentados.

## Fora deste marco histórico

- responder a todos os comentários sem gatilho;
- agradecer presentes automaticamente;
- fila e prioridade;
- voz neural principal;
- lip sync fonema/visema;
- falas automáticas por inatividade;
- influencer;
- SaaS, cobrança ou escala.

## Regra de encerramento

O marco exigia evidência no dispositivo do espectador; prévia local, teste automatizado ou áudio ouvido apenas no PC não seriam suficientes. Essa exigência foi atendida em 04/09/2026. Validações posteriores devem continuar distinguindo claramente teste local/Windows de recepção em LIVE real.
