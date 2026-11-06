"""Flora Forge: stylized game vegetation for Blender and Godot 4."""
import json
import bpy
from bpy.props import BoolProperty, EnumProperty, FloatProperty, FloatVectorProperty, IntProperty, PointerProperty, StringProperty
from .core import PRESETS, SHAPES, LEAF_TILES, Settings, preset_settings
from .generation import rebuild, preview, snapshot
from .export import export_bundle

bl_info = {'name':'Flora Forge','author':'Flora Forge','version':(1,2,0),'blender':(4,2,0),'location':'Vista 3D > Barra lateral > Flora Forge','description':'Vegetación estilizada para juegos y Godot','category':'Add Mesh'}


def apply_preset(self, context):
    values=preset_settings(self.species)
    for key,value in values.__dict__.items():
        if key not in ('species','seed','quality'): setattr(self,key,value)
    self.palette='CUSTOM'


def palette_update(self,context):
    palettes={
        'SUMMER':((0.34,0.62,0.10),(0.035,0.23,0.19)),
        'AUTUMN':((0.94,0.46,0.035),(0.30,0.10,0.04)),
        'PINK':((0.92,0.38,0.57),(0.30,0.08,0.28)),
        'TEAL':((0.19,0.72,0.43),(0.025,0.18,0.25)),
        'DRY':((0.72,0.65,0.19),(0.26,0.22,0.08)),
        'GOLD':((1.0,0.72,0.12),(0.43,0.055,0.13)),
        'EMBER':((0.98,0.22,0.07),(0.30,0.018,0.17)),
        'LAVENDER':((0.65,0.44,0.95),(0.12,0.09,0.35)),
    }
    if self.palette in palettes: self.leaf_color,self.shadow_color=palettes[self.palette]


