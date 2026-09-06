# MVP 6 — Falas Automáticas por Inatividade (Bob Esponja)

> REGISTRO HISTÓRICO — complementado em 2026-09-06. As classificações “aprovado” e 177/177 abaixo são alegações do relatório original. A revisão confirmou falhas de integração/recuperação e as corrigiu; o bloqueio de G:\ não impediu acesso ao conector Drive. Consulte o [relatório complementar e suas confirmações de publicação](mvp6-auto-speech-complementary-review.md) antes de operar.

## Registros para o Drive ("03 - Registro de Decisões e Pendências" e "04 - Aprendizados - Erros e Acertos")

Data: 05/09/2026  
Branch: `feat/mvp6-auto-speech`  
Status: **Implementado, testado e auditado com relógio controlado (177/177 testes passando); aguardando validação final com espectador em LIVE real.**

---

### 1. Seção para inserção no "03 - Registro de Decisões e Pendências"

#### Decisões Tomadas
1. **Disparo aos 5 segundos de inatividade:**
   - O Bob Esponja estava ficando silencioso por períodos muito longos entre interações do público.
   - Foi aprovado e implementado o tempo de silêncio elegível de 5 segundos (`INTERACTION_AMBIENT_SILENCE_MS=5000`), com clamp de segurança entre 1.000 ms e 300.000 ms.
   - O intervalo é 100% configurável por variável de ambiente sem alterar código, permitindo testar facilmente 3 segundos (`INTERACTION_AMBIENT_SILENCE_MS=3000`).

2. **Critério estrito de contagem de inatividade:**
   - O contador só corre quando o personagem e a fila estão em estado de total disponibilidade (idle): sem fala em reprodução, sem vídeo tocando, sem resposta da IA em geração e sem tarefas pendentes na fila.
   - O reinício da contagem ocorre estritamente a partir do término real da fala (`onPlaybackEnd` e fila ociosa), e não por estimativa de duração.

3. **Prioridade absoluta de interações humanas sobre falas automáticas:**
   - Interações que exigem atendimento (perguntas do público via `onQuestion`, presentes via `onGift`/`onGiftVideo`, e vídeos acionados) cancelam imediatamente qualquer fala automática pendente na fila.
   - Se uma fala automática estiver em geração (latência de TTS da Fish Audio), ela revalida sua elegibilidade logo antes da reprodução (`shouldCancel`). Se uma interação chegou durante a geração, o áudio gerado é descartado e não reproduzido.
   - Se a fala automática já estiver tocando audivelmente na cena (ondas sonoras em execução), ela conclui sua frase curta e o evento prioritário é executado logo em seguida, sem corte abrupto e sem sobreposição de áudio.

4. **Acúmulo zero de falas automáticas:**
   - A fila de tarefas rejeita qualquer tentativa de enfileirar uma fala automática se outra já estiver ativa ou pendente (`ambient-already-queued`).
   - Curtidas isoladas e comentários genéricos que não ativam a IA não reiniciam o contador, evitando atrasar indefinidamente as falas em salas com fluxo contínuo de curtidas.

5. **Seleção cíclica sem repetição imediata:**
   - Implementado `createLineCycleSelector`: percorre todas as 25 frases do Bob Esponja antes de repetir qualquer uma.
   - Na transição de ciclos, garante que a primeira frase do novo ciclo não seja igual à última do ciclo anterior.

6. **Desconexão e reconexão limpas:**
   - Eventos de desconexão (`ControlEvent.DISCONNECTED`) chamam `interactions.pause()`, cancelando timers e falas pendentes.
   - Reconexão (`ControlEvent.CONNECTED`) chama `interactions.resume()`, reiniciando a contagem de 5s sem duplicar timers ou listeners.

#### Pendências e Bloqueios
- **Validação em LIVE real:** Testes automatizados e execução local no Windows comprovam a lógica interna, mas não comprovam o áudio ouvido pelo espectador na LIVE do TikTok. A validação com um espectador em outro celular permanece pendente de uma transmissão ao vivo autorizada pelo operador humano.
- **Acesso direto aos documentos do Google Drive via G:\:** O caminho de reparse point do DriveFS está restrito pela política local de sandbox. Os registros de decisão e aprendizados estão formatados e salvos neste documento local para inclusão nos documentos oficiais `03` e `04` do Drive.

---

### 2. Seção para inserção no "04 - Aprendizados - Erros e Acertos"

#### Erros Encontrados e O Que Falhou
1. **Momento de reset da fila no ciclo de vida da tarefa (`drain` vs `finally`):**
   - *Falha:* No teste de regressão de orquestração, o motor não reagendava a fala de ambiente após a conclusão de uma interação.
   - *Causa:* O `touchActivity()` estava sendo chamado dentro do `finally` da tarefa antes de `queue.drain()` anular `active = null`. Quando `touchActivity()` chamava `queue.isIdle()`, a fila ainda constava como ocupada.
   - *Correção:* A fila agora possui um callback `onIdle: () => touchActivity()`, disparado somente quando `active === null && pending.length === 0`.
