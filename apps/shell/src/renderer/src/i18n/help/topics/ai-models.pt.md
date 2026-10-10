# Modelos de IA e definições

## Fornecedores e modelos

Os modelos e as chaves configuram-se nas Definições (a linha da conta no canto inferior esquerdo do ecrã Início):

![A janela de definições](img/settings-general.png)

- **VEGA nos seus servidores**: inicie sessão (com o fluxo de código de dispositivo) e use — sem configuração nenhuma. Os pedidos seguem para `https://api.vega.chat`, um endpoint compatível com OpenRouter, por isso qualquer cliente no estilo OpenRouter pode apontar para ele.
- **Endpoints personalizados (BYOK)**: em Definições ▸ IA indicam-se o URL base e a chave de API de cada protocolo — compatível com OpenAI, Anthropic, Gemini, DeepSeek, DashScope (qwen) e outros. As chaves ficam guardadas no ficheiro de definições da aplicação nesta máquina e são enviadas apenas nos cabeçalhos dos pedidos.
- Pode escolher um modelo diferente para cada capacidade: conversação/geração, geração de imagens, análise de imagens.
- **Testar ligação**: confirma que o endpoint está acessível e que o modelo está visível, antes de guardar.
- O URL base pode trazer um caminho e uma cadeia de consulta (estilo gateway); o caminho do endpoint é acrescentado corretamente.

## Escolher um modelo

- O seletor de modelo está no topo do painel de IA e em Definições ▸ Modelo de IA: uma escolha para a conversa e, onde o fornecedor o suporte, escolhas separadas para geração e análise de imagens.
- Comece pelo modelo VEGA predefinido: serve para a maioria das tarefas de escritório (reescrita, tabelas, fórmulas, resumos). Mude para um modelo maior em raciocínios difíceis ou documentos longos, e para um mais pequeno e barato em rascunhos rápidos.
- Uma conversa em curso mantém o modelo antigo até à resposta seguinte; as conversas novas usam de imediato a nova escolha.

## Preços e utilização

- A faturação da VEGA é paga consoante a utilização, modelo a modelo. A lista completa de preços está em [api.vega.chat/aimodels](https://api.vega.chat/aimodels): confirme o preço de entrada e de saída de um modelo antes de um trabalho grande.
- O saldo e as despesas atuais estão no [painel da VEGA](https://api.vega.chat/dashboard), também acessível a partir da linha de saldo no menu da conta.
- Sem sessão iniciada, só funcionam as opções gratuitas incluídas; inicie sessão para desbloquear todos os modelos da lista de preços.

## Integração com a CLI (estilo Codex)

- As Definições aceitam o caminho de um programa CLI local (diretórios pessoais não ASCII e o prefixo ~ funcionam; o ~ é expandido automaticamente). O Detetar modelos consulta os modelos que essa CLI disponibiliza.
- A validação verifica apenas a existência — não há restrições de conjunto de caracteres.

## Quando as alterações passam a vigorar

- As alterações de modelo e de endpoint aplicam-se de imediato; uma conversa em curso mantém a configuração antiga até à resposta seguinte.