class FF_Settings(bpy.types.PropertyGroup):
    species: EnumProperty(name='Especie',items=[(key,label,'Cargar parámetros de '+label) for key,(label,_) in PRESETS.items()],default='OAK',update=apply_preset)
    seed: IntProperty(name='Semilla',default=7,min=0,max=1000000)
    shape: EnumProperty(name='Forma de copa',items=[(key,label,'') for key,label in SHAPES],default='ROUND')
    height: FloatProperty(name='Altura',default=6,min=0.15,max=40,unit='LENGTH')
    width: FloatProperty(name='Anchura de copa',default=4.8,min=0.15,max=30,unit='LENGTH')
    clusters: IntProperty(name='Volúmenes / frondas',default=9,min=2,max=32)
    cards: IntProperty(name='Planos de follaje',default=620,min=20,max=3000,description='Cantidad base; se escala según calidad. En palmeras se utiliza la cantidad de frondas')
    trunk_radius: FloatProperty(name='Radio del tronco',default=0.22,min=0.003,max=2,unit='LENGTH')
    bend: FloatProperty(name='Curvatura del tronco',default=0.18,min=0,max=0.8)
    branch_start: FloatProperty(name='Inicio de ramas',default=0.27,min=0.1,max=0.8,subtype='FACTOR')
    branch_thickness: FloatProperty(name='Grosor de ramas',default=0.65,min=0.1,max=0.9,subtype='FACTOR')
    trunk_count: IntProperty(name='Número de troncos',default=1,min=1,max=5,description='Una sola malla por LOD; en palmeras y flores se usa un tronco')
    trunk_spread: FloatProperty(name='Separación de troncos',default=0.22,min=0.05,max=0.55,subtype='FACTOR')
    crown_start: FloatProperty(name='Inicio de la copa',default=0.48,min=0.1,max=0.8,subtype='FACTOR',description='Altura de la copa en las formas redonda, extendida, columnar, por pisos, irregular, abanico y cónica')
    clump_scale: FloatProperty(name='Tamaño de volúmenes',default=1,min=0.45,max=1.5,description='Reduce para abrir huecos entre masas de hojas')
    clump_flatten: FloatProperty(name='Altura de volúmenes',default=1,min=0.35,max=1.8,description='Menor valor: masas achatadas; mayor valor: masas verticales')
    asymmetry: FloatProperty(name='Asimetría de copa',default=0.08,min=0,max=0.6,subtype='FACTOR')
    card_size: FloatProperty(name='Tamaño de grupos de hojas',default=1,min=0.3,max=2.5)
    normal_strength: FloatProperty(name='Normales esponjosas',default=1,min=0,max=1,subtype='FACTOR',description='0: normales del plano; 1: normales del volumen de la copa')
    normal_up: FloatProperty(name='Orientación hacia arriba',default=0.22,min=0,max=1)
    normal_mode: EnumProperty(name='Origen de normales',items=[('CLUMP','Cada volumen','Cada grupo de hojas recibe su propio degradado'),('CROWN','Copa completa','Un degradado amplio une los grupos'),('UP','Hacia arriba','Aclara el follaje con normales orientadas hacia arriba')],default='CLUMP')
    variation: FloatProperty(name='Variación de color',default=0.08,min=0,max=0.5)
    light_direction: FloatVectorProperty(name='Dirección de luz artística',subtype='DIRECTION',size=3,default=(-0.45,-0.35,0.82),description='Dirección mundial hacia la zona clara; controla el degradado de normales en Blender y Godot')
    leaf_style: EnumProperty(name='Textura de hojas',items=[(key,{'OVAL':'Ovalada','OAK':'Roble lobulado','MAPLE':'Arce','NARROW':'Alargada','NEEDLE':'Agujas','PALM':'Fronda','DAISY':'Margarita','ROSE':'Rosa'}[key],'') for key in LEAF_TILES],default='OAK')
    palette: EnumProperty(name='Paleta',items=[('SUMMER','Verano',''),('AUTUMN','Otoño',''),('GOLD','Dorado / coral',''),('EMBER','Rojo / ciruela',''),('PINK','Rosa',''),('TEAL','Turquesa',''),('LAVENDER','Lavanda',''),('DRY','Seco',''),('CUSTOM','Personalizada','')],default='SUMMER',update=palette_update)
    leaf_color: FloatVectorProperty(name='Hojas · luz',subtype='COLOR',size=3,min=0,max=1,default=(0.34,0.62,0.10))
    shadow_color: FloatVectorProperty(name='Hojas · sombra',subtype='COLOR',size=3,min=0,max=1,default=(0.035,0.23,0.19))
    bark_color: FloatVectorProperty(name='Tronco',subtype='COLOR',size=3,min=0,max=1,default=(0.2,0.085,0.035))
    bark_style: EnumProperty(name='Corteza',items=[('PLAIN','Lisa',''),('BIRCH','Abedul · marcas oscuras',''),('RIDGED','Surcos',''),('SILVER','Plateada',''),('PALM','Anillos de palmera','')],default='PLAIN')
    flower_color: FloatVectorProperty(name='Flores',subtype='COLOR',size=3,min=0,max=1,default=(0.92,0.62,0.22))
    flower_count: IntProperty(name='Cantidad de flores',default=0,min=0,max=120)
    flower_style: EnumProperty(name='Tipo de flor',items=[('DAISY','Margarita',''),('ROSE','Rosa','')],default='DAISY')
    quality: EnumProperty(name='Presupuesto',items=[('LOW','Ligero','55 % de planos y troncos de 5 lados'),('BALANCED','Equilibrado','100 % de planos y troncos de 7 lados'),('HIGH','Detalle','165 % de planos y troncos de 9 lados')],default='BALANCED')
    alpha_cutoff: FloatProperty(name='Recorte alfa',default=0.45,min=0.05,max=0.95)
    shading: EnumProperty(name='Sombreado del follaje',items=[('FLUFFY','Suave / fluffy','Degradado continuo de color dirigido por las normales'),('CEL','Cel shading','Tres bandas de color')],default='FLUFFY')
    wind_strength: FloatProperty(name='Fuerza del viento',default=0.12,min=0,max=1,unit='LENGTH')
    wind_speed: FloatProperty(name='Velocidad del viento',default=1.6,min=0,max=5)
    preview_lod: IntProperty(name='Vista previa LOD',default=0,min=0,max=2,update=preview)
    godot_bundle: BoolProperty(name='Incluir escena y shader de Godot 4',default=True)
    target: PointerProperty(name='Planta activa',type=bpy.types.Object,poll=lambda self,obj: bool(obj.get('flora_forge')))
    statistics: StringProperty(name='Triángulos')
    last_error: StringProperty()


