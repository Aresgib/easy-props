# Flora Forge · 1.2.0

## Variedad de 1.2

La biblioteca pasa de 10 a **20 presets**. El abedul se rehízo con tronco claro, marcas oscuras y copa abierta por pisos. Incluye abedul verde, dorado con sombras coral, de varios troncos y colgante; también álamo, cerezo en flor, olivo, baobab, ciprés, abeto por pisos y topiario, además de las especies anteriores.

Los nuevos controles modifican estructura y sombreado: inicio de copa, tamaño y altura de los volúmenes, asimetría, grosor de ramas, número y separación de troncos, normales por volumen / copa completa / hacia arriba, cinco estilos de corteza y paletas dorado, rojo y lavanda. Las cortezas utilizan un atlas original de **512 × 512**: las marcas llegan a los GLB y al shader de Godot. Las nuevas formas son **Por pisos / abierta**, **Irregular** y **En abanico**. No añade materiales ni objetos por cada tronco: se conserva una malla con dos superficies por LOD.

Ejemplos reales: `samples/flora_forge_12_birch.blend` y `.png` muestran tres abedules; `samples/flora_forge_12_variety.blend` y `.png` presentan los 20 presets. El proyecto `samples/flora_godot12/` contiene abedules exportados. Los presets son puntos de partida ajustables y reproducibles por semilla; no incluye un sistema de dispersión ni moldeado de copas con mallas externas.

Para actualizar, instala el **ZIP 1.2** con **Reemplazar / Overwrite** y reinicia Blender. Para recibir el nuevo diseño de abedul, elige uno de los nuevos presets y pulsa **Crear planta**, o **Aplicar cambios** si quieres sustituir la planta activa. **Leer parámetros** conserva las dimensiones y colores de tu planta anterior y completa los controles nuevos con sus valores predeterminados.

## Corrección visual de 1.1

Se rehízo el follaje para acercarlo al aspecto esponjoso de las referencias: texturas más densas y sin vetas oscuras, planos inclinados con independencia de sus normales, copas por lóbulos y un **degradado continuo gobernado por normales de volumen**. La luz artística mezcla el color de sombra y el de luz sin sumar sombras negras entre planos. El mismo sombreado Suave o Cel funciona en Blender y en el shader nativo de Godot.

`samples/flora_forge_11_fluffy.blend` y `samples/flora_forge_11_fluffy.png` muestran el resultado real con tres árboles y dos arbustos. La imagen anterior de 1.0 utilizaba sombreado PBR y no representaba bien la dirección visual solicitada.

En plantas de 1.0, pulsa **Leer parámetros de la planta** y **Aplicar cambios** para reconstruir geometría y materiales. Cargar de nuevo un preset también recupera los nuevos valores de normales y ramas.

Complemento independiente de Blender para generar vegetación estilizada destinada a juegos y exportarla a **Godot 4**. Los modelos y las texturas son originales; las imágenes de referencia sirven como dirección visual.

Requiere Blender **4.2 o posterior**. La versión 1.2 se probó en **Blender 5.1.0** y **Godot 4.7.2 oficial con Compatibility / OpenGL y Mobile / Vulkan**, usando Intel UHD. No requiere instalar bibliotecas ni descargar texturas. Los atlas están incluidos y se empaquetan en el archivo `.blend` y en los GLB.

## Instalar y crear

1. En Blender, abre **Editar → Preferencias → Extensiones → menú → Instalar desde disco**.
2. Selecciona `dist/flora_forge-1.2.0.zip` sin descomprimirlo y activa la extensión.
3. En la Vista 3D, pulsa **N** y abre **Flora Forge**.
4. Elige la especie y pulsa **Crear planta**. Aparece en el cursor 3D.
5. Cambia a **Vista previa de materiales** para ver los huecos entre hojas. El modo Sólido muestra los planos completos.
6. Ajusta parámetros y pulsa **Aplicar cambios a la planta**. **Nueva variante** conserva la anterior y crea otra planta con la siguiente semilla en el cursor.

Selecciona otra raíz o una de sus mallas y pulsa **Leer parámetros de la planta** para continuar editándola. El campo **Planta activa** identifica el objeto que se actualizará. Los cambios se aplican explícitamente; la generación y la actualización admiten Deshacer. Regenerar reemplaza las mallas de los tres LOD de esa planta: guarda una copia si has editado sus vértices a mano.

## Controles

