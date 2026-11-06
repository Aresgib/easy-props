"""Deterministic, dependency-free vegetation geometry. Coordinates are Blender Z-up."""
from dataclasses import dataclass, field
import math
import random

TAU = math.tau

PRESETS = {
    'OAK': ('Roble', dict(height=6.0, width=4.8, shape='ROUND', clusters=9, cards=620, leaf_style='OAK')),
    'MAPLE': ('Arce', dict(height=5.0, width=4.4, shape='ROUND', clusters=8, cards=560, leaf_style='MAPLE')),
    'BIRCH': ('Abedul · verde', dict(height=7.5, width=3.4, shape='LAYERED', clusters=8, cards=620, leaf_style='OVAL', trunk_radius=0.12, bend=0.10, crown_start=0.46, clump_scale=1.05, bark_style='BIRCH', bark_color=(0.82, 0.86, 0.80))),
    'PINE': ('Pino', dict(height=7.0, width=3.7, shape='CONE', clusters=8, cards=520, leaf_style='NEEDLE', leaf_color=(0.15, 0.38, 0.14))),
    'WILLOW': ('Sauce', dict(height=6.0, width=5.5, shape='WEEP', clusters=12, cards=720, leaf_style='NARROW')),
    'ACACIA': ('Acacia', dict(height=5.5, width=6.0, shape='UMBRELLA', clusters=9, cards=560, leaf_style='OVAL')),
    'PALM': ('Palmera', dict(height=7.0, width=5.6, shape='PALM', clusters=12, cards=240, leaf_style='PALM', trunk_radius=0.18, bark_style='PALM')),
    'BUSH': ('Arbusto', dict(height=1.6, width=2.1, shape='BUSH', clusters=6, cards=320, leaf_style='OVAL', trunk_radius=0.045)),
    'FLOWERS': ('Margaritas', dict(height=0.65, width=0.9, shape='FLOWER', clusters=14, cards=70, leaf_style='NARROW', trunk_radius=0.012, flower_count=14, flower_style='DAISY')),
    'ROSES': ('Rosal', dict(height=1.35, width=1.6, shape='BUSH', clusters=6, cards=260, leaf_style='OVAL', trunk_radius=0.025, flower_count=18, flower_style='ROSE', flower_color=(0.85, 0.045, 0.17))),
    'BIRCH_GOLD': ('Abedul · dorado', dict(height=8.2, width=3.8, shape='LAYERED', clusters=7, cards=650, leaf_style='OVAL', trunk_radius=0.12, bend=0.12, crown_start=0.44, clump_scale=1.05, asymmetry=0.18, bark_style='BIRCH', bark_color=(0.87, 0.86, 0.80), leaf_color=(1.0, 0.72, 0.12), shadow_color=(0.43, 0.055, 0.13))),
    'BIRCH_GROVE': ('Abedul · varios troncos', dict(height=7.0, width=4.8, shape='LAYERED', clusters=12, cards=780, leaf_style='OVAL', trunk_radius=0.095, trunk_count=3, trunk_spread=0.20, bend=0.12, crown_start=0.46, clump_scale=0.90, bark_style='BIRCH', bark_color=(0.82, 0.86, 0.80))),
    'BIRCH_WEEP': ('Abedul · colgante', dict(height=7.4, width=4.3, shape='WEEP', clusters=9, cards=680, leaf_style='NARROW', trunk_radius=0.12, crown_start=0.48, clump_scale=0.80, bark_style='BIRCH', bark_color=(0.82, 0.86, 0.80), leaf_color=(0.56, 0.70, 0.12))),
    'POPLAR': ('Álamo', dict(height=9.0, width=2.5, shape='COLUMN', clusters=8, cards=540, leaf_style='OVAL', trunk_radius=0.14, clump_scale=0.78, crown_start=0.25, bark_style='SILVER', bark_color=(0.56, 0.59, 0.45))),
    'CHERRY': ('Cerezo · floración', dict(height=4.8, width=5.5, shape='VASE', clusters=9, cards=680, leaf_style='OVAL', crown_start=0.47, bark_style='RIDGED', leaf_color=(0.96, 0.49, 0.66), shadow_color=(0.35, 0.075, 0.27))),
    'OLIVE': ('Olivo', dict(height=4.5, width=5.2, shape='IRREGULAR', clusters=9, cards=500, leaf_style='NARROW', bend=0.35, asymmetry=0.32, clump_scale=0.82, trunk_radius=0.28, bark_style='RIDGED', leaf_color=(0.35, 0.50, 0.22), shadow_color=(0.055, 0.19, 0.19))),
    'BAOBAB': ('Baobab', dict(height=7.0, width=6.2, shape='UMBRELLA', clusters=7, cards=550, leaf_style='OVAL', trunk_radius=0.85, branch_start=0.62, branch_thickness=0.30, bend=0.06, clump_scale=0.78, bark_style='RIDGED', bark_color=(0.31, 0.21, 0.13))),
    'CYPRESS': ('Ciprés', dict(height=7.0, width=1.8, shape='CONE', clusters=10, cards=600, leaf_style='NEEDLE', trunk_radius=0.13, crown_start=0.14, clump_scale=0.82, leaf_color=(0.15, 0.37, 0.12))),
    'SPRUCE': ('Abeto · por pisos', dict(height=7.2, width=4.4, shape='CONE', clusters=7, cards=590, leaf_style='NEEDLE', crown_start=0.20, clump_flatten=0.55, bark_style='RIDGED', leaf_color=(0.16, 0.46, 0.28), shadow_color=(0.018, 0.12, 0.20))),
    'TOPIARY': ('Arbusto · topiario', dict(height=1.8, width=2.0, shape='BUSH', clusters=3, cards=300, leaf_style='OVAL', trunk_radius=0.05, asymmetry=0.0, normal_mode='CROWN', leaf_color=(0.34, 0.66, 0.16))),
}
LEAF_TILES = {'OVAL': 0, 'OAK': 1, 'MAPLE': 2, 'NARROW': 3, 'NEEDLE': 4, 'PALM': 5, 'DAISY': 6, 'ROSE': 7}
SHAPES = [('ROUND', 'Redonda'), ('SPREAD', 'Extendida'), ('COLUMN', 'Columnar'), ('LAYERED', 'Por pisos / abierta'), ('IRREGULAR', 'Irregular'), ('VASE', 'En abanico'), ('CONE', 'Cónica'), ('UMBRELLA', 'Sombrilla'), ('WEEP', 'Colgante'), ('PALM', 'Palmera'), ('BUSH', 'Arbusto'), ('FLOWER', 'Flores')]
BARK_TILES = {'BIRCH': 0, 'RIDGED': 1, 'SILVER': 2, 'PALM': 3}


