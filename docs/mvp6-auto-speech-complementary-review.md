# Revisão complementar — falas automáticas por inatividade

Data: 2026-09-06. **Relatório parcial de homologação: correções e testes disponíveis concluídos; Windows com Fish Audio real e LIVE com espectador pendentes.** Não houve transmissão iniciada, compra de presente nem acesso ao computador do usuário.

## Estado verificado antes da edição

- GitHub remoto: `feat/mvp6-auto-speech` em `9533a0c22e82f29585593655e6a96d4f924331f9`, confirmado por conector e `git ls-remote`.
- Pai: `cd96ca981431cdfe7af7ea3e4ae8973bfb7e0e7d`, branch `feat/mvp6-lip-sync`. PR #15 aberto, sem merge, base `main` em `94ddacfa8808a806c74eb3c98f95efc7c4c7c7fd`. A revisão de falas depende desse código de lip sync; o PR #16 foi criado com base em `feat/mvp6-lip-sync` e permanece rascunho até homologação. Não trocar o PR #15 nem integrá-lo automaticamente.
- Pesquisa e listagem direta `/pulls?state=all&head=vanzer80:feat/mvp6-auto-speech`: nenhum PR existente no início. `/pull/new/...` não era um PR criado.
- `AGENTS.md` não existe na árvore auditada. Lidos `CONTRIBUTING.md`, README raiz/protótipo, continuidade, relatório anterior, código/testes pertinentes e Issue #9.
- Drive: lidos `00 - Documento Mestre - Visão do Produto`, `03 - Registro de Decisões e Pendências` e `04 - Aprendizados - Erros e Acertos`. O conector está disponível. O bloqueio anterior de `G:\` não demonstrava falha do conector.
- Ambiente executor: Linux x86_64, Node v24.19.0, npm 11.9.0; sem `pwsh`, `powershell.exe`, `gh`, acesso a `C:\liveiapersonagens`, sessão de LIVE ou celular de espectador. Foram executados os equivalentes Git no Linux, sem alegar execução PowerShell.
- Cópia isolada criada por `git clone --no-checkout` e checkout inicial da branch remota. `git status --short --branch`, `git branch --show-current`, `git log -5 --oneline`, `git show --stat 9533a0c`, `git diff --stat` e `git diff --cached --stat` confirmaram branch e árvore limpa antes da edição. Cópias antigas encontradas em scratch tinham inclusive alterações locais; foram preservadas. Nenhum reset, limpeza, stash ou alteração do `.env` do Windows.

## Problemas confirmados e correções

| Achado | Correção e justificativa |
|---|---|
| Rotação sempre vencia a seleção ambiente; TTS só aparecia com rotação indisponível/desligada | Alternância na mesma fila: um vídeo, depois uma fala TTS, sempre após a disponibilidade e o intervalo configurado. Mantém a sequência de clipes e impede monopólio dos vídeos. |
| `live:bob` e `.env.example` tinham rotação desligada por padrão | Padrão restaurado para `true`; valor explícito `false` permanece respeitado. Nenhum `.env` existente foi sobrescrito. |
| MP4 silencioso podia ocupar a fila até o limite genérico | Manifesto aceita `hasSpeech:false`, reproduz mutado e limita ocupação ao intervalo ambiente. Os nove clipes existentes continuam considerados falados. Vídeos desconhecidos não são presumidos silenciosos. |
| Fila cancelava apenas itens `kind=ambient`, deixando vídeo ambiente pendente | Cancelamento por prioridade ambiente inclui MP4; pergunta/presente seguem a prioridade original e esperam uma fala já autorizada ao player terminar. |
| Faixa MIN/MAX no `.env` anulava o comando de intervalo fixo de 3s | `INTERACTION_AMBIENT_SILENCE_MS` explícito prevalece sobre MIN/MAX. Sem fixo, a faixa antiga continua funcionando. |
| Configurações explícitas de cooldown/ordem da rotação eram sobrepostas pelo JSON | Mantidos indicadores de origem; cooldown explícito e `SHUFFLED=false` explícito prevalecem. |
| Convites exigiam `ia` em qualquer modo, incluindo promessa “respondo tudo” | JSON e fallback interno usam variantes `trigger`/`respondAll`; `{trigger}` usa o gatilho configurado. Strings comuns continuam aceitas; preservadas 25 frases por modo e seleção sem repetição imediata. Convite MP4 ambiente que ensina gatilho fica fora do modo respondAll. |
| Membros aguardando agrupamento não contavam como interação pendente | Agrupamento e abertura pendente bloqueiam ambiente. O relógio reinicia quando a fila realmente termina, incluindo limpeza visual. |
| Pause seguido de resume durante síntese podia ressuscitar fala obsoleta | Época de cancelamento persistente e AbortSignal; pausa/stop descartam fila pendente e membros antigos; repetição de pause/resume/stop não duplica timers. |
| `shouldCancel` só era conferido antes de lançar PowerShell | Player carrega WAV, emite READY e espera autorização PLAY/CANCEL pelo stdin. Node revalida nesse momento; geração pode ser abortada imediatamente. |
| Parser de stdout perdia marcador fragmentado; callback de início podia terminar depois do fim; havia início sintético após processo encerrado | Buffer por linhas, evento único, espera do callback assíncrono e erro explícito se o marcador não chegar. Nada de “início confirmado” fabricado após encerramento. |
| PowerShell sem timeout e erros retornados do TTS ignorados pelo motor | Processo com limite, encerramento e espera de close; orçamento de geração 65s (inclui fallback) e player 60s. Fish mantém limites de requisição de 35s/30s. Falhas ambiente passam a esperar 15/30/60s, sem bloquear perguntas/presentes. |
| Exceção do speaker podia deixar thinking/speaking ativo | Cena limpa em finally; erro depois do início emite fim local com status error. Ctrl+C aguarda término da tarefa ativa antes de fechar a prévia. |
| Timeout de vídeo dependia só do servidor | Prévia recebe prazo absoluto; JS pausa e muta vídeo antes de reportar fim/erro/limite. Respostas de estado atrasadas não restauram revisões antigas. |

O intervalo mede **elegibilidade**, não garante áudio em exatamente 5s: geração, inicialização do player e transmissão adicionam tempo. Com ambos habilitados, o primeiro item ambiente preserva a rotação; o próximo é TTS. Após interação humana, a alternância continua do ponto em que estava. Curtidas e comentários não selecionados continuam sem adiar indefinidamente o ambiente.

## Arquivos desta revisão

- `src/interaction.js`: arbitragem, relógio/configuração, variantes de frases, cancelamento persistente, recuperação e shutdown.
- `src/tts.js`: cancelamento de geração, prontidão do player, stdout por linhas, deadlines, callbacks e métricas locais.
- `src/live-scene.js`: propagação de callbacks/sinal e limpeza em finally; muting/limite do clipe silencioso.
- `src/scene-preview.js`: prazo de mídia, pausa/mute antes do término, proteção contra revisão atrasada.
- `src/index.js`: conexão entre módulos, escolha de convites, opções de rotação e espera no shutdown.
- `src/live-bob.js`, `.env.example`, `src/ambient-rotation.js`, `config/live-lines.json`: padrões, preservação de opções e manifesto/frases.
- `test/auto-speech-integration.test.js`: 17 testes novos de convivência, prioridades, relógio, estados, timers, modos, rollback e JS servido.
- `test/tts-recovery.test.js`: 9 testes novos de transporte, cancelamento, timeout e recuperação.
- `test/ambient-rotation.test.js`: 1 regressão de configuração explícita.
- `src/lipsync-smoke.js` e `test/lipsync-smoke.test.js`: CLI deixa de anunciar sucesso/exit 0 após erro TTS ou ausência de alignment; teste executa o comando real com provedor inválido, sem rede/áudio.
- `test/tts.test.js`: teste Windows usa o adaptador/PLAY_WAV_SCRIPT de produção e marca dependência de plataforma; testes Fish usam configuração falsa explícita e player injetado, sem chaves reais nem rede externa.
- README raiz/protótipo, documentos de continuidade/rotação/relatório anterior, este relatório e evidências: contexto atualizado sem apagar histórico.

## Execução, erros e acertos

1. `npm ci --ignore-scripts --no-audit --no-fund`: concluído, 60 pacotes. Aviso de configuração npm `http-proxy` desconhecida, sem impacto no teste; não instalamos ferramentas adicionais.
2. Baseline `npm test` no commit original: **177 testes, 18 suítes, 174 aprovados, 3 falhas, 0 ignorados**, exit 1. A alegação de 177/177 do relatório não se reproduziu neste ambiente.
3. Uma falha era `spawn powershell.exe ENOENT`; outras duas dependiam do `.env`/provedor do executor, em vez de preparar seu próprio cenário Fish. O teste anterior de descarte nem comprovava o cancelamento durante geração.
4. Primeira iteração de código: 175 aprovados, 2 falhas; corrigido o isolamento dos testes Fish e a classificação explícita do teste Windows. Não foi removido requisito para obter aprovação.
5. Testes específicos: `node --test test/auto-speech-integration.test.js` (16/16 antes de adicionar o teste JS servido); `node --test test/tts.test.js test/tts-recovery.test.js` (26 testes: 25 aprovados, 1 Windows não executado). As adições finais estão na suíte completa.
6. Resultado final Linux: **205 testes encontrados, 18 suítes, 204 aprovados, 0 falhas, 1 não executado**, exit 0. O teste não executado exige Windows/SoundPlayer. O arquivo [`evidence/auto-speech-2026-09-06/npm-test-linux.txt`](evidence/auto-speech-2026-09-06/npm-test-linux.txt) guarda a saída. [`baseline-summary.txt`](evidence/auto-speech-2026-09-06/baseline-summary.txt) registra o estado original.
7. Sintaxe verificada com `node --check` nos módulos alterados e `git diff --check` sem erros; diff revisado. Nenhum teste Windows foi classificado como aprovado por passar em Linux.

8. Achado adicional na inspeção operacional: `test:lipsync` encerrava com sucesso mesmo após falha de TTS e imprimia `fallback=false` sem evidência. Agora retorna código 1 se houve erro/sem alignment e deixa a homologação visual para o operador. A regressão executa o CLI real sem rede nem áudio.
9. Tentativa `git push origin feat/mvp6-auto-speech` falhou: `could not read Username for https://github.com`. A publicação funcionou pelo conector GitHub autenticado, com criação de árvore/commit e avanço de referência sem force. Árvore publicada e árvore testada coincidem. Os commits locais preliminares foram preservados em referência separada; não foram apresentados como commits remotos.
10. A regra existente `*.log` impediu incluir a saída de teste. A evidência foi renomeada para `.txt`, preservando a política do repositório; não foi forçada a inclusão de logs ignorados.
11. A primeira gravação no Google Docs falhou com HTTP 400 porque a data nativa não aceitava `locale=pt`; o lote não foi aplicado. O formato aceito `locale=en` foi usado na retomada. Antes dela, a revisão automática havia rejeitado a gravação por limite de uso; o bloqueio foi informado, sem tentativa de contorno. Após o usuário pedir continuidade, ambos os documentos foram gravados e relidos com sucesso, preservando todo o histórico.

