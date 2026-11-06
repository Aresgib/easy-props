"""Blender data creation. All exported geometry is real mesh data."""
from pathlib import Path
import json
import hashlib
import bpy
from .core import Settings, generate, unit

ROOT = Path(__file__).parent


def snapshot(properties):
    return Settings(**{key: tuple(getattr(properties,key)) if isinstance(field.default,tuple) else getattr(properties,key) for key,field in Settings.__dataclass_fields__.items()})


def atlas_image():
    image = bpy.data.images.get('FF_FoliageAtlas_11')
    if not image:
        image = bpy.data.images.load(str(ROOT/'assets'/'foliage_atlas.png'),check_existing=True)
        image.name = 'FF_FoliageAtlas_11'
    if not image.packed_file: image.pack()
    return image


def bark_image():
    image=bpy.data.images.get('FF_BarkAtlas_12')
    if not image:
        image=bpy.data.images.load(str(ROOT/'assets'/'bark_atlas.png'),check_existing=True)
        image.name='FF_BarkAtlas_12'
    if not image.packed_file: image.pack()
    return image


def material(leaf=False, cutoff=0.45, settings=None, portable=False):
    settings=settings or Settings(alpha_cutoff=cutoff)
    signature=hashlib.sha1(json.dumps((tuple(settings.shadow_color),tuple(settings.light_direction),settings.shading,cutoff)).encode()).hexdigest()[:10]
    name = ('FF_Leaves_11_PBR_' if portable else 'FF_Leaves_11_')+signature if leaf else 'FF_Bark_12_'+settings.bark_style
    mat = bpy.data.materials.get(name)
    if mat: return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (0.32,0.58,0.13,1) if leaf else (0.2,0.1,0.04,1)
    nodes,links = mat.node_tree.nodes,mat.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = 1
    if 'Specular IOR Level' in bsdf.inputs: bsdf.inputs['Specular IOR Level'].default_value=0
    color = nodes.new('ShaderNodeVertexColor'); color.layer_name='Color'; color.location=(-600,160)
    if leaf:
        tex=nodes.new('ShaderNodeTexImage'); tex.image=atlas_image(); tex.location=(-600,-100)
        tex.extension='CLIP'
        uv=nodes.new('ShaderNodeUVMap'); uv.uv_map='UVMap'; uv.location=(-1100,-280)
        links.new(uv.outputs['UV'],tex.inputs['Vector'])
        blend=nodes.new('ShaderNodeMix'); blend.data_type='RGBA'; blend.blend_type='MULTIPLY'; blend.inputs[0].default_value=1; blend.location=(-300,180)
        links.new(color.outputs['Color'],blend.inputs[6]); links.new(tex.outputs['Color'],blend.inputs[7])
        links.new(blend.outputs[2],bsdf.inputs['Base Color'])
        clip=nodes.new('ShaderNodeMath'); clip.operation='GREATER_THAN'; clip.inputs[1].default_value=cutoff; clip.location=(-260,-100)
        links.new(tex.outputs['Alpha'],clip.inputs[0]); links.new(clip.outputs[0],bsdf.inputs['Alpha'])
        mat.use_backface_culling=False
        if hasattr(mat,'surface_render_method'): mat.surface_render_method='DITHERED'
        if hasattr(mat,'blend_method'): mat.blend_method='CLIP'; mat.alpha_threshold=cutoff
        mat['flora_cutoff']=cutoff
        if not portable:
            geom=nodes.new('ShaderNodeNewGeometry'); geom.location=(-1500,700)
            sign=nodes.new('ShaderNodeMath'); sign.operation='MULTIPLY_ADD'
            sign.inputs[1].default_value=-2; sign.inputs[2].default_value=1
            links.new(geom.outputs['Backfacing'],sign.inputs[0])
            normal=nodes.new('ShaderNodeVectorMath'); normal.operation='SCALE'
            links.new(geom.outputs['Normal'],normal.inputs[0]); links.new(sign.outputs[0],normal.inputs[3])
            norm=nodes.new('ShaderNodeVectorMath'); norm.operation='NORMALIZE'; links.new(normal.outputs[0],norm.inputs[0])
            dot=nodes.new('ShaderNodeVectorMath'); dot.operation='DOT_PRODUCT'
            dot.inputs[1].default_value=unit(settings.light_direction); links.new(norm.outputs[0],dot.inputs[0])
            gradient=nodes.new('ShaderNodeMapRange'); gradient.interpolation_type='SMOOTHSTEP'
            gradient.inputs['From Min'].default_value=-0.6; gradient.inputs['From Max'].default_value=0.8
            links.new(dot.outputs['Value'],gradient.inputs['Value'])
            factor=gradient.outputs['Result']
            if settings.shading=='CEL':
                steps=nodes.new('ShaderNodeValToRGB'); steps.color_ramp.interpolation='CONSTANT'
                ramp=steps.color_ramp; ramp.elements.remove(ramp.elements[1])
                ramp.elements[0].color=(0.15,0.15,0.15,1)
                ramp.elements.new(0.45).color=(0.55,0.55,0.55,1)
                ramp.elements.new(0.72).color=(1,1,1,1)
                links.new(factor,steps.inputs[0]); factor=steps.outputs['Color']
            # Atlas tiles 6/7 are petals; their shadow tint comes from the petal color.
            separate=nodes.new('ShaderNodeSeparateXYZ'); links.new(uv.outputs[0],separate.inputs[0])
            x=nodes.new('ShaderNodeMath'); x.operation='GREATER_THAN'; x.inputs[1].default_value=0.5
            y=nodes.new('ShaderNodeMath'); y.operation='LESS_THAN'; y.inputs[1].default_value=0.5
            links.new(separate.outputs['X'],x.inputs[0]); links.new(separate.outputs['Y'],y.inputs[0])
            petals=nodes.new('ShaderNodeMath'); petals.operation='MULTIPLY'; links.new(x.outputs[0],petals.inputs[0]); links.new(y.outputs[0],petals.inputs[1])
            petal_shadow=nodes.new('ShaderNodeMixRGB'); petal_shadow.blend_type='MULTIPLY'; petal_shadow.inputs[0].default_value=1
            petal_shadow.inputs[2].default_value=(0.45,0.45,0.45,1); links.new(color.outputs['Color'],petal_shadow.inputs[1])
            shadow=nodes.new('ShaderNodeMixRGB'); shadow.inputs[1].default_value=tuple(settings.shadow_color)+(1,)
            links.new(petals.outputs[0],shadow.inputs[0]); links.new(petal_shadow.outputs[0],shadow.inputs[2])
            paint=nodes.new('ShaderNodeMixRGB'); links.new(factor,paint.inputs[0]); links.new(shadow.outputs[0],paint.inputs[1]); links.new(color.outputs['Color'],paint.inputs[2])
            links.new(paint.outputs[0],blend.inputs[6])
            emission=nodes.new('ShaderNodeEmission'); emission.inputs['Strength'].default_value=1
            links.new(blend.outputs[2],emission.inputs['Color'])
            transparent=nodes.new('ShaderNodeBsdfTransparent')
            cutout=nodes.new('ShaderNodeMixShader'); links.new(clip.outputs[0],cutout.inputs[0])
            links.new(transparent.outputs[0],cutout.inputs[1]); links.new(emission.outputs[0],cutout.inputs[2])
            links.new(cutout.outputs[0],nodes.get('Material Output').inputs['Surface'])
            mat['flora_stylized']=True
    else:
        if settings.bark_style!='PLAIN':
            tex=nodes.new('ShaderNodeTexImage'); tex.image=bark_image(); tex.extension='CLIP'
            uv=nodes.new('ShaderNodeUVMap'); uv.uv_map='UVMap'
            links.new(uv.outputs['UV'],tex.inputs['Vector'])
            paint=nodes.new('ShaderNodeMixRGB'); paint.blend_type='MULTIPLY'; paint.inputs[0].default_value=1
            links.new(color.outputs['Color'],paint.inputs[1]); links.new(tex.outputs['Color'],paint.inputs[2])
            links.new(paint.outputs[0],bsdf.inputs['Base Color'])
        else: links.new(color.outputs['Color'],bsdf.inputs['Base Color'])
    return mat