@dataclass
class Settings:
    species: str = 'OAK'
    seed: int = 7
    height: float = 6.0
    width: float = 4.8
    shape: str = 'ROUND'
    clusters: int = 9
    cards: int = 620
    trunk_radius: float = 0.22
    bend: float = 0.18
    branch_start: float = 0.27
    branch_thickness: float = 0.65
    trunk_count: int = 1
    trunk_spread: float = 0.22
    crown_start: float = 0.48
    clump_scale: float = 1.0
    clump_flatten: float = 1.0
    asymmetry: float = 0.08
    card_size: float = 1.0
    normal_strength: float = 1.0
    normal_up: float = 0.22
    normal_mode: str = 'CLUMP'
    variation: float = 0.08
    light_direction: tuple = (-0.45, -0.35, 0.82)
    leaf_style: str = 'OAK'
    leaf_color: tuple = (0.34, 0.62, 0.10)
    shadow_color: tuple = (0.035, 0.23, 0.19)
    bark_color: tuple = (0.20, 0.085, 0.035)
    bark_style: str = 'PLAIN'
    flower_color: tuple = (0.92, 0.62, 0.22)
    flower_count: int = 0
    flower_style: str = 'DAISY'
    quality: str = 'BALANCED'
    alpha_cutoff: float = 0.45
    wind_strength: float = 0.12
    wind_speed: float = 1.6
    shading: str = 'FLUFFY'