## Medições e origem

| Medida | Origem / limite |
|---|---|
| Elegibilidade em 5000 ms; alternativa 3000 ms | Relógio virtual dos testes; prova lógica, sem medir latência acústica. |
| Retentativas em 15/30/60s | Relógio virtual, falhas retornadas e lançadas; perguntas continuam atendidas. |
| Timeout real de teste em 25ms/35ms | Fetch simulado com AbortSignal e subprocesso Node real respectivamente; prova cancelamento, não Fish/PowerShell. |
| Geração real Fish desta revisão | Não medida: sem credenciais/Windows nesta cópia. |
| Playback acústico e atraso ao espectador desta revisão | Não medidos: exigem PC e celular. |
| Valores antigos 1819/2047/2287ms de Fish | Registro oficial da LIVE anterior, não resultado destas correções. Não transportar a faixa como SLA. |

Logs novos distinguem `[AMBIENTE] elegibilidade`, `[TTS] gerando`/`áudio gerado`/`fim_geracao`, `inicio_reproducao_local` e `fim_reproducao_local`. `generationLatencyMs` mede síntese; `playbackDurationMs` mede do marcador ao término do processo; `elegibilidade_ate_player_ms` inclui síntese e inicialização/callback. O marcador é emitido junto da chamada local PlaySync, **não é instante acústico exato e não confirma recepção pelo espectador**. A janela entre autorização PLAY e execução física existe; sem controle físico do dispositivo não prometemos cancelamento amostra a amostra. A antiga referência ~1,5s de geração do relatório fica classificada como estimativa sem evidência dessa execução.

