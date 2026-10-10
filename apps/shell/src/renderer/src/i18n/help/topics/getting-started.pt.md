# Início rápido: a interface e o básico

O OfficeVega é um pacote de escritório que funciona inteiramente na sua máquina: uma janela, uma faixa de separadores, com seis editores — Docs (processamento de texto), Sheets (folhas de cálculo), Slides (apresentações), PDF, Markdown e HTML. Os ficheiros são .docx / .xlsx / .pptx / .pdf verdadeiros, totalmente compatíveis com o Word, o Excel e o PowerPoint. Não é necessária ligação à rede.

## A interface em resumo

![O ecrã Início](img/home-screen.png)

A janela tem três partes:

- **Barra de separadores (no topo)**: cada ficheiro aberto é um separador. O separador Início, à esquerda, está sempre presente e não pode ser fechado; os restantes separadores são os seus documentos. Faça duplo clique num separador para mudar o nome do ficheiro no próprio sítio.
- **Área de conteúdo**: o editor (ou o ecrã Início) do separador ativo.
- **Barra de menus**: na barra de menus do sistema no macOS, no topo da janela no Windows/Linux. Os menus Ficheiro / Editar / Ver adaptam-se ao editor ativo.

## Criar um documento

De qualquer uma destas formas:

- Clique num cartão de criação rápida na secção [Início rápido](help://getting-started) do **Início** (AI Docs, AI Sheets, AI Slides, ...).
- Menu **Ficheiro ▸ Novo**: Docs (ctrl+N), Sheets, Slides, Markdown, HTML ou PDF.
- Arraste um ficheiro para a janela, ou faça duplo clique nele no gestor de ficheiros (se o OfficeVega for a aplicação predefinida).

O documento novo abre sem título; o ficheiro no disco só é criado na primeira gravação.

## Abrir ficheiros

- O menu **Ficheiro ▸ Abrir…** (ctrl+O) abre o seletor de ficheiros do sistema: .docx / .doc / .xlsx / .xls / .csv / .tsv / .pptx / .ppt / .pdf / .md / .html.
- Clique em qualquer item da lista **Recentes** no ecrã Início.
- `officevega <ficheiro>` a partir de um terminal também abre ficheiros.

## Como funciona a gravação

- **Gravação manual**: ctrl+S, ou Ficheiro ▸ Guardar / Guardar como. A primeira gravação pede a localização e o nome.
- A **gravação automática** só é ativada depois de ter guardado o ficheiro manualmente pelo menos uma vez: um PDF que apenas lê nunca é reescrito em silêncio. A gravação automática dispara pouco depois de o conteúdo mudar.
- Fechar um separador com alterações por guardar pergunta primeiro Guardar / Descartar / Cancelar.
- Cada escrita é atómica (ficheiro temporário + mudança de nome), por isso uma falha de energia não deixa um ficheiro a meio.

## Atalhos frequentes

| Ação                       | Windows |
| -------------------------- | ------- |
| Novo documento             | ctrl+N  |
| Abrir                      | ctrl+O  |
| Guardar                    | ctrl+S  |
| Fechar separador           | ctrl+W  |
| Abrir este manual          | F1      |
| Recolher a Faixa de Opções | Ctrl+F1 |

**Recolher a Faixa de Opções** funciona em todos os editores. A linha de separadores mantém-se e a faixa de comandos por baixo desaparece; o separador selecionado serve também de controlo de recolha, por isso enquanto a faixa estiver recolhida nenhum separador fica selecionado, e clicar em qualquer separador traz a faixa de volta. Um duplo clique num separador faz o mesmo. O estado em que a deixou fica guardado editor a editor.

Os atalhos de cada editor (pincel de formatação, localizar e substituir, operações de tabela, ...) estão nos respetivos capítulos; o Docs traz ainda uma janela de atalhos de teclado pesquisável (**ctrl+/**) que cobre todas as suas combinações.

<!--
## Os atalhos Option+Command

Option+Command é a camada que o Word reserva para saltos estruturados, e o OfficeVega preenche-a da mesma forma. O Docs fica com a maioria deles, e o Sheets fica com dois seus para ficar em paridade com o Excel; um atalho funciona em todo o lado.

**Docs**

| Atalho (macOS)  | O que faz              | Windows / Linux    |
| --------------- | ---------------------- | ------------------ |
| ⌥⌘1 / ⌥⌘2 / ⌥⌘3 | Título 1 / 2 / 3       | Ctrl+Alt+1 / 2 / 3 |
| ⌥⌘0             | Normal                 | Ctrl+Alt+0         |
| ⌥⌘M             | Parágrafo              | Ctrl+Alt+M         |
| ⌥⌘A             | Novo comentário        | Ctrl+Alt+A         |
| ⌥⌘F             | Inserir nota de rodapé | Ctrl+Alt+F         |
| ⌥⌘E             | Inserir nota de fim    | Ctrl+Alt+D         |
| ⌥⌘G             | Ir para                | Ctrl+G             |

Dois deles mudam no Windows, pela mesma razão que leva o Word a separá-los. **O macOS tem o ⌥⌘D**: mostra e oculta o Dock. Por isso a nota de fim é ⌥⌘E no Mac e Ctrl+Alt+D em qualquer outro sítio. E **Ir para** dispensa o Alt: Ctrl+G, ao passo que o atalho do Mac o inclui.

**Sheets**, com a grelha em foco

| Atalho (macOS) | O que faz       | Windows / Linux |
| -------------- | --------------- | --------------- |
| ⌥⌘0            | Bordas externas | Ctrl+Shift+7    |
| ⌥⌘−            | Sem borda       | Ctrl+Shift+−    |

O Windows não é uma reescrita do par do Mac. O Excel para Mac dá ao Sheets **ambos** — ⌘⇧7 e ⌥⌘0 são duas teclas para as mesmas bordas externas —, por isso no Windows o comando mantém a combinação Ctrl+Shift que já tinha, e a camada Option simplesmente não existe.

Repare que **⌥⌘0 significa Normal no Docs e Bordas externas no Sheets**. Nunca aparecem no mesmo editor, por isso na prática não há colisão, mas ⌥⌘0 está ocupado e não está disponível como atalho global.

**Todos os editores**: **⌥⌘R / Ctrl+F1** recolhe a faixa de opções, tal como descrito acima.

Isto deixa o ⌥⌘D livre para o OfficeVega usar no macOS, se um comando futuro precisar dele.
-->

## Para onde ir a seguir

- Onde ficam os ficheiros: [O ecrã Início](help://home-screen).
- Gerir muitos ficheiros abertos: [Separadores e gestão de janelas](help://tabs-and-windows).
- Deixar o trabalho à IA: [O painel do assistente de IA](help://ai-panel).
- Idioma, tema, aplicações predefinidas: [Definições, idioma, tema e integrações MCP](help://settings-integrations).

Precisa de ajuda? Pergunte em [officevega.com/feedback](https://officevega.com/feedback), acompanhe as novidades no canal do Telegram [t.me/getmyai](https://t.me/getmyai) ou escreva para [mail@vega.chat](mailto:mail@vega.chat).