def preset_settings(species, **overrides):
    values = dict(PRESETS[species][1], species=species)
    values.update(overrides)
    return Settings(**values)


def add(a, b): return tuple(x + y for x, y in zip(a, b))
def sub(a, b): return tuple(x - y for x, y in zip(a, b))
def mul(a, b): return tuple(x * b for x in a)
def dot(a, b): return sum(x * y for x, y in zip(a, b))
def cross(a, b): return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
def unit(a):
    length = math.sqrt(dot(a, a))
    return mul(a, 1 / length) if length > 1e-9 else (0, 0, 1)
def mix(a, b, t): return add(mul(a, 1-t), mul(b, t))


@dataclass
class MeshData:
    vertices: list = field(default_factory=list)
    faces: list = field(default_factory=list)
    uvs: list = field(default_factory=list)
    normals: list = field(default_factory=list)
    colors: list = field(default_factory=list)
    materials: list = field(default_factory=list)

    @property
    def triangles(self): return sum(len(f)-2 for f in self.faces)

    def face(self, points, uv, normals, colors, material):
        start = len(self.vertices)
        self.vertices.extend(points)
        self.faces.append(tuple(range(start, start + len(points))))
        self.uvs.extend(uv)
        self.normals.extend(normals)
        self.colors.extend(colors)
        self.materials.append(material)


def tile_uv(tile):
    # 4x2 atlas, 5 pixel gutters in 256px cells; PNG rows run from top.
    x, row = tile % 4, tile // 4
    pad = 5 / 256
    return [((x+u)/4, (2-row+v)/2) for u, v in [(pad, -1+pad), (1-pad, -1+pad), (1-pad, -pad), (pad, -pad)]]


