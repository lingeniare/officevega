# Inicio rápido: la interfaz y lo esencial

OfficeVega es una suite ofimática que funciona por completo en su equipo: una ventana, una fila de pestañas y seis editores: Docs (procesamiento de texto), Sheets (hojas de cálculo), Slides (presentaciones), PDF, Markdown y HTML. Los archivos son .docx / .xlsx / .pptx / .pdf reales, totalmente intercambiables con Word, Excel y PowerPoint. No necesita conexión a red.

## Descripción de la interfaz

![La pantalla de inicio](img/home-screen.png)

La ventana tiene tres partes:

- **Barra de pestañas (arriba)**: cada archivo abierto es una pestaña. La pestaña Inicio, a la izquierda, siempre está presente y no se puede cerrar; las demás pestañas son sus documentos. Haga doble clic en una pestaña para cambiar el nombre del archivo en el mismo sitio.
- **Área de contenido**: el editor (o la pantalla de inicio) que corresponde a la pestaña activa.
- **Barra de menús**: en la parte superior de la ventana en Windows. Los menús Archivo, Edición y Ver se adaptan al editor activo.

## Crear un documento

Sirve cualquiera de estas vías:

- Haga clic en una tarjeta de creación rápida de la sección [Inicio rápido](help://getting-started) de **Inicio** (AI Docs, AI Sheets, AI Slides, …).
- Menú **Archivo ▸ Nuevo**: Docs (ctrl+N), Sheets, Slides, Markdown, HTML o PDF.
- Arrastre un archivo a la ventana, o haga doble clic en él en el explorador de archivos (si OfficeVega es la aplicación predeterminada).

Un documento nuevo se abre sin título; el archivo en el disco solo se crea al guardarlo por primera vez.

## Abrir archivos

- El menú **Archivo ▸ Abrir** (ctrl+O) abre el selector del sistema: .docx / .doc / .xlsx / .xls / .csv / .tsv / .pptx / .ppt / .pdf / .md / .html.
- Haga clic en cualquier elemento de la lista **Recientes** de la pantalla de inicio.
- `officevega <file>` en un terminal también abre archivos.

## El modelo de guardado

- **Guardado manual**: ctrl+S, o Archivo ▸ Guardar / Guardar como. El primer guardado pregunta por la ubicación y el nombre.
- **El autoguardado** se activa solo después de haber guardado el archivo a mano al menos una vez: un PDF que solo lee nunca se reescribe en silencio. El autoguardado se activa poco después de que cambie el contenido.
- Al cerrar una pestaña con cambios sin guardar, primero se pregunta si se quiere Guardar / Descartar / Cancelar.
- Cada escritura es atómica (archivo temporal y renombrado), así que un corte de luz no puede dejar un archivo a medias.

## Atajos de teclado frecuentes

| Acción            | Windows |
| ----------------- | ------- |
| Nuevo documento   | ctrl+N  |
| Abrir             | ctrl+O  |
| Guardar           | ctrl+S  |
| Cerrar pestaña    | ctrl+W  |
| Abrir este manual | F1      |
| Contraer la cinta | Ctrl+F1 |

**Contraer la cinta de opciones** funciona en todos los editores. La fila de pestañas permanece y la banda de comandos que hay debajo se oculta; la pestaña seleccionada sirve también como control de contracción, de modo que mientras la cinta está contraída no hay ninguna pestaña seleccionada y pulsar cualquier pestaña vuelve a mostrar la banda. Hacer doble clic en una pestaña hace lo mismo. La forma en que la dejó se recuerda editor por editor.

Los atajos dentro de cada editor (copiar formato, buscar y reemplazar, operaciones de tabla, …) están en sus capítulos; Docs incluye además un cuadro de diálogo de atajos de teclado con buscador (**ctrl+/**) que cubre todas sus combinaciones.

<!--
## Los atajos Option+Comando

Option+Comando es la capa que Word reserva para los saltos estructurados, y OfficeVega la rellena igual. Docs se queda con la mayor parte; Sheets toma dos para la paridad con Excel; un atajo funciona en todas partes.

**Docs**

| Atajo (macOS)   | Qué hace               | Windows / Linux    |
| --------------- | ---------------------- | ------------------ |
| ⌥⌘1 / ⌥⌘2 / ⌥⌘3 | Título 1 / 2 / 3       | Ctrl+Alt+1 / 2 / 3 |
| ⌥⌘0             | Normal                 | Ctrl+Alt+0         |
| ⌥⌘M             | Párrafo                | Ctrl+Alt+M         |
| ⌥⌘A             | Nuevo comentario       | Ctrl+Alt+A         |
| ⌥⌘F             | Insertar nota al pie   | Ctrl+Alt+F         |
| ⌥⌘E             | Insertar nota al final | Ctrl+Alt+D         |
| ⌥⌘G             | Ir a                   | Ctrl+G             |

Dos de ellos cambian en Windows, por la misma razón que hace que Word los separe. **macOS reserva ⌥⌘D**: muestra y oculta el Dock. Por eso la nota al final es ⌥⌘E en el Mac y Ctrl+Alt+D en cualquier otro sistema. Y **Ir a** prescinde de Alt: Ctrl+G, donde el atajo del Mac sí lo incluye.

**Sheets**, con la cuadrícula enfocada

| Atajo (macOS) | Qué hace        | Windows / Linux |
| ------------- | --------------- | --------------- |
| ⌥⌘0           | Bordes externos | Ctrl+Shift+7    |
| ⌥⌘−           | Sin borde       | Ctrl+Shift+−    |

Windows no es una reescritura del par del Mac. Excel para Mac ofrece a Sheets **ambos**: ⌘⇧7 y ⌥⌘0 son dos teclas para los mismos bordes externos, así que en Windows el comando conserva la combinación Ctrl+Shift que ya tenía, y la capa Option simplemente no existe.

Tenga en cuenta que **⌥⌘0 significa Normal en Docs y Bordes externos en Sheets**. Nunca aparecen en el mismo editor, así que en la práctica no hay conflicto, pero ⌥⌘0 está ocupado y no está disponible como atajo global.

**Todos los editores**: **⌥⌘R / Ctrl+F1** contrae la cinta de opciones, tal como se ha descrito arriba.

Eso deja ⌥⌘D libre para que OfficeVega lo use en macOS si algún comando futuro lo necesita.
-->

## Adónde ir después

- Dónde viven los archivos: [La pantalla de inicio](help://home-screen).
- Gestionar muchos archivos abiertos: [Pestañas y gestión de ventanas](help://tabs-and-windows).
- Dejar que la IA haga el trabajo: [El panel de IA](help://ai-panel).
- Idioma, tema, aplicaciones predeterminadas: [Configuración, idioma, tema e integraciones MCP](help://settings-integrations).

¿Necesita ayuda? Pregunte en [officevega.com/feedback](https://officevega.com/feedback), siga las novedades en el canal de Telegram [t.me/getmyai](https://t.me/getmyai) o escriba a [mail@vega.chat](mailto:mail@vega.chat).
