# Pesquisa visual do MVP 4 — Flow/Veo e vídeos de referência

## Objetivo

Definir a forma mais barata e rápida de validar um personagem visual falando e reagindo antes de investir em avatar 3D em tempo real.

## Referências analisadas integralmente

### Referência 1 — taverna realista

Arquivo recebido: `1000681948.mp4`, duração aproximada de 77 segundos.

Observações:
- personagem humanoide com aparência 3D realista em ambiente de taverna;
- fala e gestos contínuos diante da câmera;
- comentários, ranking, curtidas, presentes e avisos aparecem como camadas sobre a cena;
- reações visuais reforçam eventos importantes;
- a cena sugere composição produzida no computador e transmitida como uma fonte audiovisual.

### Referência 2 — personagem cartunesco e presentes

Arquivo recebido: `1000681946.mp4`, duração aproximada de 53 segundos.

Observações:
- personagem em loop com chamada para interação;
- nome e imagem do espectador aparecem após presente;
- agradecimento genérico e efeito visual específico;
- meta de likes e eventos organizados em camadas;
- múltiplos eventos indicam necessidade futura de fila e prioridade.

## Elementos que o projeto pretende reproduzir

1. personagem original em cena vertical;
2. comentário selecionado visível;
3. resposta da IA;
4. TTS audível;
5. estado visual de fala ou reação;
6. agradecimento dinâmico com nome do espectador;
7. efeitos por tipo de presente;
8. meta de likes;
9. ranking;
10. fila e prioridade de eventos.

Somente os cinco primeiros pertencem ao caminho imediato. Presentes, metas, ranking e fila permanecem para etapas posteriores.

## Capacidade relevante do Flow/Veo

As páginas oficiais consultadas informam suporte a geração de vídeo por texto e imagens de referência, reaproveitamento de ingredientes para consistência, formato vertical e geração de áudio/diálogo nos modelos atuais.

Fontes:
- [Google Flow](https://labs.google/fx/tools/flow)
- [Ajuda do Flow](https://support.google.com/flow/answer/16353334)
- [Veo 3.1 Ingredients to Video](https://blog.google/innovation-and-ai/technology/ai/veo-3-1-ingredients-to-video/)

Essas capacidades tornam o Flow/Veo adequado para produzir ativos visuais do protótipo. Elas não transformam o arquivo gerado em um modelo 3D controlável.

## Decisão de protótipo

Usar uma imagem mestre de personagem original e gerar clipes verticais curtos com aparência 3D realista.

Biblioteca inicial:
- `idle`: respirando e olhando para a câmera;
- `thinking`: escutando ou pensando;
- `speaking`: falando e gesticulando, sem frase gravada;
- `thanks-small-gift`: agradecimento visual contido;
- `thanks-special-gift`: comemoração forte;
- `celebrate-like-goal`: celebração da meta;
- `laugh` ou `surprise`: reação complementar.

A voz dinâmica será produzida pelo TTS e sobreposta ao clipe. Nomes, comentários e respostas variáveis não devem ser gravados dentro do vídeo. Clipes com fala fixa ficam restritos a reações genéricas raras.

## Limites aceitos

- aparência 3D não significa geometria 3D em tempo real;
- movimentos de boca serão aproximados;
- a identidade pode variar entre gerações e precisa ser conferida;
- loops podem apresentar emenda visível;
- o TTS e o clipe precisam de sincronização por duração/estado;
- conteúdo protegido não será copiado;
- a saída ainda ficará no PC até existir a etapa de transmissão.

## Critério de sucesso do MVP 4

Uma prévia local vertical deve mostrar o personagem em `idle`, trocar para `thinking`, iniciar `speaking` junto com uma resposta TTS, manter a cena estável durante o áudio e voltar a `idle`, sem derrubar o processo quando um ativo estiver ausente.