| Control | Resultado |
| --- | --- |
| Especie | Carga dimensiones, forma, hojas y flores del preset. |
| Semilla | Variación reproducible de tronco, ramas, volúmenes y colocación de planos. |
| Forma de copa | Redonda, extendida, columnar, por pisos, irregular, abanico, cónica, sombrilla, colgante, palmera, arbusto o flores. |
| Altura / anchura | Dimensiones base en metros; las hojas pueden sobresalir ligeramente. |
| Volúmenes / frondas | Número de grupos de copa; en palmeras, cantidad de frondas. |
| Inicio de ramas / curvatura / radio | Estructura del tronco y de sus ramas. |
| Inicio de copa / tamaño y altura de volúmenes | Abre huecos, concentra el follaje arriba o separa la copa en pisos. El inicio de copa afecta a las formas redonda, extendida, columnar, por pisos, irregular, abanico y cónica. |
| Asimetría | Varía posiciones y tamaños de los grupos de hojas, conservando la semilla. |
| Grosor de ramas / troncos / separación | Una estructura más fina o gruesa y de uno a cinco troncos; palmeras y flores usan uno. |
| Corteza | Lisa, abedul, surcos, plateada o anillos de palmera, multiplicada por el color del tronco. |
| Planos / tamaño de hojas | Densidad y tamaño de grupos de hojas. En palmeras, las frondas utilizan una tira curva continua. |
| Normales esponjosas | Mezcla normales de los planos con normales elipsoidales de cada volumen. |
| Origen de normales | Cada volumen, copa completa o hacia arriba; modifica las normales exportadas sin añadir triángulos. |
| Orientación hacia arriba | Sesga las normales para iluminar mejor la copa desde arriba. |
| Paleta / colores | Verano, otoño, rosa, turquesa, seco o colores propios de luz, sombra, corteza y flores. |
| Recorte alfa | Umbral compartido por Blender, GLB y shader de Godot. |
| Presupuesto | Ligero, Equilibrado o Detalle. Modifica planos y resolución de troncos. |
| Vista previa LOD | Muestra uno de los tres niveles de detalle en Blender. |
| Sombreado / dirección de luz artística | Degradado suave o bandas de color en Blender y Godot, dirigido por normales. |
| Viento | Opciones de Godot que se guardan al aplicar cambios. |

El follaje combina **planos texturizados, normales de volumen y colores por vértice**. Las normales quedan guardadas en la malla y se exportan. No hay esferas opacas sustituyendo las hojas. El material de Blender y el shader de Godot calculan una rampa de color desde esas normales. La dirección de luz artística es un control propio del material: el follaje mantiene ese color pintado aunque cambies las luces de la escena, proyecta sombras recortadas y no recibe sombras dinámicas. En Blender el tronco conserva iluminación PBR; en la escena de Godot un segundo shader utiliza sus colores por vértice y normales para conservar el marrón, o el verde de los tallos, entre renderers. Esto evita el moteado negro de miles de hojas superpuestas y reduce el coste de iluminación del follaje.

## Exportar a Godot

1. Aplica los cambios pendientes y pulsa **Exportar planta · Godot / GLB**.
2. Elige una carpeta. Se crea una subcarpeta con el nombre de la planta. Si ya existe, sus archivos con el mismo nombre se reemplazan.
3. Copia la subcarpeta completa dentro del proyecto de Godot, bajo `res://`. Espera a que importe los archivos.
4. Arrastra el archivo **`.tscn`** a tu escena. El script `@tool` asigna el shader solo a las superficies de follaje y configura las distancias de LOD tanto en el editor como al ejecutar.
5. En la raíz puedes cambiar `lod_distances` o desactivar `enable_lod` para usar únicamente LOD0. La escena no necesita procesamiento por fotograma para gestionar LOD.

La exportación incluye tres GLB, `foliage_atlas.png`, `bark_atlas.png`, `foliage.gdshader`, `foliage.tres`, `bark.gdshader`, `bark.tres`, `vegetation.gd`, una escena `.tscn`, `flora.json` con parámetros y conteos y `LEEME.txt`. Las rutas internas son relativas: la carpeta completa se puede mover dentro del proyecto. Se generan shaders nativos de Godot; los nodos de Blender no se exportan como código de shader.

