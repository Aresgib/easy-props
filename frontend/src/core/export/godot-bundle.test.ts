import * as THREE from 'three'
import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest'
import {applyAppearance} from '../../assets/style/appearance'
import {GodotBundle} from './godot-bundle'

beforeAll(() => {
    vi.stubGlobal('ImageData', class {
        constructor(readonly data: Uint8ClampedArray, readonly width: number, readonly height: number) {}
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({putImageData() {}}) as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob([new Uint8Array([137, 80, 78, 71])], {type: 'image/png'})))
})

afterAll(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('the ready-to-use Godot prop', () => {
    it('keeps the original export unchanged when every surface uses natural light', async () => {
        const bundle = new GodotBundle('old_tree', true)
        const material = new THREE.MeshStandardMaterial()
        bundle.addLevel(0, 'old_tree.glb', [{name: 'wood', geometry: new THREE.BufferGeometry(), material}], true)
        expect(await bundle.files()).toEqual([])
        material.dispose()
    })

    it('assigns each joined surface its own chosen look and shares its picture across levels', async () => {
        const texture = new THREE.DataTexture(new Uint8Array(16).fill(255), 2, 2)
        const soft = new THREE.MeshStandardMaterial({map: texture, alphaTest: 0.5})
        const ink = new THREE.MeshStandardMaterial({map: texture, alphaTest: 0.7})
        applyAppearance(soft, 'fluffy')
        applyAppearance(ink, 'ink')
        const bundle = new GodotBundle('mixed', false)
        const mesh = {name: 'mixed', geometry: new THREE.BufferGeometry(), material: [soft, ink]}
        bundle.addLevel(0, 'mixed_LOD0.glb', [mesh], false)
        bundle.addLevel(1, 'mixed_LOD1.glb', [mesh], true)
        const files = await bundle.files('mixed_collision.glb')
        const read = (name: string) => new TextDecoder().decode(files.find((file) => file.name === name)!.bytes)
        const manifest = JSON.parse(read('mixed.godot.json'))
        expect(manifest.levels.LOD0.meshes.mixed).toEqual(['mixed_material_0.tres', 'mixed_material_1.tres'])
        expect(manifest.levels.LOD1.meshes).toEqual(manifest.levels.LOD0.meshes)
        expect(manifest.levels.LOD1.begin).toBe(18)
        expect(manifest.levels.LOD1.end).toBe(0)
        expect(files.filter((file) => file.name.endsWith('.png'))).toHaveLength(1)
        expect(read('mixed_material_0.tres')).toContain('shader_parameter/appearance = 1')
        expect(read('mixed_material_1.tres')).toContain('shader_parameter/cut_off = 0.7')
        expect(read('mixed_material_1.tres')).toContain('shader_parameter/wind_amount = 0.0')
        expect(read('mixed.tscn')).toContain('path="mixed_collision.glb"')
        expect(read('mixed_setup.gd')).toContain('get_base_dir()')
        texture.dispose(); soft.dispose(); ink.dispose(); mesh.geometry.dispose()
    })
})