def build_mesh(name, data, settings):
    mesh=bpy.data.meshes.new(name)
    try:
        mesh.from_pydata(data.vertices,[],data.faces)
        mesh.update()
        mesh.materials.append(material(settings=settings))
        mesh.materials.append(material(True,settings.alpha_cutoff,settings))
        for polygon,index in zip(mesh.polygons,data.materials):
            polygon.material_index=index; polygon.use_smooth=True
        uv=mesh.uv_layers.new(name='UVMap')
        uv.data.foreach_set('uv',[x for pair in data.uvs for x in pair])
        wind=mesh.uv_layers.new(name='Wind')
        wind.data.foreach_set('uv',[x for color in data.colors for x in (color[3],0.0)])
        colors=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
        colors.data.foreach_set('color',[x for c in data.colors for x in (*c[:3],1.0)])
        mesh.color_attributes.active_color=colors
        mesh.normals_split_custom_set(data.normals)
        return mesh
    except Exception:
        bpy.data.meshes.remove(mesh)
        raise


def rebuild(context, properties, create=False):
    if context.mode!='OBJECT': raise ValueError('Cambia a Modo Objeto para generar vegetación.')
    settings=snapshot(properties)
    root=properties.target
    if create or not root or not root.get('flora_forge'):
        root=None
    pending=[]
    try:
        for level in range(3):
            data=generate(settings,level)
            mesh=build_mesh(f'FF_{settings.species}_LOD{level}',data,settings)
            pending.append((mesh,data.triangles))
    except Exception:
        for mesh,_ in pending: bpy.data.meshes.remove(mesh)
        raise
    if root is None:
        collection=bpy.data.collections.new('Flora Forge')
        context.scene.collection.children.link(collection)
        root=bpy.data.objects.new(f'Flora_{settings.species}_{settings.seed}',None)
        root.empty_display_type='PLAIN_AXES'; root.empty_display_size=0.4
        root.location=context.scene.cursor.location
        collection.objects.link(root)
        root['flora_forge']=True
    else:
        collection=root.users_collection[0]
    old=[o for o in root.children if o.get('flora_part')]
    for level,(mesh,triangles) in enumerate(pending):
        obj=bpy.data.objects.new(f'{root.name}_LOD{level}',mesh)
        collection.objects.link(obj); obj.parent=root
        obj['flora_part']=True; obj['flora_lod']=level; obj['triangles']=triangles
        obj.hide_render=level!=properties.preview_lod
        obj.hide_set(level!=properties.preview_lod)
    for obj in old:
        mesh=obj.data
        bpy.data.objects.remove(obj,do_unlink=True)
        if mesh.users==0: bpy.data.meshes.remove(mesh)
    root['flora_settings']=json.dumps(settings.__dict__)
    root['flora_triangles']=[item[1] for item in pending]
    properties.target=root
    properties.statistics=' / '.join(f'LOD{i}: {t:,}' for i,(_,t) in enumerate(pending))
    for obj in context.selected_objects: obj.select_set(False)
    root.select_set(True); context.view_layer.objects.active=root
    return root


def preview(properties, context):
    root=properties.target
    if root:
        for obj in root.children:
            if obj.get('flora_part'):
                hidden=obj['flora_lod']!=properties.preview_lod
                obj.hide_set(hidden); obj.hide_render=hidden
