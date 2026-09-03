# MVP 5 — Bob Esponja em TikTok LIVE real

Status: **IMPLEMENTADO NO PROTÓTIPO; TESTE AUDIOVISUAL REAL PENDENTE**.

Acompanhamento: [Issue #8](https://github.com/vanzer80/liveiapersonagens/issues/8).

## Objetivo

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

Em 2026-09-03, o usuário decidiu adiar a influencer e avançar diretamente para uma LIVE prática com o Bob. O primeiro teste mantém o gatilho `ia`/`!ia`, a voz funcional do Windows e apenas uma interação por vez. Presentes, fila e voz neural ficam para os incrementos seguintes.

## O que foi implementado

- cena visual integrada ao comando normal de captura;
- `thinking` durante a geração da IA;
- `speaking` iniciado por `onPlaybackStart`;
- retorno a `idle` por `onPlaybackEnd`;
- retorno seguro a `idle` quando IA ou TTS falham;
- comando único `npm run live:bob -- <usuario>`;
- tentativa automática de conexão enquanto a conta ainda não está ao vivo;
- saída vertical local em `http://127.0.0.1:3333`;
- selo de depuração oculto por padrão;
- áudio dos MP4s sempre mutado na prévia;
- validação obrigatória dos três ativos antes de iniciar a cena.

## Preparação no TikTok LIVE Studio

O suporte atual do TikTok indica o LIVE Studio como a rota para transmitir a partir do Windows. Na versão instalada durante o primeiro teste, a fonte `Adicionar link` rejeitou `http://127.0.0.1:3333` com a mensagem “Digite o URL correto”. A rota operacional validada para a composição local é captura de janela.

1. Iniciar o comando do Bob antes de entrar ao vivo.
2. Abrir a prévia no Edge, preferencialmente em modo aplicativo.
3. Selecionar uma visualização vertical e uma cena `Em branco`, sem fonte de câmera.
4. Adicionar uma captura de **janela**, selecionar `msedge.exe` e usar `Ajustar`.
5. Não usar `Câmera em tela cheia` como configuração final: ela pode bloquear o início da LIVE quando a câmera real está oculta.
6. Não usar a cena `4:3 | Câmera abaixo`: ela prende a fonte em um espaço horizontal.
7. Não usar `Preencher` para corrigir esse espaço, pois corta o personagem; não usar `Expandir`, pois deforma a proporção.
8. Remover fontes antigas de tela inteira e confirmar que somente o Bob aparece.
9. No mixer, ativar o áudio do sistema/dispositivo de saída usado pelo TTS.
10. Manter microfone e outras fontes mutados no primeiro teste quando não forem necessários.
11. Iniciar a LIVE e aguardar a conexão automática do programa.

Referência oficial: [TikTok Support — LIVE pelo navegador usa LIVE Studio no Windows ou OBS](https://support.tiktok.com/en/live-gifts-wallet/tiktok-live/moderating-on-tiktok-live).

Retrospectiva completa da preparação: [`mvp5-live-studio-retrospective.md`](mvp5-live-studio-retrospective.md).

## Teste do espectador

Usar outro celular e, preferencialmente, outra conta:

1. entrar na LIVE;
2. enviar `ia diga olá para mim`;
3. confirmar visualmente `thinking → speaking → idle`;
4. confirmar que a voz foi ouvida pelo celular;
5. enviar uma segunda pergunta iniciada por `ia`;
6. confirmar que a captura e a resposta continuam funcionando.

## Critérios de aceite

- vídeo vertical do Bob recebido por um espectador;
- TTS recebido pelo espectador, não somente ouvido no PC;
- duas respostas consecutivas funcionando;
- transições visuais coerentes com a voz;
- retorno automático a `idle`;
- captura TikTok permanece ativa;
- erros não encerram o processo.

## Fora deste teste

- responder a todos os comentários sem gatilho;
- agradecer presentes automaticamente;
- fila e prioridade;
- voz neural ou imitação vocal definitiva;
- influencer;
- SaaS, cobrança ou escala.

## Regra de encerramento

O MVP 5 só pode ser considerado validado depois que outro dispositivo confirmar imagem e voz durante uma LIVE real. Testes automatizados, prévia local e áudio ouvido no PC não substituem essa evidência.