class FF_OT_Create(bpy.types.Operator):
    bl_idname='flora_forge.create'
    bl_label='Crear planta'
    bl_options={'REGISTER','UNDO'}
    def execute(self,context):
        p=context.scene.flora_forge
        try: rebuild(context,p,create=True); p.last_error=''
        except Exception as exc:
            p.last_error=str(exc); self.report({'ERROR'},str(exc)); return {'CANCELLED'}
        return {'FINISHED'}


class FF_OT_Update(bpy.types.Operator):
    bl_idname='flora_forge.update'
    bl_label='Aplicar cambios a la planta'
    bl_options={'REGISTER','UNDO'}
    @classmethod
    def poll(cls,context): return bool(context.scene.flora_forge.target)
    def execute(self,context):
        p=context.scene.flora_forge
        try: rebuild(context,p); p.last_error=''
        except Exception as exc:
            p.last_error=str(exc); self.report({'ERROR'},str(exc)); return {'CANCELLED'}
        return {'FINISHED'}


class FF_OT_Load(bpy.types.Operator):
    bl_idname='flora_forge.load'
    bl_label='Leer parámetros de la planta'
    bl_options={'REGISTER','UNDO'}
    def execute(self,context):
        p=context.scene.flora_forge
        obj=context.active_object
        if obj and obj.parent and obj.parent.get('flora_forge'): obj=obj.parent
        if not obj or not obj.get('flora_forge'): obj=p.target
        if not obj or not obj.get('flora_settings'): return {'CANCELLED'}
        values=Settings(**json.loads(obj['flora_settings'])).__dict__
        p.species=values['species']
        for key,value in values.items(): setattr(p,key,value)
        p.target=obj
        p.statistics=' / '.join(f'LOD{i}: {t:,}' for i,t in enumerate(obj['flora_triangles']))
        preview(p,context)
        return {'FINISHED'}


class FF_OT_Variant(bpy.types.Operator):
    bl_idname='flora_forge.variant'
    bl_label='Nueva variante'
    bl_options={'REGISTER','UNDO'}
    def execute(self,context):
        p=context.scene.flora_forge
        seed=p.seed
        p.seed=(seed+1)%1000001
        try: rebuild(context,p,create=True); p.last_error=''
        except Exception as exc:
            p.seed=seed; self.report({'ERROR'},str(exc)); return {'CANCELLED'}
        return {'FINISHED'}


class FF_OT_Export(bpy.types.Operator):
    bl_idname='flora_forge.export'
    bl_label='Exportar planta · Godot / GLB'
    directory: StringProperty(subtype='DIR_PATH')
    filter_folder: BoolProperty(default=True,options={'HIDDEN'})
    @classmethod
    def poll(cls,context): return bool(context.scene.flora_forge.target)
    def invoke(self,context,event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}
    def execute(self,context):
        if not self.directory:
            self.report({'ERROR'},'Elige una carpeta de destino.'); return {'CANCELLED'}
        p=context.scene.flora_forge
        try:
            output=export_bundle(context,p,bpy.path.abspath(self.directory),p.godot_bundle)
            p.last_error=''; self.report({'INFO'},'Exportado: '+str(output))
        except Exception as exc:
            p.last_error=str(exc); self.report({'ERROR'},str(exc)); return {'CANCELLED'}
        return {'FINISHED'}