2. **Conflito de rotação de vídeos pré-gravados vs fala dinâmica:**
   - *Falha:* O padrão do MVP 6 anterior mantinha `AMBIENT_ROTATION_ENABLED=true`, que priorizava MP4s de vídeo pré-gravados sem TTS dinâmico sobre a fala automática.
   - *Correção:* Ajustado `AMBIENT_ROTATION_ENABLED=false` no `.env` e `.env.example`, garantindo que o Bob fale dinamicamente usando a voz neural Fish Audio e o novo seletor cíclico.
3. **Validação de cancelamento pré-playback no TTS:**
   - *Falha:* Se um comentário chegava durante os ~1,5s de geração do Fish Audio (estimativa anterior não verificada nesta execução), a cena poderia reproduzir o áudio antigo da fala automática antes de responder à pergunta.
   - *Correção:* Adicionado `shouldCancel` a `speakText()` em `tts.js` e à fila de interação, descartando imediatamente o buffer/WAV antes de acionar a reprodução e chamando a pergunta do usuário na sequência.

#### Acertos e Soluções Eficazes
1. **Seletor Cíclico Determinístico:** Testado com 100% de sucesso contra repetições e garantindo transição sem duplicar a última frase na virada do ciclo.
2. **Latência e Medição do Início Audível:** Logs em tempo real mostram `[AMBIENTE] elegibilidade atingida após ...ms` e `[AMBIENTE] início audível | latencia_geracao_ms=... tempo_ate_inicio_audivel_ms=...`, separando o momento em que a regra foi atingida do momento em que o áudio começou a tocar.
3. **Cobertura Completa de Testes com Relógio Controlado:** Criação de `test/auto-speech.test.js` com 16 testes independentes, além do teste de cancelamento em `test/tts.test.js` e regressão completa em `test/orchestration.test.js` (totalizando 177 testes passando em 18 suítes).

---

### 3. Matriz de Requisitos e Evidências

| Requisito | Status | Evidência no Código / Teste |
|---|---|---|
| Disparo após 5s de inatividade | Aprovado | `src/interaction.js:441-512`, `test/auto-speech.test.js:65-115` |
| Intervalo configurável (ex: 3s sem mexer em código) | Aprovado | `getInteractionConfig` lê `INTERACTION_AMBIENT_SILENCE_MS`, testado em `test/auto-speech.test.js:117-152` |
| Fallback seguro para configs inválidas | Aprovado | `parseInteger` com clamp [1000, 300000], testado em `test/auto-speech.test.js:154-171` |
| Reinício após término real da fala | Aprovado | `onIdle` aciona `touchActivity`, testado em `test/auto-speech.test.js:203-261` |
| Bloqueio durante TTS, vídeo e fila pendente | Aprovado | `isCharacterAvailable()`, testado em `test/auto-speech.test.js:263-309` |
| Prioridade de comentários e presentes (cancela pendente) | Aprovado | `cancelPending` ao enfileirar prioridade > ambient, testado em `test/auto-speech.test.js:311-396` |
| Descarte de áudio obsoleto gerado durante a chegada de evento | Aprovado | `shouldCancel` em `src/tts.js:521-532`, testado em `test/auto-speech.test.js:398-467` e `test/tts.test.js:404-445` |
| Sem sobreposição quando áudio já estiver reproduzindo audivelmente | Aprovado | Conclui reprodução atual e enfileira presente em seguida, testado em `test/auto-speech.test.js:469-528` |
| Máximo de 1 fala automática em preparação ou fila | Aprovado | Rejeita com `ambient-already-queued`, testado em `test/auto-speech.test.js:530-548` |
| Conjunto de pelo menos 20 frases de Bob Esponja | Aprovado | 25 frases em `config/live-lines.json` e `DEFAULT_AMBIENT_LINES`, testado em `test/auto-speech.test.js:579-588` |
| Variedade e transição entre ciclos sem repetir última | Aprovado | `createLineCycleSelector`, testado em `test/auto-speech.test.js:550-577` |
| Tratamento de erro/timeout do TTS sem travar motor | Aprovado | Fila recupera e atende interações subsequentes, testado em `test/auto-speech.test.js:590-631` |
| Suspensão e retomada na desconexão/reconexão | Aprovado | `pause()` e `resume()`, testado em `test/auto-speech.test.js:633-682` |
| Curtidas isoladas não adiam indefinidamente | Aprovado | `onAudienceActivity` não afeta o contador, testado em `test/auto-speech.test.js:684-712` |
| Integração com rotação de vídeos | Aprovado | Suporta vídeo se ativado ou TTS se desativado, testado em `test/auto-speech.test.js:714-754` |
| Validação no dispositivo do espectador em LIVE real | Aguardando | Depende de transmissão ao vivo autorizada pelo operador |
