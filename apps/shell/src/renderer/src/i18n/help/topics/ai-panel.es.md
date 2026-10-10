# El panel de IA

Todos los editores pueden invocar el panel de IA: seleccione algo, dé una instrucción y vea el resultado a medida que se genera.

## Abrirlo y usarlo

![El panel de IA en Docs](img/ai-panel.png)

- Entradas: el **botón de IA** en la cinta de opciones de cada editor, **Pedir a la IA** en los menús contextuales, o Pedir a la IA en la barra de marcado.
- Describa la tarea en lenguaje natural (reescribir esto / convertir esta columna en porcentajes / rehacer el diseño de esta página…) y pulse Intro.
- Las respuestas se muestran **a medida que se generan**; cuando la IA necesita herramientas (leer el documento, editarlo), las ejecuta y sigue hasta terminar.
- **Detener**: interrumpa la respuesta en curso en cualquier momento.

## Qué sabe hacer

- **Docs**: reescribir, ampliar, traducir, resumir, insertar tablas e imágenes, ajustar el formato; cada respuesta guarda primero una instantánea.
- **Sheets**: fórmulas, relleno de datos, transformaciones masivas, formato.
- **Slides**: generación de una presentación completa, ajuste del diseño, reescritura de los textos.
- **PDF**: preguntas y resúmenes sobre el texto o las páginas seleccionadas.
- **Markdown / HTML**: reescribir, ampliar, traducir.

## Historial de chats

- Cada conversación se guarda automáticamente y permanece en este equipo: abra el panel mañana y continúe donde lo dejó.
- Empiece un chat nuevo con **Nuevo chat**; cambie entre chats anteriores en la lista del historial en la parte superior del panel.
- Cambie el nombre de un chat para encontrarlo más rápido; bórrelo para eliminarlo para siempre. Borrar un chat nunca afecta a sus documentos.

## Restaurar y seguridad

- El panel de Docs conserva una **lista de versiones**: una instantánea por respuesta. Puede volver a cualquiera de ellas, y esa restauración también se puede deshacer con Ctrl+Z. Las instantáneas se conservan al reabrir el documento.
- Las ediciones de la IA pasan por el mismo flujo de edición que las manuales (se pueden deshacer y requieren guardar): nada omite su confirmación de guardado.

## Privacidad y anonimización

- Las instrucciones y el contenido pertinente del documento se envían al **servicio de modelos que haya configurado** (VEGA alojado o un endpoint personalizado, capítulo siguiente); sin configuración, no se envía nada.
- **Anonimización (152-FZ)**: antes de enviar, la aplicación puede ocultar datos personales (nombres, números de teléfono, correos electrónicos, datos de pasaporte) para que el modelo nunca los vea. Actívela en Configuración ▸ IA; los fragmentos ocultos se restauran automáticamente en su documento.
- **Sin análisis de seguimiento**: OfficeVega se distribuye sin Google Analytics ni ningún otro rastreador de terceros. No hay un interruptor de estadísticas de uso porque no hay nada que apagar: los documentos y el contenido de los chats nunca salen de la ruta que usted ha configurado.
- Los archivos locales no se suben a ningún otro sitio; las claves BYOK se guardan en el archivo de ajustes de la aplicación en este equipo y se envían solo en las cabeceras de las peticiones.