## Matriz de requisitos e homologação

| Requisito | Evidência disponível | Situação |
|---|---|---|
| Intervalo de 5s após disponibilidade, alternativa 3s | auto-speech + integration; precedência de config | Automatizado aprovado |
| Bloqueio durante IA, áudio, vídeo e agrupamento pendente | fila serial + integration | Automatizado aprovado |
| Rotação e TTS habilitados, 3 ciclos TTS sem monopólio | integration, rotação real com I/O controlada | Automatizado aprovado |
| Vídeo falado exclui TTS; vídeo silencioso tem limite | integration + JS servido em VM + prévia HTTP | Automatizado aprovado; navegador Windows pendente |
| Comentário/presente prioriza sobre ambiente pendente | testes originais + integration | Automatizado aprovado |
| Cancelamento durante síntese/prontidão; sem cortar frase autorizada | tts-recovery, auto-speech | Automatizado aprovado; áudio físico pendente |
| Uma fala automática e timers únicos | auto-speech + integration | Automatizado aprovado |
| Pause/resume/stop sem ressuscitar geração; encerrar após mídia ativa | integration + transporte com subprocesso | Automatizado aprovado; reconexão TikTok real pendente |
| Erro/timeout libera fluxo, espaça tentativas e restaura idle | integration + tts-recovery | Automatizado aprovado |
| Frases nos dois modos, fallback, variedade sem repetição imediata | quatro combinações em integration | Automatizado aprovado |
| SoundPlayer real e novo protocolo READY/PLAY | teste específico condicional | Não executado aqui |
| Fish Audio real e sincronização de cena no Windows | `test:tts`, `test:lipsync` inspecionados | Pendente |
| Três ciclos e comentários idle/preparação/audível na LIVE | roteiro abaixo | Pendente |
| Presente, retomadas, rotação, ausência de sobreposição e lip sync no celular | roteiro abaixo | Pendente; não comprar presente sem autorização |
| Commit publicado, PR real e Issue | GitHub relido; hashes e URLs abaixo | Confirmado, sem merge |
| Drive 03 e 04 | conteúdo relido, histórico comparado e data nativa verificada | Atualizados efetivamente |

