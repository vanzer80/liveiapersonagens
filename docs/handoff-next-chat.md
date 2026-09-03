# Continuidade — próximo chat

## Direção vigente

A influencer virtual foi adiada. A prioridade é colocar o Bob Esponja em uma TikTok LIVE real e confirmar que os espectadores recebem imagem, voz e respostas aos comentários.

## Leitura obrigatória antes de alterar código

Google Drive: `00 - Documento Mestre - Visão do Produto`, `03 - Registro de Decisões e Pendências` e o documento específico da etapa. No GitHub: `README.md`, `docs/technical-plan.md`, este handoff e a Issue #8.

## Estado confirmado

- MVP 1: captura TikTok validada em LIVE real.
- MVP 2: resposta textual validada em LIVE real.
- MVP 3: TTS validado no Windows e em LIVE real.
- MVP 4: ramo Bob validado localmente com imagem mestre e clipes `idle`, `thinking` e `speaking`.
- Sincronização final por callbacks: início do `speaking` 1 ms após o callback; retorno a `idle` confirmado.
- Microsoft Maria Desktop funciona, mas foi percebida como robotizada.
- Influencer: adiada para segunda etapa.
- Presentes, fila e prioridades: ainda não implementados.
- Transmissão audiovisual para espectadores: implementação preparada; teste real pendente.
- Composição no LIVE Studio: Bob enquadrado corretamente com captura de janela `msedge.exe`, cena `Câmera em tela cheia` e modo `Ajustar`.
- A fonte `Adicionar link` rejeitou o endereço HTTP local na versão testada do LIVE Studio.

## Implementação atual

O comando abaixo ativa a cena Bob, o TTS e a reconexão automática enquanto a conta ainda não entrou ao vivo:

```powershell
npm run live:bob -- luisbossgpt
```

Durante uma interação elegível:

```text
comentário ia/!ia
  → thinking
  → resposta da IA
  → callback de início do TTS
  → speaking
  → callback de fim do TTS
  → idle
```

A prévia fica em `http://127.0.0.1:3333`. Os MP4s são reproduzidos sem áudio; o TTS do Windows é a única voz.

## Próximo teste obrigatório no Windows

1. atualizar o repositório;
2. confirmar os três MP4s em `assets\mvp4\`;
3. executar `npm run live:bob -- <usuario>`;
4. abrir a prévia no Edge e capturar a janela `msedge.exe`;
5. usar visualização vertical, cena `Câmera em tela cheia` e modo `Ajustar`;
6. incluir o áudio do sistema e confirmar movimento no medidor quando o TTS falar;
7. iniciar a LIVE;
8. em outro celular/conta, enviar duas perguntas começando com `ia`;
9. confirmar imagem, voz, `thinking → speaking → idle` e continuidade dos eventos.

Não declarar a transmissão validada sem confirmação no dispositivo do espectador.

## Depois do teste

Se funcionar, documentar latência percebida, qualidade de imagem/áudio e qualquer falha. Em seguida, implementar agradecimento a presentes com fila e prioridade. Se não funcionar, separar o diagnóstico entre fonte visual, captura de áudio, conexão TikTok e lógica da aplicação.

## Restrições

- não publicar `.env`, chaves ou tokens;
- `tiktok-live-connector` continua comunitário/não oficial;
- confirmar o escopo da licença informada antes de uso público/comercial;
- não retomar influencer, SaaS ou escala antes do teste real atual.

Procedimento detalhado: [`mvp5-live-bob.md`](mvp5-live-bob.md).

Retrospectiva do LIVE Studio: [`mvp5-live-studio-retrospective.md`](mvp5-live-studio-retrospective.md).

Acompanhamento: [Issue #8 — Bob Esponja em TikTok LIVE real](https://github.com/vanzer80/liveiapersonagens/issues/8).
