import * as THREE from 'three'
import shader from '../../../engine-kits/godot/styled.gdshader?raw'
import setup from '../../../engine-kits/godot/styled-prop.gd?raw'
import type {NamedMesh} from './glb-exporter'
import type {ExportFile} from './pipeline/types'

interface Level {
    readonly file: string
    readonly meshes: Record<string, string[]>
    readonly begin: number
    readonly end: number
}

/** Captures each surface before GLB writing releases its material. */
export class GodotBundle {
    private readonly levels: Record<string, Level> = {}
    private readonly textures = new Map<THREE.Texture, string>()
    private readonly materials = new Map<string, {name: string; texture: string; style: number; cutoff: number; foliage: boolean}>()

    constructor(private readonly name: string, private readonly wind: boolean) {}

    addLevel(level: number, file: string, meshes: readonly NamedMesh[], last: boolean): void {
        const surfaces: Record<string, string[]> = {}
        for (const mesh of meshes) {
            surfaces[mesh.name] = [mesh.material].flat().map((base) => {
                const material = base as THREE.MeshStandardMaterial
                const appearance = material.userData.appearance
                if (!appearance || appearance === 'natural' || !material.map) return ''
                const texture = this.textures.get(material.map) ?? `${this.name}_colour_${this.textures.size}.png`
                this.textures.set(material.map, texture)
                const style = appearance === 'fluffy' ? 1 : appearance === 'cel' ? 2 : appearance === 'ink' ? 3 : 4
                const foliage = material.userData.foliage === true
                const key = JSON.stringify([texture, style, material.alphaTest, foliage])
                const existing = this.materials.get(key)
                if (existing) return existing.name
                const name = `${this.name}_material_${this.materials.size}.tres`
                this.materials.set(key, {name, texture, style, cutoff: material.alphaTest, foliage})
                return name
            })
        }
        this.levels[`LOD${level}`] = {file, meshes: surfaces, begin: [0, 18, 40][level] ?? 0, end: last ? 0 : [18, 40, 90][level] ?? 0}
    }

    async files(collisionFile?: string): Promise<ExportFile[]> {
        if (this.materials.size === 0) return []
        const files: ExportFile[] = []
        const add = (name: string, text: string) => files.push({name, bytes: new TextEncoder().encode(text)})
        const shaderName = `${this.name}_style.gdshader`
        const setupName = `${this.name}_setup.gd`
        const manifestName = `${this.name}.godot.json`
        add(shaderName, shader)
        add(setupName, setup)
        add(manifestName, `${JSON.stringify({levels: this.levels}, null, 4)}\n`)

        for (const {name, texture, style, cutoff, foliage} of this.materials.values()) {
            add(name, `[gd_resource type="ShaderMaterial" load_steps=3 format=3]\n\n[ext_resource type="Shader" path="${shaderName}" id="1"]\n[ext_resource type="Texture2D" path="${texture}" id="2"]\n\n[resource]\nshader = ExtResource("1")\nshader_parameter/surface_texture = ExtResource("2")\nshader_parameter/appearance = ${style}\nshader_parameter/cut_off = ${cutoff}\nshader_parameter/paint_foliage = ${foliage ? 'true' : 'false'}\nshader_parameter/wind_amount = ${this.wind ? '1.0' : '0.0'}\n`)
        }
        for (const [texture, name] of this.textures) files.push({name, bytes: await texturePng(texture)})

        const resources = Object.entries(this.levels).map(([key, level], index) => ({key, file: level.file, id: index + 2}))
        let scene = `[gd_scene load_steps=${resources.length + 2 + (collisionFile ? 1 : 0)} format=3]\n\n[ext_resource type="Script" path="${setupName}" id="1"]\n`
        for (const {file, id} of resources) scene += `[ext_resource type="PackedScene" path="${file}" id="${id}"]\n`
        if (collisionFile) scene += `[ext_resource type="PackedScene" path="${collisionFile}" id="collision"]\n`
        scene += `\n[node name="${this.name}" type="Node3D"]\nscript = ExtResource("1")\nmaterial_manifest = "${manifestName}"\n`
        for (const {key, id} of resources) scene += `\n[node name="${key}" parent="." instance=ExtResource("${id}")]\n`
        if (collisionFile) scene += '\n[node name="Collision" parent="." instance=ExtResource("collision")]\n'
        add(`${this.name}.tscn`, scene)
        add(`${this.name}_GODOT.txt`, 'Copy this whole folder into your Godot 4 project and open the .tscn. It assigns the chosen materials in the editor and at runtime. Keep the PNG, TRES, GD, JSON and GLB files together when moving the prop. Detail changes happen at 18 and 40 metres; the last level remains visible. The GLB files also work alone with standard materials. Fluffy, Cel, Ink and Ghibli use the supplied Godot shader; Ink uses dark surface edges, not a screen-space outline effect. Wind amount can be changed in the generated materials.\n')
        return files
    }
}

async function texturePng(texture: THREE.Texture): Promise<Uint8Array> {
    const source = texture.image as {data: Uint8Array; width: number; height: number}
    const canvas = document.createElement('canvas')
    canvas.width = source.width
    canvas.height = source.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('The leaf colours could not be saved. Try exporting again.')
    context.putImageData(new ImageData(new Uint8ClampedArray(source.data), source.width, source.height), 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('The colour picture could not be saved.')), 'image/png'))
    return new Uint8Array(await blob.arrayBuffer())
}