## Participação mínima no Windows e LIVE

A cópia do usuário não foi inspecionada por acesso remoto. Antes de atualizar, preservar qualquer diff local; usar checkout/pull apenas com árvore limpa e avanço seguro. O bloco operacional final do atendimento usa uma única sessão PowerShell, confere branch, executa testes e configura variáveis da sessão, sem imprimir `.env` ou chaves.

1. Rodar `npm test` no Windows e registrar a contagem efetiva. Rodar `npm run test:tts` e `npm run test:lipsync` (scripts existentes e inspecionados), confirmar voz Fish no PC, transições e retorno ao idle. Se um falhar, parar antes de conectar à LIVE e fornecer só o erro relevante.
2. Com LIVE já ativa e autorizada, rodar `npm run live:bob -- familiasilvahumor` com `LIP_SYNC_ENABLED=true`, `LIP_SYNC_APPROXIMATE_FALLBACK=false`, `AI_RESPOND_ALL=true`, `TTS_PROVIDER=fish-audio`, `INTERACTION_AMBIENT_ENABLED=true`, `AMBIENT_ROTATION_ENABLED=true`, `INTERACTION_AMBIENT_SILENCE_MS=5000`. `live:bob` já habilita `INTERACTION_ENABLED` e `TTS_ENABLED`; não precisa de outro terminal nem processo de preview separado.
3. No celular de espectador, observar três falas TTS automáticas consecutivas entre os clipes. Enviar comentário em idle, outro enquanto aparece geração TTS e outro durante frase já ouvida. Confirmar descarte antes do player, conclusão de frase iniciada, resposta e retomada após cada cenário.
4. Observar um presente recebido naturalmente ou enviado com autorização. Sem isso, marcar presente como pendente; não exigir compra. Confirmar fila, vídeo e ausência de agradecimento duplicado.
5. Registrar horário/intervalo de cada cenário e o que foi efetivamente visto/ouvido no celular: imagem, voz, boca, sobreposição e retomada. Um trecho de log do PC sozinho não comprova o espectador.
6. Para comparar 3s: Ctrl+C, aguardar encerramento, definir `INTERACTION_AMBIENT_SILENCE_MS=3000` e rodar novamente o mesmo `live:bob`. Ao terminar, Ctrl+C e restaurar `5000` na mesma sessão. Nunca manter dois processos.

