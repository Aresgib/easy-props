import * as THREE from 'three'
import {describe, expect, it} from 'vitest'
import godotShader from '../../engine-kits/godot/styled.gdshader?raw'
import {GHIBLI_FUNCTIONS} from '../assets/style/ghibli'
import {getStyleProfile} from '../assets/style/style-profiles'
import {paintedBarkGenerator} from '../assets/trees/components/painted-parts'
import {buildClump, controlsForTree, paintedTreeDefaults, paintedTreeParameterSpecs, planPaintedTree, validatePaintedTreeParameters} from '../assets/trees/painted'
import {bushCoreGenerator, bushDefaults} from '../assets/bushes/bush-generator'
import {createPartMaterial} from '../assets/style/part-material'
import {mergeParts} from '../core/export/pipeline/merge'

const style = getStyleProfile('detailed')
const context = {style, seed: 17, random: () => 0.5}
const tree = {...paintedTreeDefaults, appearance: 'ghibli' as const, height: 3, spread: 2, trunkRadius: 0.08, limbCount: 2, branchCount: 1, twigCount: 0, clumpCount: 2, rootCount: 0}
const wood = (values = tree) => paintedBarkGenerator.generate({tree: values, seed: 17}, context)

describe('the Blender inspired paint', () => {
    it('keeps original bark adjustments from changing the painted finish', () => {
        const first = wood()
        const changed = wood({...tree, roughness: 1, moss: 1, brushStrokes: 2, barkPattern: 'plated', patternDepth: 1, patternScale: 2, barkTone: 'birch'})
        for (const key of ['position', 'normal', 'color', 'uv']) {
            expect(changed.geometry.getAttribute(key).array).toEqual(first.geometry.getAttribute(key).array)
        }
        expect(changed.surface!.map).toBe(first.surface!.map)
        expect(first.surface!.normalMap).toBeUndefined()
        first.geometry.dispose()
        changed.geometry.dispose()
    })

    it('keeps painted adjustments and colours from changing the original finish', () => {
        const original = {...tree, barkFinish: 'original' as const}
        const first = wood(original)
        const changed = wood({...original, paintedTone: 'custom', paintedShadow: '#ff2200', paintedLight: '#22ffff', paintedMoss: 1, paintedStrokes: 2, paintedScale: 3})
        expect(changed.geometry.getAttribute('color').array).toEqual(first.geometry.getAttribute('color').array)
        expect(changed.geometry.getAttribute('position').array).toEqual(first.geometry.getAttribute('position').array)
        expect(changed.surface!.map).toBe(first.surface!.map)
        expect(first.surface!.appearance).toBe('natural')
        expect(first.surface!.normalMap).toBeDefined()
        first.geometry.dispose()
        changed.geometry.dispose()
    })

    it('changes painted colours independently and places the base shade only at the foot', () => {
        const first = wood()
        const changed = wood({...tree, paintedTone: 'warm', paintedScale: 2, paintedMoss: 0})
        expect((changed.surface!.map!.image as {data: Uint8Array}).data).not.toEqual((first.surface!.map!.image as {data: Uint8Array}).data)
        const positions = first.geometry.getAttribute('position')
        const uvs = first.geometry.getAttribute('uv')
        for (let i = 0; i < positions.count; i++) expect(uvs.getY(i)).toBeCloseTo(positions.getY(i) / tree.height)
        first.geometry.dispose()
        changed.geometry.dispose()
    })

    it('shows only the active finish controls and restores the other values on switching', () => {
        const painted = controlsForTree(paintedTreeParameterSpecs, tree).map((spec) => spec.key)
        expect(painted).toContain('paintedStrokes')
        expect(painted).not.toContain('brushStrokes')
        expect(painted).not.toContain('barkTone')
        const original = controlsForTree(paintedTreeParameterSpecs, {...tree, barkFinish: 'original'}).map((spec) => spec.key)
        expect(original).toContain('brushStrokes')
        expect(original).not.toContain('paintedStrokes')
        const saved = validatePaintedTreeParameters({...tree, brushStrokes: 2, paintedStrokes: 0.2, barkFinish: 'original'}).parameters
        expect(validatePaintedTreeParameters({...saved, barkFinish: 'painted'}).parameters).toMatchObject({brushStrokes: 2, paintedStrokes: 0.2})
    })

    it('lights cards from the rounded clump and preserves those directions in the export', () => {
        const plan = planPaintedTree(tree, 17)
        const clump = plan.clumps[0]
        const geometry = buildClump(plan, clump, tree, 0.68)
        const positions = geometry.getAttribute('position')
        const normals = geometry.getAttribute('normal')
        for (let i = 0; i < positions.count; i++) {
            const expected = new THREE.Vector3(positions.getX(i), positions.getY(i) / clump.flatten ** 2, positions.getZ(i)).normalize()
            expect(new THREE.Vector3().fromBufferAttribute(normals, i).distanceTo(expected)).toBeLessThan(0.00001)
        }
        const part = {geometry, material: 'painted' as const, role: 'foliage' as const, surface: {vertexColors: true, appearance: 'ghibli' as const}}
        const meshes = mergeParts([{part, matrix: new THREE.Matrix4().toArray(), tint: [1, 1, 1], flatShading: true}], 'leaves', [0, 0, 0])
        const exported = meshes[0].geometry.getAttribute('normal')
        for (let i = 0; i < normals.count; i++) {
            expect(new THREE.Vector3().fromBufferAttribute(exported, i).distanceTo(new THREE.Vector3().fromBufferAttribute(normals, i))).toBeLessThan(0.000001)
        }
        for (const mesh of meshes) {mesh.geometry.dispose(); mesh.material.dispose()}
        geometry.dispose()
    })

    it('gives a solid bush the same leaf lighting in the view and export', () => {
        const part = bushCoreGenerator.generate({bush: {...bushDefaults, appearance: 'ghibli'}, seed: 17}, context)
        const material = createPartMaterial(part, '#ffffff', false)
        expect(material.userData.foliage).toBe(true)
        const meshes = mergeParts([{part, matrix: new THREE.Matrix4().toArray(), tint: [1, 1, 1], flatShading: false}], 'bush', [0, 0, 0])
        expect(meshes[0].material.userData.foliage).toBe(true)
        expect(godotShader).toContain(GHIBLI_FUNCTIONS.trim())
        material.dispose()
        part.geometry.dispose()
        for (const mesh of meshes) {mesh.geometry.dispose(); mesh.material.dispose()}
    })
})
