"""Portable GLBs plus an optional ready-to-use Godot 4 scene and shader."""
from pathlib import Path
import json
import re
import shutil
import struct
import bpy
from .core import Settings, unit
from .generation import material as foliage_material

ROOT=Path(__file__).parent


def mask_materials(path,cutoff):
    """Blender 4.2+ has no explicit CLIP mode; make glTF alpha mode unambiguous."""
    payload=path.read_bytes()
    magic,version,size=struct.unpack_from('<III',payload)
    if magic!=0x46546C67 or version!=2 or size!=len(payload): raise ValueError('GLB inválido.')
    length,kind=struct.unpack_from('<II',payload,12)
    document=json.loads(payload[20:20+length])
    for mat in document.get('materials',[]):
        if mat.get('name','').startswith('FF_Leaves'):
            mat['alphaMode']='MASK'; mat['alphaCutoff']=cutoff; mat['doubleSided']=True
            if 'baseColorTexture' not in mat.get('pbrMetallicRoughness',{}):
                raise ValueError('El exportador no incluyó la textura del follaje.')
    encoded=json.dumps(document,separators=(',',':'),ensure_ascii=True).encode()
    encoded+=b' '*((-len(encoded))%4)
    chunks=struct.pack('<II',len(encoded),kind)+encoded+payload[20+length:]
    path.write_bytes(struct.pack('<III',magic,version,len(chunks)+12)+chunks)
    return document


