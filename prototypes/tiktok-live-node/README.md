# Protótipo TikTok LIVE — Node.js

Objetivo: validar a captura de eventos públicos de uma TikTok LIVE no terminal antes de adicionar IA, TTS ou avatar.

> Este protótipo usa uma biblioteca comunitária/não oficial baseada em engenharia reversa. Ele serve para validação técnica e não representa uma escolha definitiva para produção/comercialização.

## Requisitos

- Node.js 20 ou superior
- npm
- um usuário do TikTok que esteja AO VIVO no momento do teste

## Instalação

No terminal, entre nesta pasta:

```bash
cd prototypes/tiktok-live-node
npm install
```

## Executar

```bash
npm start -- nome_do_usuario
```

Pode usar com ou sem `@`.

Exemplo:

```bash
npm start -- @criador
```

## Saída esperada

Ao conectar:

```text
Conectado. roomId=...
```

Durante a live, eventos devem aparecer aproximadamente assim:

```text
[COMENTÁRIO] @usuario: mensagem
[ENTRADA] @usuario
[LIKE] @usuario | quantidade=5
[PRESENTE] @usuario | giftId=1234
```

## O que observar no primeiro teste

1. Se conecta sem autenticação adicional.
2. Se os comentários chegam em tempo real.
3. Se `uniqueId`/nome do usuário aparece corretamente.
4. Se eventos de entrada (`MEMBER`) chegam de forma confiável.
5. Se a conexão permanece estável.
6. Se surgem erros, bloqueios, CAPTCHA ou desconexões.

## Critério de sucesso desta etapa

Consideramos o primeiro marco validado quando comentários reais de uma LIVE aparecem no terminal, associados ao usuário que comentou, de forma reproduzível.
