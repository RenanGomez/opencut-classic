# Investigación: GIFs, memes y recursos gratuitos

**Estado: REVISIÓN PENDIENTE.** Nada de esto está integrado todavía. Antes de usar cualquiera de estas fuentes en anuncios de la empresa, confirmar sus términos vigentes.

Fecha: 2026-10-27. Hecha con sub-agentes de investigación web; los puntos marcados como *comprobado* se verificaron directamente desde esta máquina.

## Ya integrado en este fork (rama `mis-cambios`)

- Stickers: Flags, Shapes, Emoji e Icons (Iconify).
- Stock: Pixabay (fotos y videos). Pexels no da claves nuevas por ahora; Unsplash quedó sin clave.
- Sounds: Freesound (en desarrollo sin Redis).
- Exportar audio en MP3 y WAV.
- OpenCut ya trae subtítulos automáticos (Whisper vía `@huggingface/transformers`) y Google Fonts.

## GIFs

| Servicio | ¿Da claves? | Notas |
|---|---|---|
| KLIPY | Sí, clave de prueba al momento (Partner Panel) | 100 peticiones/hora en prueba. Da MP4 y WebM y tiene API de stickers. Pide mostrar su marca. Sus términos generales dicen "uso personal y no comercial": pedir confirmación por escrito antes de usar en anuncios. |
| GIPHY | Probablemente | La red de Listentrust bloquea su sitio y su API (*comprobado*: sin respuesta desde esta máquina). Claves beta de ~100 peticiones/hora; pide "Powered by GIPHY". Términos no leídos. |
| Tenor (Google) | No | Ya no acepta clientes nuevos (*comprobado* en su página); la API se apagó en junio de 2026 según la prensa. |

OpenCut trata los `.gif` como imagen fija: hay que importar la versión MP4/WebM.

## Memes

| Fuente | Acceso | Riesgo en anuncios |
|---|---|---|
| memegen.link (`jacebrowning/memegen`) | API sin clave, código MIT, se puede instalar localmente. 221 plantillas (*comprobado*). Acepta imagen de fondo propia (`background=`). | Alto con las plantillas; bajo usando imágenes propias. |
| Imgflip | `get_memes` sin clave (*comprobado*); `caption_image` con cuenta gratis. Marca de agua en la versión gratis. | Alto. |
| Openverse / Wikimedia Commons | Licencia por archivo; muy pocos memes. | Bajo-medio, revisando cada archivo. |
| Know Your Meme, Reddit, datasets copiados (deephumor, etc.) | Sin API o con aprobación; sin licencia clara. | Evitar. |

Las plantillas de memes suelen ser fotos de películas, series o personas reales. Para anuncios: usar el formato del meme con imágenes propias o con licencia clara.

## Otros recursos, por utilidad

1. Voz en off con Kokoro-82M (Apache 2.0), en el navegador. Hay voces en español; calidad sin comprobar.
2. Quitar fondo de fotos con BiRefNet_lite ONNX (MIT) vía transformers.js. Evitar `@imgly/background-removal` (AGPL) y RMBG de BRIA (no comercial).
3. Emojis animados: Microsoft Fluent Emoji (MIT) o Noto animado (CC BY 4.0, pide crédito).
4. Transiciones: gl-transitions (MIT). Hay que adaptarlas al compositor Rust/WASM.
5. Música: no hay API gratuita apta para anuncios. Pixabay no ofrece música por API; Jamendo es de pago para uso comercial. Opción práctica: biblioteca local descargada a mano (Pixabay Music, Mixkit).
6. Coverr (video de stock con API gratuita): términos ambiguos sobre uso comercial; preguntar antes.

## Pendiente de revisar

- [ ] Elegir qué integrar primero (memegen o KLIPY).
- [ ] Confirmar por escrito con KLIPY/GIPHY el uso en anuncios comerciales.
- [ ] Probar GIPHY desde una red sin filtro.
- [ ] Revisar forks de OpenCut (no se auditaron).

## Fuentes

- https://imgflip.com/api
- https://github.com/jacebrowning/memegen
- https://developers.google.com/tenor/guides/quickstart
- https://klipy.com/developers
- https://klipy.com/support/terms-services
- https://pixabay.com/api/docs/
- https://github.com/huggingface/transformers.js
- https://huggingface.co/hexgrad/Kokoro-82M
- https://huggingface.co/onnx-community/BiRefNet_lite-ONNX
- https://github.com/gl-transitions/gl-transitions
- https://github.com/microsoft/fluentui-emoji
- https://coverr.co/license
- https://developer.jamendo.com/v3.0
