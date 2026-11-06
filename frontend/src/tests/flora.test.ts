import * as THREE from 'three'
import {describe, expect, it} from 'vitest'
import {getFoliageTexture} from '../assets/shared/foliage-texture'
import {appearanceDefaults} from '../assets/style/appearance'
import {getDabTexture} from '../assets/shared/dab-texture'
import {getLeafTexture} from '../assets/shared/leaf-texture'
import {paintedTreeDefaults, planPaintedTree, buildClump, validatePaintedTreeParameters} from '../assets/trees/painted'
import {mergeParts} from '../core/export/pipeline/merge'
import {foliageCell, foliageFlowerCell, foliageSolidUv} from '../assets/shared/foliage-layout'
import {suppliedLeafAlpha} from '../assets/shared/supplied-leaf-atlas'

describe('the new vegetation looks', () => {
    it.each(['tree-leaves-01', 'tree-leaves-02', 'tree-leaves-03'] as const)('uses %s as a cut-out and keeps a solid point for stems and fruit', (leafPattern) => {
        const settings = {...appearanceDefaults, leafPattern}
        const alpha = suppliedLeafAlpha(leafPattern)
        expect(alpha.some((value) => value === 0)).toBe(true)
        expect(alpha.some((value) => value === 255)).toBe(true)
        expect(alpha.some((value) => value > 0 && value < 255)).toBe(true)
        const atlas = getFoliageTexture(settings)
        const data = atlas.image.data as Uint8Array
        expect(atlas.image.width).toBe(1024)
        const [u, v] = foliageSolidUv(settings)
        const at = (Math.floor(v * 1024) * 1024 + Math.floor(u * 1024)) * 4
        expect(data[at + 3]).toBe(255)
        expect(data[0]).toBe(255)
        expect(data[3]).toBe(0)
    })

    it('mixes whole supplied leaf pictures at the chosen proportion and keeps the flower cell', () => {
        const settings = {...appearanceDefaults, leafPattern: 'tree-leaves-03' as const, secondLeafPattern: 'tree-leaves-02' as const, leafMix: 0.35}
        let secondary = 0
        for (let i = 0; i < 1000; i++) {
            const [u, v, size] = foliageCell(settings, (i + 0.5) / 1000, true)
            if (v >= 0.5) secondary++
            expect(size).toBe(0.25)
            expect([u, v]).not.toEqual([0.75, 0.75])
        }
        expect(secondary).toBe(350)
        expect(foliageFlowerCell(settings)).toEqual([0.75, 0.75, 0.25])
        const atlas = getFoliageTexture(settings, true).image.data as Uint8Array
        const original = getLeafTexture().image.data as Uint8Array
        for (let y = 0; y < 256; y++) {
            const target = ((768 + y) * 1024 + 768) * 4
            const source = ((256 + y) * 512 + 256) * 4
            expect(atlas.subarray(target, target + 1024).every((value, index) => value === original[source + index])).toBe(true)
        }
    })

    it('keeps the original leaves for trees saved before leaf choices existed', () => {
        expect(getFoliageTexture(appearanceDefaults)).toBe(getDabTexture())
        expect(getFoliageTexture(appearanceDefaults, true)).toBe(getLeafTexture())
        const tree = validatePaintedTreeParameters({height: 4}).parameters
        expect(tree.appearance).toBe('natural')
        expect(tree.vines).toBe(0)
    })

    it('mixes reproducible leaf shapes and preserves the flowers on bushes', () => {
        const settings = {...appearanceDefaults, leafPattern: 'oak' as const, secondLeafPattern: 'maple' as const, leafMix: 0.4}
        const atlas = getFoliageTexture(settings, true)
        expect(getFoliageTexture(settings, true)).toBe(atlas)
        const plain = getFoliageTexture({...settings, leafMix: 0}, true).image.data as Uint8Array
        expect((atlas.image.data as Uint8Array).some((value, index) => value !== plain[index])).toBe(true)
        const original = getLeafTexture().image.data as Uint8Array
        const pixels = atlas.image.data as Uint8Array
        for (let y = 256; y < 512; y++) {
            const at = (y * 512 + 256) * 4
            expect(pixels.subarray(at, at + 1024).every((value, index) => value === original[at + index])).toBe(true)
        }
        expect(getFoliageTexture({...settings, leafMix: 1})).toBe(getFoliageTexture({...settings, leafPattern: 'maple', leafMix: 0}))
    })

    it('adds seeded hanging stems without moving the crown', () => {
        const tree = {...paintedTreeDefaults, height: 5, spread: 4, clumpCount: 4, vines: 8}
        const plan = planPaintedTree(tree, 71)
        const clump = plan.clumps[0]
        const full = buildClump(plan, clump, tree, 1)
        const again = buildClump(plan, clump, tree, 1)
        const bare = buildClump(plan, clump, {...tree, vines: 0}, 1)
        expect(full.getAttribute('position').array).toEqual(again.getAttribute('position').array)
        expect(full.index!.count).toBeGreaterThan(bare.index!.count)
        expect(Array.from(full.getAttribute('position').array).slice(0, bare.getAttribute('position').array.length)).toEqual(Array.from(bare.getAttribute('position').array))
        expect(full.getAttribute('rigid')).toBeDefined()
        const light = buildClump(plan, clump, tree, 1, 0.12)
        expect(light.index!.count).toBeLessThan(full.index!.count)
        full.computeBoundingBox()
        expect(full.boundingBox!.min.y + clump.centre[1]).toBeGreaterThan(0)
        for (const geometry of [full, again, bare, light]) geometry.dispose()
    })

    it('keeps extreme hanging stems finite and within a small face budget', () => {
        const tree = validatePaintedTreeParameters({...paintedTreeDefaults, height: 0.3, clumpCount: 1, vines: 32, vineLength: 1, vineThickness: 0.08, vineCurl: 1, vineLeaves: 1}).parameters
        const plan = planPaintedTree(tree, 9)
        const geometry = buildClump(plan, plan.clumps[0], tree, 1)
        for (const attribute of Object.values(geometry.attributes)) {
            expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true)
        }
        expect(geometry.index!.count / 3).toBeLessThan(30000)
        geometry.dispose()
    })

    it('exports different leaf pictures and looks as separate named surfaces', () => {
        const matrix = new THREE.Matrix4().toArray()
        const parts = ['oak', 'maple', 'needle'].map((pattern) => ({
            matrix, tint: [1, 1, 1] as const, flatShading: false,
            part: {
                geometry: new THREE.PlaneGeometry(1, 1), material: 'painted' as const, role: 'foliage' as const,
                surface: {vertexColors: true, appearance: 'cel' as const, map: getFoliageTexture({...appearanceDefaults, leafPattern: pattern as 'oak' | 'maple' | 'needle'}), alphaTest: 0.5},
            },
        }))
        const meshes = mergeParts(parts, 'mixed', [0, 0, 0])
        expect(meshes.map((mesh) => mesh.name)).toEqual(['mixed_leaves', 'mixed_leaves_2', 'mixed_leaves_3'])
        expect(new Set(meshes.map((mesh) => mesh.material.map)).size).toBe(3)
        expect(meshes.every((mesh) => mesh.material.userData.appearance === 'cel')).toBe(true)
        for (const mesh of meshes) { mesh.geometry.dispose(); mesh.material.dispose() }
        for (const part of parts) part.part.geometry.dispose()
    })
})
