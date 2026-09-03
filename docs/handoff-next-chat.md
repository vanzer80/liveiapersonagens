# Continuidade — próximo chat

## Objetivo

Dar continuidade ao Projeto Live IA — Personagens Interativos sem repetir decisões ou reabrir etapas já validadas.

## Leitura obrigatória antes de alterar código

Google Drive, nesta ordem:

1. `00 - Documento Mestre - Visão do Produto`
2. `03 - Registro de Decisões e Pendências`
3. `04 - Aprendizados - Erros e Acertos`
4. `01 - Pesquisa Necessária antes do Protótipo`
5. `01 - Arquitetura Inicial e Integração TikTok`
6. `02 - MVP - Escopo de Validação`

GitHub:

1. `README.md`
2. `docs/technical-plan.md`
3. `research/visual-mvp4-flow.md`
4. Issue #3, encerrada
5. Issue #4, próxima etapa

## Estado confirmado

- MVP 1: captura de eventos TikTok validada.
- MVP 2: respostas de IA validadas com latência instrumentada.
- MVP 3: TTS local e integrado em LIVE real validado.
- Voz observada: `Microsoft Maria Desktop`, `pt-BR`.
- Teste controlado: geração `884 ms`; reprodução `7508 ms`.
- LIVE real: gerações de `455 ms` e `377 ms`; reproduções de `7699 ms` e `7072 ms`.
- O usuário ouviu as respostas no PC.
- Comentários comuns não acionaram IA/TTS.
- A captura continuou durante e depois do processamento.
- O áudio ainda não chegou aos espectadores porque não há composição/transmissão da saída do PC.

## Decisão visual aprovada para o protótipo

- Personagem original, humanoide e realista, com aparência 3D.
- Clipes verticais curtos gerados no Flow/Veo a partir de uma imagem mestre.
- Os clipes são vídeos pré-renderizados, não um avatar 3D controlável em tempo real.
- TTS continua dinâmico e separado; não gravar nomes de espectadores nos clipes.
- Clipes principais mudos ou com ambiente, para receber a voz gerada.
- Sincronização labial aproximada é aceitável no MVP 4.
- Não copiar Kratos, Bob Esponja ou outros personagens protegidos.

## Próxima execução — Issue #4

1. Definir e aprovar a imagem mestre do personagem original.
2. Criar prompts consistentes para os estados `idle`, `thinking`, `speaking`, agradecimento, comemoração e surpresa.
3. Gerar pelo menos três clipes iniciais: `idle`, `thinking` e `speaking`.
4. Definir contrato de nomes, proporção, duração, loop e fallback dos ativos.
5. Implementar controlador de cena separado do TikTok, IA e TTS.
6. Criar prévia local vertical que alterne estados e toque o TTS.
7. Testar retorno ao `idle`, clipe ausente e erro sem encerrar o processo.
8. Documentar resultados antes de avançar para presentes e transmissão.

## Fora do escopo imediato

- envio da composição ao TikTok;
- OBS/TikTok LIVE Studio;
- lip sync fonema a fonema;
- fila e prioridade de presentes;
- modelo 3D em tempo real;
- SaaS, painel, cobrança ou escala.
