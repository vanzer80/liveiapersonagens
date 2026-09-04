# MVP 6 — Rotações de ambiente e loop da LIVE

Status: **NOVE CENAS PRODUZIDAS E CONSOLIDADAS EM UM VÍDEO DE 90 S; USO COMO LOOP CONTÍNUO AINDA NÃO VALIDADO EM LIVE REAL**.

## Objetivo

Dar movimento e assunto à LIVE quando não houver interação do público, sem substituir respostas dinâmicas, presentes, perguntas ou o estado `idle`.

## Três rotações produzidas

### Rotação 1

1. **Recepção / cidade**  
   “Oi, pessoal! Quem chegou agora manda um oi no chat e diz de qual cidade está assistindo. Quero conhecer todo mundo por aqui!”

2. **Pizza ou hambúrguer**  
   “Pergunta rápida: pizza ou hambúrguer? Escolhe um e manda no chat. Só aviso que eu vou julgar a resposta de vocês!”

3. **Desafio de pergunta difícil**  
   “Agora quero uma pergunta difícil. Pode tentar me pegar de surpresa. Quem vai ser o primeiro a testar minha inteligência?”

### Rotação 2

1. **Espectador silencioso**  
   “Tem alguém aí só assistindo escondido? Aparece no chat e manda um oi. Prometo que eu não vou contar pra ninguém!”

2. **Destino de viagem**  
   “Se você pudesse viajar hoje para qualquer lugar do mundo, para onde iria? Quero ver qual destino vai ganhar no chat!”

3. **Pergunta estranha**  
   “O chat ficou bom agora! Manda uma pergunta estranha, engraçada ou impossível. Essas são sempre as melhores para responder!”

### Rotação 3

1. **Novos espectadores / cidade**  
   “Olha quanta gente chegando! Quem entrou agora diz o nome da cidade e manda um oi. Quero saber até onde essa LIVE chegou!”

2. **Superpoder**  
   “Vamos fazer um desafio: se você pudesse ter qualquer superpoder por um dia, qual escolheria? Responde aí no chat!”

3. **Bagunça / nova pergunta**  
   “Eu queria uma LIVE tranquila, mas vocês chegaram e já virou bagunça. Gostei! Agora manda uma pergunta pra gente continuar!”

## Ativo consolidado

Os nove clipes foram concatenados pelo usuário em um único vídeo:

- arquivo oficial: `bob-rotacoes-1-3-loop-v1.mp4`;
- Drive folder: `MVP 6 - Rotações e Loop da Live`;
- Drive folder ID: `1i-s6t3V3z4mNYySNJ_Ltj59e7wrjSPvc`;
- Drive file ID: `1C52A7R-21m4tJ44fkhHSHZyeIqwlqnkr`;
- duração observada: **90,01 s**;
- resolução: **1280x2274**, proporção praticamente 9:16;
- vídeo: H.264, aproximadamente 24 fps;
- áudio: AAC estéreo, 48 kHz;
- tamanho observado: **84.798.115 bytes**;
- SHA-256: `446df87a301ff7454e1914cf7d0884856ffe2341ef3e6dc97635190096775b85`.

O binário permanece no Google Drive e não deve ser adicionado ao histórico Git.

## Resultado da inspeção local do arquivo consolidado

O arquivo enviado foi inspecionado ao longo de toda a linha do tempo, incluindo amostras regulares e as junções de aproximadamente 10 segundos entre os nove clipes.

**Resultado visual:**

- Bob permanece como protagonista no primeiro plano;
- casa-abacaxi e casa do Lula Molusco permanecem coerentes no fundo;
- paleta, cenário e enquadramento são consistentes ao longo dos nove segmentos;
- há mudanças visíveis de pose e expressão nas junções, compatíveis com a concatenação de nove gerações independentes;
- primeiro e último quadro permanecem próximos em composição, mas não formam um loop visual perfeitamente contínuo.

**Resultado de áudio:**

A faixa contém fala na maior parte da duração, com apenas pausas curtas. Portanto, o vídeo não funciona como um `idle` silencioso.

## Recomendação de arquitetura

**Não tratar o arquivo de 90 s como uma única mídia falada ininterrupta dentro da fila atual.**

A política vigente não interrompe uma mídia que já começou. Se os 90 s entrarem como um único item, uma pergunta ou presente recebido logo após o início pode ficar aguardando por quase toda a duração do vídeo.

Caminho recomendado:

1. manter um `idle` visual separado para o estado base;
2. manter as nove cenas como nove itens de ambiente de cerca de 10 s;
3. acionar uma cena somente depois de um período de silêncio;
4. ao fim da cena, voltar ao `idle`;
5. presentes e perguntas continuam tendo prioridade para o próximo item;
6. evitar sobreposição de áudio entre clipe de ambiente e TTS dinâmico.

O arquivo de 90 s pode continuar sendo usado como **prova visual, demonstração ou teste experimental no LIVE Studio**, mas não deve ser considerado a arquitetura final do loop antes de validação prática.

## Hipótese de expansão — personagens entrando em cena

O usuário propôs ampliar a sensação de “mundo vivo” com outros personagens entrando em cenas acionadas por eventos.

Exemplo:

> Patrick entra após o recebimento de uma rosa e diz: “Olha, Bob Esponja, a rosinha que ganhamos!”

A direção é considerada **IDEIA / HIPÓTESE**, não implementação aprovada.

Uma forma recomendada de preservar personalização é:

1. personagem secundário executa uma reação fixa pré-gravada;
2. Bob faz o agradecimento nominal pelo fluxo dinâmico;
3. a fila continua única, sem áudio sobreposto;
4. ao final, retornar à cena base.

Possíveis papéis futuros, somente como hipóteses:

- Patrick: presentes, brincadeiras e comentários espontâneos;
- Seu Siriguejo: presentes de maior valor, metas e humor com dinheiro;
- Sandy: perguntas, curiosidades e desafios;
- Plankton: comentários provocativos, metas e cenas de humor;
- Lula Molusco: reações secas ou impacientes;
- Gary: reações visuais curtas, sem necessidade de diálogo.

## Pendências

- [ ] decidir se a primeira LIVE testará o consolidado de 90 s ou os nove segmentos individualmente;
- [ ] validar no celular do espectador a experiência de uma rotação de ambiente;
- [ ] medir quanto uma cena de 10 s atrasa uma pergunta ou presente recebido durante sua reprodução;
- [ ] decidir política de interrupção futura, se necessária;
- [ ] somente depois da validação, escolher quais cenas com personagens secundários produzir e mapear para eventos.

## Classificação

- **FATO INFORMADO:** nove cenas foram geradas e concatenadas pelo usuário.
- **RESULTADO DE INSPEÇÃO:** arquivo consolidado analisado localmente, com especificações e continuidade visual descritas acima.
- **HIPÓTESE:** usar o vídeo completo como loop contínuo da LIVE.
- **RECOMENDAÇÃO:** usar um idle separado e cenas curtas de ambiente na fila.
- **IDEIA:** outros personagens entrando em cenas acionadas por presentes, comentários ou outros eventos.
- **PENDÊNCIA:** validar tudo isso em LIVE real antes de tornar a arquitetura definitiva.
