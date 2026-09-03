# MVP 5 — Retrospectiva da preparação no TikTok LIVE Studio

Status: **COMPOSIÇÃO LOCAL PREPARADA; TRANSMISSÃO AO ESPECTADOR PENDENTE**.

Esta retrospectiva registra a primeira preparação real do Bob Esponja no Windows com o TikTok LIVE Studio. O objetivo é impedir que os mesmos erros de caminho, captura e proporção sejam repetidos.

## Evidências confirmadas

1. O repositório foi atualizado de `5bdbf93` para `482a4ba` por fast-forward.
2. `npm ci` instalou 60 pacotes e a auditoria local não encontrou vulnerabilidades conhecidas.
3. O `.env` foi localizado sem expor seu conteúdo.
4. Os três ativos foram encontrados:
   - `spongebob-idle-v1.mp4`;
   - `spongebob-thinking-v1.mp4`;
   - `spongebob-speaking-v1.mp4`.
5. A autenticação OpenRouter foi validada.
6. A prévia abriu em `http://127.0.0.1:3333` com `spongebob-idle-v1.mp4`.
7. A reconexão automática tentou novamente enquanto a conta estava offline e conectou na quarta tentativa.
8. A sala conectada foi `roomId=7681365263506066192`, e eventos de entrada e like começaram a chegar.
9. O TikTok LIVE Studio capturou a janela do Edge e exibiu o Bob corretamente após a troca para a cena `Câmera em tela cheia`.

## Erros, causas e correções

| Tentativa | Sintoma | Causa confirmada | Correção ou aprendizado |
| --- | --- | --- | --- |
| `cd C:\caminho\liveiapersonagens` | caminho não encontrado | `C:\caminho` era apenas um marcador de exemplo | usar o caminho real `C:\liveiapersonagens` ou verificar `Get-Location` antes de mudar de pasta |
| segundo `cd prototypes\tiktok-live-node` | tentou entrar em uma pasta duplicada | o PowerShell já estava dentro de `prototypes\tiktok-live-node` | não repetir `cd`; confirmar a pasta atual antes de executar comandos |
| `UserOfflineError` nas primeiras tentativas | conector não encontrou a LIVE | a conta ainda não estava ao vivo | comportamento esperado; a reconexão automática funcionou e deve ser mantida |
| fonte `Adicionar link` rejeitou `http://127.0.0.1:3333` | mensagem “Digite o URL correto” | a versão instalada do LIVE Studio não aceitou o endereço HTTP local nessa fonte | usar captura de janela como rota operacional principal; não insistir na fonte de link local |
| primeira captura mostrou código, navegador e barra de tarefas | composição inadequada | foi capturada a tela inteira | selecionar uma janela específica, não o monitor completo |
| captura `chrome.exe` mostrou o Bob pequeno | personagem ocupava apenas uma faixa | a cena estava em `4:3 | Câmera abaixo`, com um espaço horizontal fixo | trocar a cena para `Câmera em tela cheia` |
| `Preencher` | Bob apareceu cortado | o vídeo vertical estava sendo recortado para caber no espaço horizontal 4:3 | não usar `Preencher` enquanto a cena estiver com proporção incompatível |
| `Expandir` ou redimensionamento lateral | personagem deformado | a fonte foi esticada fora da proporção original | preservar proporção e usar `Ajustar` em uma cena vertical compatível |
| Edge em modo aplicativo | removeu a barra, mas não corrigiu sozinho o corte | o formato da janela não era a causa principal; a cena 4:3 continuava limitando a fonte | modo aplicativo é útil para uma captura limpa, mas a correção decisiva é `Câmera em tela cheia` |

## Configuração que funcionou

- prévia Node ativa em `127.0.0.1:3333`;
- Edge aberto em modo aplicativo para evitar barra de endereço;
- fonte de captura de **janela**, identificada como `msedge.exe`;
- somente a janela do Bob mantida como fonte visual;
- cena do LIVE Studio: **`Câmera em tela cheia`**;
- modo de encaixe: **`Ajustar`**;
- Bob inteiro, vertical e sem deformação na prévia do Studio.

Comando opcional para abrir a prévia como aplicativo do Edge:

```text
msedge.exe --app=http://127.0.0.1:3333 --window-size=540,960
```

## Procedimento operacional revisado

No PowerShell:

```powershell
cd C:\liveiapersonagens
git pull origin main
cd .\prototypes\tiktok-live-node
npm ci
npm run live:bob -- luisbossgpt
```

Se o PowerShell já estiver em `C:\liveiapersonagens\prototypes\tiktok-live-node`, executar somente o último comando. Não usar literalmente `C:\caminho\...`.

No TikTok LIVE Studio:

1. selecionar uma visualização vertical;
2. escolher a cena `Câmera em tela cheia`;
3. adicionar uma captura de janela;
4. selecionar `msedge.exe` com a prévia do Bob;
5. usar `Ajustar` e manter a proporção original;
6. remover fontes antigas de tela inteira;
7. ativar o áudio do sistema;
8. somente então iniciar a LIVE.

## O que ainda não foi validado

- início da transmissão a partir dessa composição do LIVE Studio;
- imagem recebida em outro celular;
- TTS recebido pelo espectador, e não apenas no PC;
- comentário real acionando `thinking → speaking → idle` nessa transmissão;
- duas respostas consecutivas;
- continuidade dos eventos após as respostas;
- comportamento após eventual desconexão de uma LIVE já conectada.

## Regra para diagnóstico do próximo teste

- Bob não aparece no celular: verificar cena e fonte do LIVE Studio.
- Bob aparece, mas não há voz: verificar áudio do sistema e mixer.
- Comentário não aparece no terminal: verificar conexão do TikTok.
- Comentário aparece, mas não há resposta: verificar decisão da IA e OpenRouter.
- Resposta aparece e o TTS toca no PC, mas não no celular: problema de captura de áudio no LIVE Studio.
- Bob fica cortado ou deformado: confirmar `Câmera em tela cheia` e `Ajustar`; não tentar compensar com `Preencher` ou `Expandir`.

## Próxima evidência obrigatória

Iniciar a LIVE pelo Studio e confirmar, em outro celular, imagem, voz, duas respostas e retorno a `idle`. Até essa confirmação, o MVP 5 permanece aberto.
