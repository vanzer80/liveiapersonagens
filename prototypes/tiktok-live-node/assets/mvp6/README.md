# Ativos acionáveis do MVP 6

Este diretório é o destino local dos cinco vídeos pré-gravados do piloto. Os MP4s não são versionados no Git porque são binários gerados e podem conter material sujeito a licença.

Fonte oficial: pasta `MVP 6 - Vídeos Acionáveis` no Google Drive do projeto.

## Arquivos obrigatórios

| Uso | Nome local | Estado do ativo |
|---|---|---|
| Boas-vindas | `bob-boas-vindas-v1.mp4` | produzido e validado pelo usuário |
| Hambúrguer | `bob-hamburguer-v1.mp4` | produzido e validado pelo usuário |
| Fenda do Biquíni | `bob-fenda-biquini-v1.mp4` | produzido e validado pelo usuário |
| Patrick | `bob-patrick-v1.mp4` | produzido e validado pelo usuário |
| Convite para IA | `bob-convite-ia-v1.mp4` | produzido e validado pelo usuário |

## Preparação do ambiente local

1. Sincronizar a pasta oficial do Drive.
2. Copiar os cinco MP4s para este diretório, preservando exatamente os nomes acima.
3. Confirmar que nenhum arquivo ficou com sufixo como `(1)`.
4. Não remover este `README.md`.
5. Não forçar a inclusão dos MP4s no Git.

Destino esperado:

```text
prototypes/tiktok-live-node/assets/mvp6/
```

## Estado da integração

Concluído:

- produção e aprovação audiovisual informadas pelo usuário;
- organização das cópias oficiais no Drive;
- padronização dos nomes;
- manifesto e proteção contra commit acidental.

Pendente:

- arquivo configurável de gatilhos;
- seleção do vídeo pelas palavras do comentário;
- cooldown, deduplicação e fila única;
- reprodução do áudio sem sobreposição;
- retorno ao `idle`;
- testes automatizados e validação integrada no celular do espectador.

A presença dos arquivos neste diretório não significa que os gatilhos já foram implementados.
