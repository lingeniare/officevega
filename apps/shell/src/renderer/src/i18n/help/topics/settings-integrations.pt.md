# Definições, idioma, tema e integrações MCP

## Abrir as definições

A linha da conta no canto inferior esquerdo do ecrã Início abre o painel de definições (mostra Entrar quando não tem sessão iniciada). O painel tem seis secções: Conta, Modelo de IA, Multimédia e pesquisa de IA, Geral, Integrações e Sobre.

![Definições ▸ Geral, onde estão o idioma, o tema, a gravação automática e o interruptor das estatísticas de utilização](img/settings-general.png)

A configuração dos modelos tem o seu próprio artigo; em **Multimédia e pesquisa de IA** ativa, por fornecedor, a geração de imagens, a análise de imagens, a análise de vídeo, a pesquisa na web e a pesquisa de ficheiros locais.

## Idioma

- As definições oferecem **21 idiomas de interface**: inglês, chinês simplificado, japonês, coreano, francês, alemão, espanhol, tailandês, indonésio, russo, árabe, português, italiano, polaco, checo, neerlandês, malaio, hebraico, hindi, chinês tradicional e vietnamita.
- A alteração aplica-se de imediato e fica guardada; a barra de menus nativa é reconstruída com o novo idioma.

## Tema

Claro / Escuro / Seguir o sistema. O modo Seguir o sistema acompanha o aspeto do sistema operativo, e os editores mudam de aspeto em sincronia, sem cintilação. O mesmo interruptor também altera as cores do painel de IA e do ecrã Início, para que a aplicação inteira mantenha um só estilo: Claro para salas iluminadas, Escuro para trabalhar à noite, Seguir o sistema para acompanhar o Windows.

## Geral

- **Sem análise de rastreio**: o OfficeVega é distribuído sem Google Analytics nem qualquer outro rastreador de terceiros: o conteúdo dos documentos, os nomes dos ficheiros e os eventos de utilização nunca são recolhidos nem enviados para lado nenhum.
- **Posição da barra lateral de IA** (esquerda ou direita), **Tamanho do texto do painel de IA** e **Verificação ortográfica no chat de IA**.
- **Abrir o painel de IA em novos documentos** — desativado, um documento novo começa com o painel recolhido, a um clique de distância.
- **Guardar automaticamente todos os documentos** ativa a gravação automática por predefinição em todos os editores; pode continuar a desativá-la para uma janela.
- **Local de gravação** com o botão **Alterar** e **Aplicação predefinida para documentos do Office** para atribuir .docx / .xlsx / .pptx ao OfficeVega.

## Multimédia e pesquisa de IA

Não são interruptores: cada capacidade escolhe o fornecedor que a serve, e a chave e o URL base de um fornecedor são introduzidos uma vez e partilhados:

- **Pesquisa na web**, **Geração de imagens**, **Análise de imagens** e **Análise de vídeo**, cada uma com um fornecedor, um modelo, uma chave e um URL base. Escolha **VEGA** como fornecedor para encaminhar estas funções por `api.vega.chat` com a sua chave de sessão.
- **A pesquisa de ficheiros locais** é executada nesta máquina. Por baixo está a **Reordenação com Jev**, **desativada por predefinição**. Se a ativar, os excertos dos 20 melhores resultados locais — até 1200 caracteres de cada documento, mais os nomes dos ficheiros e das pastas — são enviados para o modelo Jev da TypeSafe para serem reordenados por relevância. Com ela desativada, nada sai do dispositivo.

## Sobre

- **Versão**, o site do projeto [officevega.com](https://officevega.com) e a página de lançamentos [officevega.com/releases](https://officevega.com/releases).
- **Canal de atualização**: Estável ou Beta. A alteração tem efeito imediato e verifica se existe uma atualização; não reverte uma instalação Beta para Estável.

## Aplicações predefinidas

As definições podem registar o OfficeVega como a aplicação que abre ficheiros .docx / .xlsx / .pptx / .pdf e semelhantes (registo de aplicação predefinida ao nível do sistema; confirme quando for pedido).

## Avisos de software de terceiros e atualizações

- Ajuda ▸ Avisos de software de terceiros: o inventário completo das licenças de código aberto que acompanha a aplicação.
- Ajuda ▸ Procurar atualizações…: inicia uma verificação manual; se existir uma versão mais recente, o OfficeVega propõe a instalação.

## Iniciar sessão na VEGA

- O acesso (nas Definições ou na lista de projetos na nuvem) usa um fluxo de **código de dispositivo**: o OfficeVega mostra um código e abre o início de sessão no navegador; a partir daí o processo prossegue sozinho.
- O início de sessão serve apenas para a lista de projetos na nuvem e os modelos alojados da VEGA em `api.vega.chat`. Sem ele, todas as funcionalidades locais e os modelos personalizados continuam a funcionar.
- Terminar sessão é um clique nas Definições.

## Suporte

Perguntas, ideias e relatórios de erros: [officevega.com/feedback](https://officevega.com/feedback), canal do Telegram [t.me/getmyai](https://t.me/getmyai), email [mail@vega.chat](mailto:mail@vega.chat). Programador: [getmyai.io](https://getmyai.io) (Dmitry Filippov).

## Integração MCP (para utilizadores avançados / clientes de IA)

**Integrações** é o painel que liga o OfficeVega a um agente de programação, e tem o seu próprio artigo: Ligar um agente de programação. A versão curta: escolha um caminho (a linha de comandos ou o MCP), siga essa secção e depois inicie uma conversa nova e faça a sua pergunta.

![Definições ▸ Integrações: os três passos, depois as linhas de competências e as opções de MCP](img/settings-integrations.png)

Em **Servidor HTTP local**, a aplicação também pode arrancar o servidor por si — um interruptor de ativação e uma porta —, enquanto **Avançado** acrescenta o URL de verificação de estado e o ficheiro de registo. Escuta apenas em localhost.

## Folha de referência da linha de comandos

| Comando             | O que faz                    |
| ------------------- | ---------------------------- |
| `officevega <file>` | abrir um ficheiro            |
| `officevega mcp`    | iniciar o servidor MCP local |
| `officevega --help` | todos os comandos e opções   |
