# Configuración, idioma, tema e integraciones MCP

## Abrir la configuración

La fila de cuenta de la parte inferior izquierda de Inicio abre el panel de configuración (muestra «Iniciar sesión» cuando no hay sesión). Tiene seis secciones: Cuenta, Modelo de IA, Medios de IA y búsqueda, General, Integraciones y Acerca de.

![Configuración ▸ General, donde están el idioma, el tema, el guardado automático y el interruptor de la estadística de uso](img/settings-general.png)

La configuración de modelos tiene su propio artículo; en **Medios de IA y búsqueda** se activan, por proveedor, la generación de imágenes, el análisis de imágenes, el análisis de vídeo, la búsqueda web y la búsqueda de archivos locales.

## Idioma

- La configuración ofrece **21 idiomas de interfaz**: inglés, chino simplificado, japonés, coreano, francés, alemán, español, tailandés, indonesio, ruso, árabe, portugués, italiano, polaco, checo, neerlandés, malayo, hebreo, hindi, chino tradicional, vietnamita.
- El cambio se aplica de inmediato y se conserva; la barra de menús nativa se reconstruye con el nuevo idioma.

## Tema

Claro / Oscuro / Seguir el sistema. «Seguir el sistema» sigue la apariencia del sistema operativo, y los editores cambian de aspecto en sincronía, sin parpadeos. El mismo interruptor también cambia los colores del panel de IA y de la pantalla de inicio, de modo que toda la aplicación mantiene un solo diseño: Claro para las habitaciones luminosas, Oscuro para trabajar de noche, Seguir el sistema para seguir a Windows.

## General

- **Sin análisis de seguimiento**: OfficeVega se distribuye sin Google Analytics ni ningún otro rastreador de terceros. Los contenidos de los documentos, los nombres de archivo y los eventos de uso nunca se recopilan ni se envían a ningún sitio.
- **Posición de la barra lateral de IA** (izquierda o derecha), **Tamaño del texto del panel de IA** y **Corrección ortográfica en el chat de IA**.
- **Abrir el panel de IA en documentos nuevos**: si está desactivado, un documento nuevo empieza con el panel plegado, a un clic de distancia.
- **Guardar automáticamente todos los documentos** activa el guardado automático de forma predeterminada en todos los editores; aun así puede desactivarlo para una ventana.
- **Ubicación de guardado** con un botón **Cambiar** y **Aplicación predeterminada para documentos de Office** para asignar .docx / .xlsx / .pptx a OfficeVega.

## Medios de IA y búsqueda

No son interruptores: cada capacidad elige el proveedor que la sirve, y la clave y la URL base de un proveedor se introducen una sola vez y se comparten:

- **Búsqueda web**, **Generación de imágenes**, **Análisis de imágenes** y **Análisis de vídeo**, cada una con un proveedor, un modelo, una clave y una URL base. Elija **VEGA** como proveedor para enrutarlas a través de `api.vega.chat` con su clave de inicio de sesión.
- La **búsqueda de archivos local** corre en esta máquina. Debajo, el **reranking de búsqueda Jev** está **desactivado por defecto**. Al activarlo, los extractos de los 20 primeros aciertos locales — hasta 1.200 caracteres por documento, más nombres de archivos y carpetas — van al punto final de decisión que elijas (VEGA, Jev vía OpenRouter o TypeSafe, Perplexity, Liquid AI d1, Cloudflare, un motor local o una URL propia) para reordenarlos por relevancia. Desactivado, nada deja el dispositivo.

## Acerca de

- **Versión**, el sitio del proyecto [officevega.com](https://officevega.com) y la página de versiones [officevega.com/releases](https://officevega.com/releases).
- **Canal de actualización**: Estable o Beta. El cambio surte efecto de inmediato y busca una actualización; no degrada una instalación Beta a Estable.

## Aplicaciones predeterminadas

La configuración puede registrar OfficeVega como programa predeterminado para .docx / .xlsx / .pptx / .pdf y formatos similares (registro de aplicación predeterminada a nivel de plataforma; confirme cuando se le pida).

## Avisos de software de terceros y actualizaciones

- Ayuda ▸ Avisos de software de terceros: el inventario completo de licencias de código abierto que se distribuye con la aplicación.
- Ayuda ▸ Buscar actualizaciones: inicia una comprobación manual; si hay una versión más reciente, se ofrece instalarla.

## Iniciar sesión en VEGA

- El acceso a la sesión (en la configuración o en la lista de proyectos en la nube) usa un flujo de **código de dispositivo**: OfficeVega muestra un código y abre el inicio de sesión en el navegador; continúa sola cuando termina.
- El inicio de sesión solo se usa para la lista de proyectos en la nube y los modelos alojados de VEGA en `api.vega.chat`. Sin él, todas las funciones locales y los modelos personalizados siguen funcionando.
- Cerrar la sesión es un clic en la configuración.

## Soporte

Preguntas, ideas e informes de errores: [officevega.com/feedback](https://officevega.com/feedback), canal de Telegram [t.me/getmyai](https://t.me/getmyai), correo [mail@vega.chat](mailto:mail@vega.chat). Desarrollador: [getmyai.io](https://getmyai.io) (Dmitry Filippov).

## Integración MCP (para usuarios avanzados / clientes de IA)

**Integraciones** es el panel que conecta OfficeVega con un agente de programación, y tiene su propio artículo: Conectar un agente de programación. La versión corta: elija una vía (la línea de comandos o MCP), siga esa sección y después abra un chat nuevo y haga su pregunta.

![Configuración ▸ Integraciones: los tres pasos, luego las filas de habilidades y las opciones de MCP](img/settings-integrations.png)

En **Servidor HTTP local**, la aplicación puede ejecutar el servidor por su cuenta (un interruptor de activación y un puerto). **Avanzado** añade la URL de comprobación de estado y el archivo de registro. Solo escucha en localhost.

## Chuleta de la línea de comandos

| Comando             | Qué hace                      |
| ------------------- | ----------------------------- |
| `officevega <file>` | abrir un archivo              |
| `officevega mcp`    | iniciar el servidor MCP local |
| `officevega --help` | todos los comandos y opciones |