Los GLB también funcionan solos con materiales PBR estándar: textura RGBA incrustada, alfa MASK, doble cara, normales, UV y colores. **Para conservar el acabado pintado de 1.1, utiliza el `.tscn` y su shader**; el material estándar por sí solo responde a las luces del motor. El viento también requiere el shader. `COLOR_0.rgb` contiene el color base lineal y su alfa es 1; `TEXCOORD_1.x` / `UV2.x` almacena el peso de viento. Esto evita que la máscara de viento vuelva semitransparentes las hojas. La exportación usa copias temporales de objetos y mallas, con un material PBR alternativo: conserva materiales originales, selección, transformaciones y LOD visible en Blender. Cada modelo se exporta centrado en su raíz, con ejes glTF Y-up. El shader convierte el color para el renderer Compatibility de Godot y exporta la dirección de luz de Z-up a Y-up.

## Presupuesto de geometría

Conteos medidos en los presets Equilibrado, semilla 7, antes de personalizarlos:

| Preset | LOD0 | LOD1 | LOD2 |
| --- | ---: | ---: | ---: |
| Roble | 1 610 | 822 | 406 |
| Arce | 1 464 | 748 | 368 |
| Abedul verde | 1 584 | 808 | 392 |
| Pino | 1 384 | 708 | 352 |
| Sauce | 1 888 | 964 | 488 |
| Acacia | 1 490 | 762 | 382 |
| Palmera | 928 | 676 | 440 |
| Arbusto | 932 | 480 | 244 |
| Margaritas | 336 | 168 | 120 |
| Rosal | 1 136 | 582 | 328 |
| Abedul dorado | 1 618 | 824 | 390 |
| Abedul de varios troncos | 2 280 | 1 176 | 576 |
| Abedul colgante | 1 730 | 882 | 430 |
| Álamo | 1 424 | 728 | 360 |
| Cerezo | 1 730 | 882 | 430 |
| Olivo | 1 370 | 702 | 358 |
| Baobab | 1 418 | 724 | 350 |
| Ciprés | 1 596 | 816 | 412 |
| Abeto por pisos | 1 498 | 764 | 366 |
| Topiario | 814 | 418 | 194 |

Cada LOD utiliza una sola malla con **dos superficies / materiales**, un atlas de follaje de **1024 × 512** y un atlas de corteza de **512 × 512**. LOD1 y LOD2 retienen grupos de hojas y agrandan sus planos para conservar la silueta, y reducen lados y segmentos de troncos. Las distancias predeterminadas de Godot son **0–18, 18–40 y 40–90 m**; después de 90 m la planta se oculta. Los saltos de LOD son discretos; no se incluye fundido entre niveles ni impostor billboard.

Un conteo bajo de triángulos no garantiza FPS: también importan la superposición de planos, resolución, sombras, cantidad de plantas y GPU. Para muchos árboles, comienza con Ligero y ajusta distancia máxima. Para grandes bosques, reutiliza meshes y materiales con MultiMesh; el complemento exporta plantas individuales y no genera un sistema de bosque o de MultiMesh. No incluye colisiones.

## Ejemplos y validación

- `samples/flora_forge_demo.blend`: las veinte plantas editables, con sus tres LOD; el roble y el abedul dorado tienen 680 planos como ejemplo de personalización.
- `samples/flora_forge_gallery.blend` y `samples/flora_forge_preview.png`: escena de presentación y render real en Blender.
- `samples/flora_godot/`: proyecto de Godot con un roble exportado y materiales.
- `samples/flora_godot_preview.png`: render real del shader nativo.
- `samples/flora_forge_11_fluffy.blend` y `.png`: ejemplo del nuevo aspecto suave.

Pruebas de geometría pura, generación de todas las especies, actualización, lectura de parámetros antiguos, registro, paneles, identificadores de iconos reales de Blender 5.1, normales, UV, colores, textura incrustada, GLB MASK, preservación de materiales, selección y transformaciones e importación real de Godot. Las pruebas de Godot comprueban materiales de hojas, color por vértice y distancias de visibilidad. No se han medido FPS ni comparado todas las GPU o versiones de Blender.

Fuentes técnicas: [API glTF de Blender](https://docs.blender.org/api/5.0/bpy.ops.export_scene.html), [shaders espaciales de Godot](https://docs.godotengine.org/en/stable/tutorials/shaders/shader_reference/spatial_shader.html).

## Licencia

Código del complemento: GPL-3.0-or-later. Atlas originales de follaje y corteza y helpers exportados de Godot: también disponibles bajo CC0-1.0. Puedes utilizar las plantas generadas en juegos comerciales o personales. Consulta `LICENSE.txt` y `COPYING`.