class FF_PT_Main(bpy.types.Panel):
    bl_label='Flora Forge · vegetación para juegos'
    bl_idname='FF_PT_Main'
    bl_space_type='VIEW_3D'; bl_region_type='UI'; bl_category='Flora Forge'
    def draw(self,context):
        layout=self.layout; p=context.scene.flora_forge
        layout.prop(p,'species'); layout.prop(p,'seed')
        row=layout.row(align=True); row.operator('flora_forge.create',icon='OUTLINER_OB_MESH'); row.operator('flora_forge.variant',icon='FILE_REFRESH')
        layout.prop(p,'target')
        layout.operator('flora_forge.load',icon='IMPORT')
        layout.operator('flora_forge.update',icon='CHECKMARK')
        if p.target and p.target.get('flora_settings'):
            if p.target['flora_settings']!=json.dumps(snapshot(p).__dict__):
                layout.label(text='Hay cambios pendientes de aplicar',icon='INFO')
        if p.last_error:
            box=layout.box(); box.alert=True; box.label(text=p.last_error,icon='ERROR')


class FF_PT_Form(bpy.types.Panel):
    bl_label='01 · Forma, tronco y flores'
    bl_idname='FF_PT_Form'; bl_parent_id='FF_PT_Main'
    bl_space_type='VIEW_3D'; bl_region_type='UI'; bl_category='Flora Forge'
    def draw(self,context):
        l=self.layout; p=context.scene.flora_forge
        for key in ['shape','height','width','clusters','crown_start','clump_scale','clump_flatten','asymmetry','trunk_radius','bend','branch_start','branch_thickness']:
            l.prop(p,key)
        if p.shape not in ('PALM','FLOWER'):
            l.prop(p,'trunk_count')
            if p.trunk_count>1: l.prop(p,'trunk_spread')
        l.prop(p,'bark_style'); l.prop(p,'bark_color'); l.prop(p,'flower_count')
        if p.flower_count: l.prop(p,'flower_style'); l.prop(p,'flower_color')


class FF_PT_Foliage(bpy.types.Panel):
    bl_label='02 · Follaje y normales suaves'
    bl_idname='FF_PT_Foliage'; bl_parent_id='FF_PT_Main'
    bl_space_type='VIEW_3D'; bl_region_type='UI'; bl_category='Flora Forge'
    def draw(self,context):
        l=self.layout; p=context.scene.flora_forge
        for key in ['leaf_style','cards','card_size','normal_mode','normal_strength','normal_up','shading','light_direction','palette','leaf_color','shadow_color','variation','alpha_cutoff']: l.prop(p,key)
        l.label(text='Usa Vista previa de materiales',icon='MATERIAL')


class FF_PT_Game(bpy.types.Panel):
    bl_label='03 · Rendimiento y Godot'
    bl_idname='FF_PT_Game'; bl_parent_id='FF_PT_Main'
    bl_space_type='VIEW_3D'; bl_region_type='UI'; bl_category='Flora Forge'
    def draw(self,context):
        l=self.layout; p=context.scene.flora_forge
        l.prop(p,'quality'); l.prop(p,'preview_lod')
        root=p.target
        if root:
            for i,t in enumerate(root.get('flora_triangles',[])): l.label(text=f'LOD{i}: {t:,} triángulos')
        l.label(text='2 materiales · follaje y corteza')
        for key in ['wind_strength','wind_speed','godot_bundle']: l.prop(p,key)
        l.label(text='Viento animado: en Godot',icon='INFO')
        l.operator('flora_forge.export',icon='EXPORT')


CLASSES=(FF_Settings,FF_OT_Create,FF_OT_Update,FF_OT_Load,FF_OT_Variant,FF_OT_Export,FF_PT_Main,FF_PT_Form,FF_PT_Foliage,FF_PT_Game)
def register():
    for cls in CLASSES: bpy.utils.register_class(cls)
    bpy.types.Scene.flora_forge=PointerProperty(type=FF_Settings)
def unregister():
    del bpy.types.Scene.flora_forge
    for cls in reversed(CLASSES): bpy.utils.unregister_class(cls)
