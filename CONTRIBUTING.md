# Como contribuir

O projeto está em fase inicial de validação. Mudanças devem favorecer experimentos pequenos, reversíveis e fáceis de testar.

## Regras básicas

1. Não transformar hipótese em decisão arquitetural definitiva sem validação.
2. Não antecipar recursos de SaaS, cobrança, marketplace, app mobile ou escala antes do MVP.
3. Separar código experimental de componentes já validados.
4. Documentar como reproduzir testes importantes.
5. Registrar limitações e falhas encontradas, não apenas resultados positivos.
6. Quando uma descoberta alterar uma decisão duradoura do projeto, atualizar também a documentação oficial no Google Drive.

## Colaboração entre contas e IAs

O projeto pode ser desenvolvido por co-proprietários usando contas separadas de IA, desde que todos trabalhem sobre as mesmas fontes oficiais compartilhadas.

- Google Drive: visão, decisões, aprendizados, riscos, pendências e estado consolidado.
- GitHub: código, testes, documentação técnica, Issues, branches e Pull Requests.
- Histórico ou memória privada de chat não é fonte canônica.
- Antes de tarefa relevante, conferir Drive, `main`, branches, PRs, Issues e documentação recente.
- Depois de decisão, resultado, aprendizado, risco ou pendência duradoura, registrar a informação na fonte compartilhada adequada.
- Não é necessário que diferentes IAs produzam respostas textualmente idênticas; elas devem convergir para o mesmo estado operacional, evidências, dependências e limites de validação.
- Uma nova IA/plataforma só deve ser tratada como colaborador operacional depois de teste controlado de acesso e continuidade, verificando cruzamento Drive × GitHub, `main` × PRs, teste × LIVE real, histórico × vigente e recuperação correta do ponto de continuidade.
- Mesmo entre co-proprietários autorizados, não reproduzir chaves, tokens, cookies, `.env` ou identificadores privados sem necessidade operacional.

O modelo foi validado com duas contas separadas do ChatGPT. A avaliação de Gemini, Gems e/ou Jules é uma hipótese de interoperabilidade futura e ainda precisa do mesmo teste controlado antes de ser considerada validada.

## Commits

Preferir mensagens curtas e descritivas, por exemplo:

- `feat: capture live comments`
- `test: validate reconnect behavior`
- `docs: record tiktok integration limitation`
- `fix: handle malformed live event`

## Pull requests

Quando forem utilizadas, devem explicar:

- o problema ou hipótese;
- o que foi alterado;
- como testar;
- resultado esperado;
- riscos ou limitações conhecidas.
