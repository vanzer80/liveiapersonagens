# Como contribuir

O projeto está em fase inicial de validação. Mudanças devem favorecer experimentos pequenos, reversíveis e fáceis de testar.

## Regras básicas

1. Não transformar hipótese em decisão arquitetural definitiva sem validação.
2. Não antecipar recursos de SaaS, cobrança, marketplace, app mobile ou escala antes do MVP.
3. Separar código experimental de componentes já validados.
4. Documentar como reproduzir testes importantes.
5. Registrar limitações e falhas encontradas, não apenas resultados positivos.
6. Quando uma descoberta alterar uma decisão duradoura do projeto, atualizar também a documentação oficial no Google Drive.

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