def export_bundle(context,properties,directory,godot=True):
    root=properties.target
    if not root or not root.get('flora_forge'): raise ValueError('Primero crea o selecciona una planta de Flora Forge.')
    if context.mode!='OBJECT': raise ValueError('Cambia a Modo Objeto para exportar.')
    # Name identifies one self-contained subfolder. Export does not depend on .blend save path.
    name=re.sub(r'[^A-Za-z0-9_\-]','_',root.name).strip('_') or 'flora'
    directory=Path(directory)/name
    directory.mkdir(parents=True,exist_ok=True)
    parts=sorted([o for o in root.children if o.get('flora_part')],key=lambda o:o['flora_lod'])
    if len(parts)!=3: raise ValueError('Faltan niveles de detalle. Regenera la planta.')
    settings=json.loads(root['flora_settings'])
    export_settings=Settings(**settings)
    selected=list(context.selected_objects); active=context.view_layer.objects.active
    context.view_layer.update()
    temporary=[]
    color_options={}
    rna=bpy.ops.export_scene.gltf.get_rna_type().properties
    if 'export_vertex_color' in rna:
        identifiers={item.identifier for item in rna['export_vertex_color'].enum_items}
        if 'ACTIVE' in identifiers: color_options['export_vertex_color']='ACTIVE'
    if 'export_all_vertex_colors' in rna: color_options['export_all_vertex_colors']=True
    try:
        for obj in context.selected_objects: obj.select_set(False)
        for level,source in enumerate(parts):
            obj=source.copy(); obj.parent=None; obj.data=source.data.copy()
            obj.data.materials[1]=foliage_material(True,settings['alpha_cutoff'],export_settings,portable=True)
            context.scene.collection.objects.link(obj); temporary.append(obj)
            obj.matrix_world=root.matrix_world.inverted_safe() @ source.matrix_world
            obj.hide_viewport=False; obj.hide_render=False; obj.hide_set(False)
            obj.select_set(True); context.view_layer.objects.active=obj
            result=bpy.ops.export_scene.gltf(filepath=str(directory/f'{name}_LOD{level}.glb'),export_format='GLB',use_selection=True,export_normals=True,export_texcoords=True,export_materials='EXPORT',export_animations=False,export_extras=True,export_yup=True,**color_options)
            if result!={'FINISHED'}: raise RuntimeError('Blender canceló la exportación glTF.')
            mask_materials(directory/f'{name}_LOD{level}.glb',settings['alpha_cutoff'])
            obj.select_set(False)
    finally:
        for obj in temporary:
            mesh=obj.data
            bpy.data.objects.remove(obj,do_unlink=True)
            if mesh.users==0: bpy.data.meshes.remove(mesh)
        for obj in context.selected_objects: obj.select_set(False)
        for obj in selected: obj.select_set(True)
        context.view_layer.objects.active=active
        context.view_layer.update()
    shutil.copyfile(ROOT/'assets'/'foliage_atlas.png',directory/'foliage_atlas.png')
    shutil.copyfile(ROOT/'assets'/'bark_atlas.png',directory/'bark_atlas.png')
    metadata={'generator':'Flora Forge 1.2.0','settings':export_settings.__dict__,'triangles':list(root['flora_triangles']),'lod_distances_m':[18,40,90],'wind_channel':'TEXCOORD_1.x','units':'meters','axis':'glTF Y-up'}
    (directory/'flora.json').write_text(json.dumps(metadata,indent=2,ensure_ascii=False),encoding='utf-8')
    if godot:
        for file in ['foliage.gdshader','bark.gdshader','vegetation.gd']: shutil.copyfile(ROOT/'godot'/file,directory/file)
        # Relative resource paths make the whole directory movable within res://.
        material='\n'.join(['[gd_resource type="ShaderMaterial" load_steps=3 format=3]', '', '[ext_resource type="Shader" path="foliage.gdshader" id="1"]', '[ext_resource type="Texture2D" path="foliage_atlas.png" id="2"]','','[resource]','resource_name = "Flora_Foliage"','shader = ExtResource("1")','shader_parameter/foliage_atlas = ExtResource("2")',f'shader_parameter/alpha_cutoff = {settings["alpha_cutoff"]}',f'shader_parameter/wind_strength = {settings["wind_strength"]}',f'shader_parameter/wind_speed = {settings["wind_speed"]}','shader_parameter/cel_shading = '+('true' if settings['shading']=='CEL' else 'false'),''])
        def srgb(c): return 12.92*c if c<=0.0031308 else 1.055*c**(1/2.4)-0.055
        shadow=tuple(srgb(c) for c in export_settings.shadow_color)
        direction=unit(export_settings.light_direction)
        material+=f'shader_parameter/shadow_tint = Color({shadow[0]}, {shadow[1]}, {shadow[2]}, 1)\n'
        material+=f'shader_parameter/light_direction = Vector3({direction[0]}, {direction[2]}, {-direction[1]})\n'
        (directory/'foliage.tres').write_text(material,encoding='utf-8')
        bark='\n'.join(['[gd_resource type="ShaderMaterial" load_steps=3 format=3]','','[ext_resource type="Shader" path="bark.gdshader" id="1"]','[ext_resource type="Texture2D" path="bark_atlas.png" id="2"]','','[resource]','resource_name = "Flora_Bark"','shader = ExtResource("1")','shader_parameter/bark_atlas = ExtResource("2")','shader_parameter/textured_bark = '+('false' if export_settings.bark_style=='PLAIN' else 'true'),f'shader_parameter/light_direction = Vector3({direction[0]}, {direction[2]}, {-direction[1]})',''])
        (directory/'bark.tres').write_text(bark,encoding='utf8')
        lines=['[gd_scene load_steps=7 format=3]','','[ext_resource type="Script" path="vegetation.gd" id="1"]','[ext_resource type="Material" path="foliage.tres" id="2"]','[ext_resource type="Material" path="bark.tres" id="6"]']
        for i in range(3): lines.append(f'[ext_resource type="PackedScene" path="{name}_LOD{i}.glb" id="{i+3}"]')
        lines.extend(['',f'[node name="{name}" type="Node3D"]','script = ExtResource("1")','foliage_material = ExtResource("2")','bark_material = ExtResource("6")','lod_distances = Vector3(18, 40, 90)'])
        for i in range(3): lines.extend(['',f'[node name="LOD{i}" parent="." instance=ExtResource("{i+3}")]'])
        (directory/f'{name}.tscn').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    (directory/'LEEME.txt').write_text('Copia esta carpeta completa dentro de res:// en Godot 4. Espera a que importe los GLB y abre el archivo .tscn.\nEl script asigna shaders nativos al follaje y a la corteza en el editor y al ejecutar. Conserva las texturas de corteza de abedul, surcos, plateada y palmera.\nLos GLB también se pueden utilizar solos: mantienen textura, recorte alfa, normales y color, sin viento ni sombreado pintado.\nLOD: 0-18 m, 18-40 m, 40-90 m. Edita lod_distances en el nodo raíz para cambiar distancias; a partir de 90 m se oculta.\nNo incluye colisiones. Los colores están almacenados en los vértices. UV2.x contiene el peso de viento.\n',encoding='utf-8')
    return directory