def tube(data, path, radii, sides, color, bark_style='PLAIN'):
    def uv(u, v):
        if bark_style not in BARK_TILES: return (u, v)
        tile = BARK_TILES[bark_style]
        pad = 2/256
        return ((tile%2+pad+u*(1-2*pad))/2, (1-tile//2+pad+v*(1-2*pad))/2)
    rings = []
    for i, p in enumerate(path):
        tangent = unit(sub(path[min(i+1, len(path)-1)], path[max(0, i-1)]))
        u = unit(cross(tangent, (0, 1, 0)))
        v = unit(cross(tangent, u))
        rings.append([(add(p, mul(add(mul(u, math.cos(j*TAU/sides)), mul(v, math.sin(j*TAU/sides))), radii[i])), unit(add(mul(u, math.cos(j*TAU/sides)), mul(v, math.sin(j*TAU/sides))))) for j in range(sides)])
    for i in range(len(path)-1):
        for j in range(sides):
            k = (j+1) % sides
            entries = [rings[i][j], rings[i][k], rings[i+1][k], rings[i+1][j]]
            colors = [tuple(c*(0.78+0.22*max(0, n[2])) for c in color)+(1.0,) for _, n in entries]
            data.face([p for p,n in entries], [uv(j/sides,i/(len(path)-1)), uv((j+1)/sides,i/(len(path)-1)), uv((j+1)/sides,(i+1)/(len(path)-1)), uv(j/sides,(i+1)/(len(path)-1))], [n for p,n in entries], colors, 0)
    for i, sign in [(0, -1), (-1, 1)]:
        points = [e[0] for e in rings[i]]
        if sign < 0: points.reverse()
        n = mul(unit(sub(path[-1],path[0])), sign)
        data.face(points, [uv(0.5,0.5)]*sides, [n]*sides, [color+(1.0,)]*sides, 0)


def card(data, center, u, v, w, h, volume_center, radii, settings, tile, tint, wind):
    points = [add(center, add(mul(u, sx*w/2), mul(v, sy*h/2))) for sx,sy in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    flat = unit(cross(u, v))
    normals = []
    for p in points:
        if settings.normal_mode == 'CROWN' and tile < 5:
            volume_center = (0,0,settings.height*(0.5+settings.crown_start*0.5))
            radii = (settings.width*0.55,settings.width*0.55,settings.height*max(0.12,(1-settings.crown_start)*0.6))
        relative = sub(p, volume_center)
        smooth = unit(tuple(relative[i]/max(0.01, radii[i]**2) for i in range(3)))
        smooth = unit(add(smooth, (0,0,settings.normal_up)))
        if settings.normal_mode == 'UP' and tile < 5: smooth = unit(mix(smooth,(0,0,1),0.80))
        # Backfacing cards share the same volume normals: no duplicated geometry.
        normals.append(unit(mix(flat, smooth, settings.normal_strength)))
    data.face(points, tile_uv(tile), normals, [tint+(wind,)]*4, 1)


def generate(settings, lod=0):
    s = settings
    rng = random.Random(s.seed)
    data = MeshData()
    h, w = s.height, s.width
    density = {'LOW': 0.55, 'BALANCED': 1.0, 'HIGH': 1.65}[s.quality]
    stride = (1, 2, 5)[lod]
    sides = max(3, {'LOW': 5, 'BALANCED': 7, 'HIGH': 9}[s.quality]-lod*2)
    segments = max(3, 9-lod*2)
    bend_angle = rng.uniform(0, TAU)
    stem_count = 1 if s.shape in ('PALM','FLOWER') else s.trunk_count
    def trunk(t, stem=0):
        drift = s.bend*h*(t*t*0.42 + math.sin(t*4.5)*0.14)
        angle = bend_angle + stem*TAU/max(1,stem_count-1)
        spread = w*s.trunk_spread*(0.16+0.84*t)*min(1,stem)
        return (math.cos(bend_angle)*drift+math.cos(angle)*spread, math.sin(bend_angle)*drift+math.sin(angle)*spread, t*h)
    trunk_top = 0.91 if s.shape == 'PALM' else 0.85
    if s.shape == 'BUSH': trunk_top = 0.5
    if s.shape != 'FLOWER':
        for stem in range(stem_count):
            top = trunk_top*(1-0.035*stem)
            path = [trunk(i/segments*top,stem) for i in range(segments+1)]
            radii = [s.trunk_radius*(1-0.88*i/segments)*(1+0.3*(i==0)) for i in range(segments+1)]
            tube(data, path, radii, sides, s.bark_color, s.bark_style)

    clumps = []
    if s.shape == 'PALM':
        origin = trunk(trunk_top)
        for j in range(s.clusters):
            angle = j*TAU/s.clusters + rng.uniform(-0.12,0.12)
            length = w*0.5*rng.uniform(0.82,1.08)
            direction = (math.cos(angle),math.sin(angle),0)
            lateral = (-math.sin(angle),math.cos(angle),0)
            steps = max(3, 8-lod*2)
            path = [add(origin, add(mul(direction,length*t), (0,0,h*(0.12*math.sin(t*math.pi)-0.14*t*t)))) for t in [i/steps for i in range(steps+1)]]
            tube(data, path, [s.trunk_radius*0.18*(1-i/(steps+1)) for i in range(steps+1)], 3, s.bark_color, s.bark_style)
            for i in range(steps):
                a, b = path[i], path[i+1]
                # Continuous UVs along the entire frond; no repeated square cards.
                wid = length*0.48
                points = [add(a,mul(lateral,-wid/2)),add(b,mul(lateral,-wid/2)),add(b,mul(lateral,wid/2)),add(a,mul(lateral,wid/2))]
                n = unit(add((0,0,1),mul(direction,0.3)))
                uv=tile_uv(5); x0,y0=uv[0]; x1,y1=uv[2]
                u0=x0+(x1-x0)*i/steps; u1=x0+(x1-x0)*(i+1)/steps
                data.face(points,[(u0,y0),(u1,y0),(u1,y1),(u0,y1)],[n]*4,[s.leaf_color+(0.35+0.65*(i+1)/steps,)]*4,1)
    elif s.shape != 'FLOWER':
        count = s.clusters
        for j in range(count):
            angle = j*2.399963 + rng.uniform(-0.25,0.25)
            f = j/max(1,count-1)
            stem = j % stem_count
            if s.shape == 'CONE':
                z = h*(s.crown_start+(0.97-s.crown_start)*f)
                radius = w*0.5*(1-0.80*f)
                center = trunk(z/h,stem)
                radii = (radius,radius,h*0.12)
            elif s.shape == 'BUSH':
                radius = w*0.26
                center = (math.cos(angle)*radius,math.sin(angle)*radius,h*(0.48+0.26*rng.random()))
                radii = (w*0.29,w*0.29,h*0.38)
            else:
                # Structured lobes: a high central crown, middle forks, and lower tufts.
                radius = w*(0.23+0.06*rng.random())
                z = h*(s.crown_start+(1-s.crown_start)*(0.15+0.64*(1-f))+rng.uniform(-0.025,0.025))
                radii = (w*0.22,w*0.22,h*0.185)
                if j==0: radius=w*0.035; z=h*0.91
                if s.shape == 'COLUMN': radius*=0.7; radii=(w*0.31,w*0.31,h*0.28)
                if s.shape == 'UMBRELLA': z=h*(0.79+0.06*rng.random()); radii=(w*0.34,w*0.34,h*0.13)
                if s.shape == 'SPREAD': radii=(w*0.37,w*0.30,h*0.18)
                if s.shape == 'WEEP': z=h*(0.64+0.19*rng.random()); radii=(w*0.23,w*0.23,h*0.31)
                if s.shape == 'LAYERED':
                    z=h*(s.crown_start+(1-s.crown_start)*(0.15+0.78*(1-f)))
                    radius=w*(0.06 if j==0 else 0.24+0.08*rng.random())
                    radii=(w*0.23,w*0.21,h*0.105)
                if s.shape == 'VASE':
                    z=h*(s.crown_start+(1-s.crown_start)*(0.54+0.34*rng.random()))
                    radius=w*(0.19+0.18*f); radii=(w*0.23,w*0.23,h*0.16)
                if s.shape == 'IRREGULAR':
                    z=h*(s.crown_start+(1-s.crown_start)*rng.uniform(0.20,0.85))
                    radius=w*rng.uniform(0.08,0.36); radii=(w*0.26,w*0.22,h*0.17)
                center = add(trunk(z/h,stem), (math.cos(angle)*radius,math.sin(angle)*radius,0))
            # Coherent lobe variation, separate from random placement of individual cards.
            stretch = 1+rng.uniform(-s.asymmetry,s.asymmetry)
            radii = tuple(r*s.clump_scale*stretch*(s.clump_flatten if k==2 else 1) for k,r in enumerate(radii))
            center = add(center,(rng.uniform(-1,1)*w*s.asymmetry*0.18,rng.uniform(-1,1)*w*s.asymmetry*0.18,rng.uniform(-1,1)*h*s.asymmetry*0.08))
            clumps.append((center,radii))
            start = trunk(max(0.1,min(center[2]/h*0.82,s.branch_start+f*0.20)),stem) if s.shape != 'BUSH' else trunk(0.12+0.22*f,stem)
            endpoint = center
            tube(data,[start,add(mix(start,endpoint,0.55),(0,0,h*0.055)),endpoint],[s.trunk_radius*s.branch_thickness,s.trunk_radius*s.branch_thickness*0.54,min(0.008*h,s.trunk_radius*s.branch_thickness*0.30)], max(3,sides-2), s.bark_color, s.bark_style)

        number = max(12,int(s.cards*density))
        for i in range(number):
            center, radii = clumps[i % len(clumps)]
            z = rng.uniform(-1,1)
            a = rng.uniform(0,TAU)
            n = (math.sqrt(1-z*z)*math.cos(a), math.sqrt(1-z*z)*math.sin(a), z)
            shell = rng.uniform(0.48,1.0)**0.5
            p = add(center,tuple(n[k]*radii[k]*shell for k in range(3)))
            # Tilt the geometry independently of the volume normals. Tangent-only
            # cards become edge-on at the silhouette and look like thin hairs.
            normal = unit(add(n,(rng.uniform(-0.65,0.65),rng.uniform(-0.65,0.65),rng.uniform(-0.65,0.65))))
            u = unit(cross(normal,(0,0,1)))
            v = unit(cross(normal,u))
            rotation = rng.uniform(0,TAU)
            u,v = add(mul(u,math.cos(rotation)),mul(v,math.sin(rotation))), add(mul(v,math.cos(rotation)),mul(u,-math.sin(rotation)))
            size = min(radii)*0.85*s.card_size*rng.uniform(0.9,1.1)
            if s.shape == 'CONE': size = radii[0]*0.76*s.card_size
            # Base tint only. The normal-driven shader creates the continuous gradient.
            tint = mul(s.leaf_color,1+rng.uniform(-s.variation,s.variation)*0.18)
            tint = tuple(min(1.0,c) for c in tint)
            if i % stride == 0:
                growth = (1,1.16,1.40)[lod]
                card(data,p,u,v,size*growth,size*growth,center,radii,s,LEAF_TILES[s.leaf_style],tint,max(0.05,min(1,p[2]/h)))

    if s.flower_count > 0 or s.shape == 'FLOWER':
        count = max(s.flower_count, s.clusters if s.shape=='FLOWER' else 0)
        for i in range(count):
            angle = rng.uniform(0,TAU)
            r = math.sqrt(rng.random())*w*0.43
            p = (math.cos(angle)*r,math.sin(angle)*r,h*rng.uniform(0.60,1.0))
            if s.shape!='FLOWER' and clumps:
                c,rs=clumps[i%len(clumps)]
                p=add(c,(math.cos(angle)*rs[0]*0.75,math.sin(angle)*rs[1]*0.75,rs[2]*0.50))
            if i%max(1,lod+1): continue
            stem_base = (p[0]*0.75,p[1]*0.75,0) if s.shape=='FLOWER' else (p[0]*0.9,p[1]*0.9,p[2]*0.5)
            tube(data,[stem_base,mix(stem_base,p,0.5),p],[s.trunk_radius,s.trunk_radius*0.7,s.trunk_radius*0.4],3,(0.08,0.23,0.035))
            size = h*(0.29 if s.shape=='FLOWER' else 0.24)*s.card_size
            # Tilted intersecting flower cards remain visible from ground and overhead.
            card(data,p,(1,0,0),(0,0.85,0.53),size,size,sub(p,(0,0,size)),(size,)*3,s,LEAF_TILES[s.flower_style],s.flower_color,1.0)
            card(data,p,(0,1,0),(0.85,0,0.53),size,size,sub(p,(0,0,size)),(size,)*3,s,LEAF_TILES[s.flower_style],s.flower_color,1.0)
            if s.shape=='FLOWER':
                for j in range(3):
                    leaf_p=mix(stem_base,p,0.23+j*0.19)
                    card(data,leaf_p,(math.cos(angle+j*2),math.sin(angle+j*2),0),(0,0,1),size*0.7,size*0.55,sub(leaf_p,(0,0,0.1)),(size,)*3,s,3,s.leaf_color,0.5)
    return data