## Reversão segura

- Preferência operacional validada por teste: encerrar com Ctrl+C e definir `INTERACTION_AMBIENT_ENABLED=false` antes de reiniciar. Isso desabilita **todo conteúdo ambiente do motor**, incluindo rotação automática; perguntas e presentes continuam. Reativar com `true` e intervalo `5000`.
- Para usar somente TTS ambiente, manter ambiente ligado e definir `AMBIENT_ROTATION_ENABLED=false`; valor explícito é respeitado. Não confundir isso com rollback do adaptador TTS.
- Se a correção do adaptador precisar ser revertida, criar branch de correção a partir do HEAD verificado, aplicar `git revert` somente no commit de correção listado abaixo, executar testes e revisar antes do push. Não fazer reset nem troca presumida para `feat/mvp6-lip-sync`; essa branch tem pendências próprias e não é reversão garantida.
- Configurações de sessão não alteram o `.env`. Ao abrir outro terminal, conferir as variáveis novamente. Preservar `.env`, credenciais, ativos e mudanças locais do usuário.

## Confirmações de publicação

- Implementação original confirmada remotamente: [`9533a0c22e82f29585593655e6a96d4f924331f9`](https://github.com/vanzer80/liveiapersonagens/commit/9533a0c22e82f29585593655e6a96d4f924331f9).
- Correções de código publicadas: [`e88822ecbf13ba871db319e1629fc008e404811b`](https://github.com/vanzer80/liveiapersonagens/commit/e88822ecbf13ba871db319e1629fc008e404811b). Árvore `bd75ea30bed7e0c8783c5d63939f730db67d62a5`, idêntica à testada. As alterações posteriores de fechamento são somente documentais e não mudam esse código.
- [PR #16](https://github.com/vanzer80/liveiapersonagens/pull/16) criado de verdade, aberto e em rascunho: `feat/mvp6-auto-speech` → `feat/mvp6-lip-sync`. Depende do [PR #15](https://github.com/vanzer80/liveiapersonagens/pull/15); não houve merge. Descrição atualizada e confirmada por leitura.
- [Issue #9](https://github.com/vanzer80/liveiapersonagens/issues/9) recebeu seção complementar com correções, testes, documentos e pendências. Conteúdo anterior preservado e gravação confirmada por leitura; Issue permanece aberta.
- [03 — Registro de Decisões e Pendências](https://docs.google.com/document/d/1uYAtE0vLWqs2enRHgQ6mgRA24r1c2VN0xRgNk5mKFZ4/edit): seção **35 — Revisão complementar — falas automáticas por inatividade**, gravada e relida. Comparação confirmou os 418 parágrafos anteriores preservados e todos os novos parágrafos esperados.
- [04 — Aprendizados — Erros e Acertos](https://docs.google.com/document/d/1DBTJ1CjmDodV5XWtrqEGm2AhFRHlRE5WkyUwzxvpMyw/edit): seção **20 — Revisão complementar — falas automáticas por inatividade**, gravada e relida. Comparação confirmou os 139 parágrafos anteriores preservados e todos os novos parágrafos esperados.
- As duas inserções usam data nativa de 06/09/2026, conferida na estrutura do documento. Revisões e resultados de leitura estão em [`publication-confirmation.json`](evidence/auto-speech-2026-09-06/publication-confirmation.json).
- README raiz/protótipo, documentação técnica e continuidade atualizados. O relatório anterior permanece identificado como histórico, sem ser usado como evidência nova.

**Fechamento parcial de homologação:** revisão de código, testes disponíveis e documentação oficial concluídos. Permanecem pendentes a cópia Windows do usuário, Fish Audio real, reprodução acústica e LIVE com espectador. Próximo passo mínimo: executar o roteiro local acima e registrar o que o celular efetivamente recebe. Não é necessário reimplementar nem refazer a documentação para iniciar essa validação.
