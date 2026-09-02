# Pesquisa de TTS para o MVP 3

Data da pesquisa: 2026-09-02.

## Objetivo

Escolher a alternativa mais simples para validar o fluxo resposta textual → voz → reprodução local em Windows, sem transformar a escolha do protótipo em fornecedor definitivo.

## Comparação

| Opção | PT-BR | Naturalidade esperada | Latência | Custo e credencial | Windows / Node.js 20 | Manutenção e integração |
|---|---|---|---|---|---|---|
| Windows `System.Speech` | Usa vozes instaladas; o Windows oferece vozes para português do Brasil | A validar; tende a ser menos expressiva que vozes neurais em nuvem | Local, sem chamada de rede; medir no teste real | Sem custo, conta ou chave nova | Windows nativo; Node aciona PowerShell por `child_process` | API documentada pela Microsoft; gera WAV e reproduz localmente com pouca configuração |
| Azure Speech | Catálogo oficial inclui vozes `pt-BR` | Neural, adequada a fala natural | Depende da rede e região; oferece SDK/streaming | Exige recurso Azure e credencial; cobrança/limites dependem da conta | SDK oficial para JavaScript/Node e Windows | Serviço ativo e amplo, mas adiciona conta, chave e dependência de nuvem |
| Google Cloud Text-to-Speech | Possui vozes para português brasileiro | Vozes Standard, WaveNet, Neural2 e HD, conforme modelo | Depende da rede | Possui franquias gratuitas por modelo, mas exige faturamento habilitado e credenciais | Biblioteca cliente oficial para Node.js | Integração madura, porém mais configuração e risco de cobrança após limite |
| ElevenLabs | Modelos multilíngues suportam português | Alta expressividade; precisa de teste específico de sotaque/voz | API e opções voltadas a baixa latência | Plano gratuito de 10 mil créditos/mês, mas exige conta e chave; catálogo de vozes via API tem restrições no plano gratuito | API HTTP/SDK utilizável em Node e Windows | Serviço ativo, simples após cadastro, mas introduz credencial e limite externo |
| Piper local | Existem modelos `pt_BR`, incluindo `faber`, `cadu`, `edresson` e `jeff` | Neural local; qualidade varia por modelo | Local; depende do hardware e do carregamento do modelo | Sem chave e sem custo de API; exige baixar runtime e modelo, além de revisar licenças | Funciona localmente, mas a instalação no Windows é mais trabalhosa e a interface principal é Python/CLI | Desenvolvimento ativo no projeto `OHF-Voice/piper1-gpl`; cada voz tem licença própria a revisar |

Naturalidade e latência acima são expectativas técnicas para orientar o protótipo, não resultados medidos neste projeto.

## Escolha provisória

**Hipótese do MVP 3: `windows-sapi`.**

Motivos:

- não exige nova credencial, cadastro ou pagamento;
- utiliza recursos já disponíveis no Windows;
- gera WAV e reproduz o áudio de forma local;
- não adiciona dependência npm ao protótipo;
- permite validar agora o contrato modular, os logs e o comportamento de falha;
- pode ser substituído depois por um provedor neural sem misturar TTS à captura do TikTok ou à camada de IA.

Riscos e limites:

- uma voz `pt-BR` precisa estar instalada e habilitada no Windows;
- naturalidade e adequação ao personagem ainda não foram avaliadas;
- a solução é específica para Windows;
- o tempo total inclui inicialização do PowerShell e precisa ser medido no computador real;
- não é decisão de produção nem escolha comercial definitiva.

## Fontes oficiais consultadas

- [Microsoft Learn — `SpeechSynthesizer`](https://learn.microsoft.com/en-us/dotnet/api/system.speech.synthesis.speechsynthesizer)
- [Microsoft Support — idiomas e vozes do Windows Narrator](https://support.microsoft.com/en-us/accessibility/windows-narrator-appendix-a-supported-languages-and-voices)
- [Microsoft Learn — Azure Speech: suporte de idiomas e vozes](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support)
- [Microsoft Learn — início rápido de Text to Speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-text-to-speech)
- [Google Cloud — preços de Text-to-Speech](https://cloud.google.com/text-to-speech/pricing)
- [Google Cloud — biblioteca cliente para gerar áudio](https://cloud.google.com/text-to-speech/docs/create-audio-text-client-libraries)
- [ElevenLabs — documentação de Text to Speech](https://elevenlabs.io/docs/overview/capabilities/text-to-speech)
- [ElevenLabs — preços](https://elevenlabs.io/pricing)
- [OHF-Voice — Piper local](https://github.com/OHF-Voice/piper1-gpl)
- [Piper Voices — modelos em português brasileiro](https://huggingface.co/rhasspy/piper-voices/tree/main/pt/pt_BR)
