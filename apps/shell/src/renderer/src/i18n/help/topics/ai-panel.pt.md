# O painel do assistente de IA

Todos os editores podem chamar o painel de IA: selecione algo, dê uma instrução e acompanhe o resultado à medida que surge.

## Abrir e usar

![O painel de IA no Docs](img/ai-panel.png)

- Pontos de entrada: o **botão de IA** no friso de cada editor, **Perguntar à IA** nos menus de contexto, ou Perguntar à IA na barra de marcação.
- Descreva a tarefa por palavras normais (reescrever isto / transformar esta coluna em percentagens / refazer a disposição desta página...) e prima Enter.
- As respostas são renderizadas **em fluxo**; quando a IA precisa de ferramentas (ler o documento, editá-lo), executa-as e continua até terminar.
- **Parar**: interrompe a volta em curso a qualquer momento.
- **Fila de espera**: enquanto uma resposta chega, Enter coloca sua mensagem na fila em vez de descartá-la — uma faixa acima do campo de entrada conta quantas; abra-a para editar, remover, reordenar, pausar ou limpar. A mensagem seguinte parte sozinha ao fim do turno; Esc continua parando o turno.

## O que sabe fazer

- **Docs**: reescrever, desenvolver, traduzir, resumir, inserir tabelas e imagens, ajustar a formatação; cada resposta guarda primeiro um instantâneo.
- **Sheets**: fórmulas, preenchimento de dados, transformações em massa, formatação.
- **Slides**: gerar a apresentação inteira, ajustar o layout, reescrever os textos.
- **PDF**: perguntas e respostas e resumos com base no texto ou nas páginas selecionadas.
- **Markdown / HTML**: reescrever, desenvolver, traduzir.
- **Início ▸ Ask AI** responde a partir dos seus arquivos favoritados e os cita — o painel de base de conhecimento tem a própria seção no capítulo Início, e o painel de IA do Docs carrega a mesma capacidade.

## Histórico de conversas

- Cada conversa é guardada automaticamente e fica nesta máquina: abra o painel amanhã e continue de onde ficou.
- Inicie uma conversa nova com **Nova conversa**; para alternar entre conversas anteriores, use a lista de histórico no topo do painel.
- Mude o nome de uma conversa para a encontrar mais depressa; elimine-a para a remover de vez. Eliminar uma conversa nunca toca nos seus documentos.

## Reversão e segurança

- O painel do Docs mantém uma **lista de versões**: um instantâneo por resposta. Pode voltar a qualquer um deles, e a própria reversão pode ser anulada com Ctrl+Z. Os instantâneos sobrevivem a fechar e reabrir o documento.
- As edições da IA passam pelo mesmo fluxo de edição das manuais (anuláveis e sujeitas a gravação) — nada contorna a sua confirmação de gravação.

## Ocultar uma seleção da IA

- Em Slides, HTML e Markdown uma seleção pode sair da vista do modelo: clique direito ▸ **Ocultar a seleção da IA**, dê nome ao espaço reservado, e o modelo lê `{{nome}}` no lugar. (Markdown arma o item com a chave de olho riscado da faixa; a do HTML vive no painel de código.)
- O arquivo guarda o texto real — salvar, exportar e imprimir ficam intactos, e a marca sobrevive à reabertura. O mesmo item desfaz (Markdown ganha também **Mostrar a seleção à IA novamente**).
- HTML oculta conteúdos de elementos, valores de atributos e literais de string dos scripts; a página renderizada nunca muda.
- Slides também oculta imagens, vídeos e áudios inteiros, e um slide com conteúdo oculto nunca é enviado como captura: a checagem automática de layout pula a página e avisa.
- Isso vale só para a IA do aplicativo — a CLI, as ferramentas MCP e a exportação headless leem o arquivo diretamente e continuam vendo o texto.

## Privacidade e anonimização

- As instruções e o conteúdo relevante do documento são enviados para **o serviço de modelos que configurou** (VEGA alojado ou um endpoint personalizado, ver o capítulo seguinte); sem configuração, nada é enviado.
- **Anonimização (152-FZ)**: antes do envio, a aplicação pode ocultar dados pessoais — nomes, números de telefone, emails, dados do passaporte — para que o modelo nunca os veja. Ative-a em Definições ▸ IA; os excertos ocultos são restaurados automaticamente no documento.
- **Sem análise de rastreio**: o OfficeVega é distribuído sem Google Analytics nem qualquer outro rastreador de terceiros. Não existe um interruptor de estatísticas de utilização, porque não há nada para desligar: os documentos e o conteúdo das conversas nunca saem do caminho que configurou.
- Os ficheiros locais não são carregados para mais lado nenhum; as chaves BYOK ficam guardadas no ficheiro de definições da aplicação nesta máquina e são enviadas apenas nos cabeçalhos dos pedidos.
