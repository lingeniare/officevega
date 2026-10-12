# El panel de IA

Todos los editores pueden invocar el panel de IA: seleccione algo, dé una instrucción y vea el resultado a medida que se genera.

## Abrirlo y usarlo

![El panel de IA en Docs](img/ai-panel.png)

- Entradas: el **botón de IA** en la cinta de opciones de cada editor, **Pedir a la IA** en los menús contextuales, o Pedir a la IA en la barra de marcado.
- Describa la tarea en lenguaje natural (reescribir esto / convertir esta columna en porcentajes / rehacer el diseño de esta página…) y pulse Intro.
- Las respuestas se renderizan **en streaming**; cuando la IA necesita herramientas (leer el documento, editarlo), las ejecuta y sigue hasta terminar.
- **Detener**: interrumpa la vuelta en curso en cualquier momento.
- **Cola**: mientras se genera una respuesta, Enter pone tu mensaje en cola en lugar de descartarlo — una franja sobre el campo de entrada los cuenta; ábrela para editar, quitar, reordenar, pausar o vaciar. El siguiente mensaje se envía solo al terminar el turno; Esc sigue deteniendo el turno.

## Qué sabe hacer

- **Docs**: reescribir, ampliar, traducir, resumir, insertar tablas e imágenes, ajustar el formato; cada respuesta guarda primero una instantánea.
- **Sheets**: fórmulas, relleno de datos, transformaciones masivas, formato.
- **Slides**: generación de una presentación completa, ajuste del diseño, reescritura de los textos.
- **PDF**: preguntas y resúmenes sobre el texto o las páginas seleccionadas.
- **Markdown / HTML**: reescribir, ampliar, traducir.
- **Inicio ▸ Ask AI** responde desde tus archivos destacados y los cita — el panel de base de conocimiento tiene su propia sección en el capítulo Inicio, y el panel de IA de Docs lleva la misma capacidad.

## Historial de chats

- Cada conversación se guarda automáticamente y permanece en este equipo: abra el panel mañana y continúe donde lo dejó.
- Empiece un chat nuevo con **Nuevo chat**; cambie entre chats anteriores en la lista del historial en la parte superior del panel.
- Cambie el nombre de un chat para encontrarlo más rápido; bórrelo para eliminarlo para siempre. Borrar un chat nunca afecta a sus documentos.

## Ocultar una selección a la IA

- En Slides, HTML y Markdown una selección puede quitarse de la vista del modelo: clic derecho ▸ **Ocultar la selección a la IA**, ponle nombre al marcador, y el modelo lee `{{nombre}}` en su lugar. (Markdown arma la opción con el interruptor de ojo tachado de su cinta; la de HTML vive en el panel de código.)
- El archivo conserva el texto real — guardar, exportar e imprimir quedan intactos, y la marca sobrevive a reabrir. La misma opción deshace el ocultamiento (Markdown tiene además **Volver a mostrar la selección a la IA**).
- HTML oculta contenidos de elementos, valores de atributos y literales de cadena de los scripts; la página renderizada nunca cambia.
- Slides también oculta imágenes, vídeos y audios enteros, y una diapositiva con contenido oculto nunca se envía como captura: la revisión automática de diseño se salta la página y lo avisa.
- Esto vale solo para la IA de la aplicación — la CLI, las herramientas MCP y la exportación sin interfaz leen el archivo directamente y siguen viendo el texto.

## Restaurar y seguridad

- El panel de Docs conserva una **lista de versiones**: una instantánea por respuesta. Puede volver a cualquiera de ellas, y esa restauración también se puede deshacer con Ctrl+Z. Las instantáneas se conservan al reabrir el documento.
- Las ediciones de la IA pasan por el mismo flujo de edición que las manuales (se pueden deshacer y requieren guardar): nada omite su confirmación de guardado.

## Privacidad y anonimización

- Las instrucciones y el contenido pertinente del documento se envían al **servicio de modelos que haya configurado** (VEGA alojado o un endpoint personalizado, capítulo siguiente); sin configuración, no se envía nada.
- **Anonimización (152-FZ)**: antes de enviar, la aplicación puede ocultar datos personales (nombres, números de teléfono, correos electrónicos, datos de pasaporte) para que el modelo nunca los vea. Actívela en Configuración ▸ IA; los fragmentos ocultos se restauran automáticamente en su documento.
- **Sin análisis de seguimiento**: OfficeVega se distribuye sin Google Analytics ni ningún otro rastreador de terceros. No hay un interruptor de estadísticas de uso porque no hay nada que apagar: los documentos y el contenido de los chats nunca salen de la ruta que usted ha configurado.
- Los archivos locales no se suben a ningún otro sitio; las claves BYOK se guardan en el archivo de ajustes de la aplicación en este equipo y se envían solo en las cabeceras de las peticiones.
