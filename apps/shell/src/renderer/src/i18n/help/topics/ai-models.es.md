# Modelos de IA y ajustes

## Proveedores y modelos

Los modelos y las claves se configuran en Configuración (la fila de cuenta de la parte inferior izquierda de Inicio):

![La ventana de configuración](img/settings-general.png)

- **VEGA en sus servidores**: inicie sesión (flujo por código de dispositivo) y úselo, sin ninguna configuración. Las peticiones van a `https://api.vega.chat`, un endpoint compatible con OpenRouter, así que cualquier cliente de estilo OpenRouter puede apuntar a él.
- **Endpoints personalizados (BYOK)**: Configuración ▸ IA pide una URL base y una clave API por protocolo: compatible con OpenAI, Anthropic, Gemini, DeepSeek, DashScope (qwen) y más. Las claves se guardan en el archivo de ajustes de la aplicación en este equipo y se envían solo en las cabeceras de las peticiones.
- Se puede elegir un modelo distinto por capacidad: chat/generación, generación de imágenes, análisis de imágenes.
- **Probar conexión**: comprueba que el endpoint sea accesible y que el modelo esté visible antes de guardar.
- Las URL base pueden incluir una ruta y una cadena de consulta (estilo pasarela); las rutas del endpoint se añaden correctamente.

## Elegir un modelo

- El selector de modelo está en la parte superior del panel de IA y en Configuración ▸ Modelo de IA: una elección para el chat y, si el proveedor lo admite, elecciones separadas para la generación y el análisis de imágenes.
- Empiece con el modelo VEGA predeterminado: sirve para la mayoría de tareas de oficina (reescritura, tablas, fórmulas, resúmenes). Cambie a un modelo más grande para razonamientos difíciles o documentos largos, y a uno más pequeño y económico para borradores rápidos.
- Una conversación en curso mantiene el modelo anterior hasta su siguiente respuesta; los chats nuevos usan la nueva elección de inmediato.

## Precios y uso

- La facturación de VEGA es de pago por uso, modelo a modelo. La lista completa de precios está en [api.vega.chat/aimodels](https://api.vega.chat/aimodels): revise el precio de entrada y salida de un modelo antes de un trabajo grande.
- El saldo y el gasto actuales están en el [panel de VEGA](https://api.vega.chat/dashboard), al que también se accede desde la fila de saldo del menú de la cuenta.
- Sin inicio de sesión, solo funcionan las opciones gratuitas integradas; inicie sesión para desbloquear todos los modelos de la lista de precios.

## Integración con la CLI (tipo Codex)

- Los ajustes aceptan la ruta de un programa CLI local (los directorios personales no ASCII y un prefijo ~ funcionan; ~ se expande automáticamente). Detectar modelos consulta los modelos disponibles de esa CLI.
- La validación solo comprueba que la ruta existe: no impone restricciones de caracteres.

## Cuándo se aplican los cambios

- Los cambios de modelo y de endpoint se aplican de inmediato; una conversación en curso mantiene la configuración anterior hasta su siguiente respuesta.
