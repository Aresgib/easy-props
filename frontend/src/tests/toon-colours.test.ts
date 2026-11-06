import * as THREE from 'three'
import {describe, expect, it} from 'vitest'
import {toonColours} from '../assets/style/toon-colours'
import {createPartMaterial} from '../assets/style/part-material'
import {mergeParts} from '../core/export/pipeline/merge'

function paintedPlane() {
    const geometry = new THREE.PlaneGeometry(1, 1)
    geometry.setAttribute('color', new THREE.Float32BufferAttribute([
        0.2, 0.1, 0.05, 0.8, 0.4, 0.2, 0.4, 0.2, 0.1, 0.6, 0.3, 0.15,
    ], 3))
    return geometry
}

describe('a single light on painted colours', () => {
    it('removes baked brightness without changing the pigment hue or the source paint', () => {
        const geometry = paintedPlane()
        const original = Array.from(geometry.getAttribute('color').array)
        const colours = toonColours(geometry)
        for (let i = 0; i < colours.count; i++) {
            expect(colours.getX(i)).toBeCloseTo(0.5)
            expect(colours.getY(i)).toBeCloseTo(0.25)
            expect(colours.getZ(i)).toBeCloseTo(0.125)
        }
        expect(Array.from(geometry.getAttribute('color').array)).toEqual(original)
        geometry.dispose()
    })

    it.each(['cel', 'ink', 'ghibli'] as const)('keeps the %s pigment identical in the view and exported file', (appearance) => {
        const geometry = paintedPlane()
        const part = {geometry, material: 'painted' as const, surface: {vertexColors: true, appearance}}
        const material = createPartMaterial(part, '#ffffff', false)
        const meshes = mergeParts([{part, matrix: new THREE.Matrix4().toArray(), tint: [1, 1, 1], flatShading: false}], 'test', [0, 0, 0])
        expect(meshes[0].geometry.getAttribute('color').array).toEqual(geometry.getAttribute('paintColour').array)
        expect(meshes[0].geometry.getAttribute('paintColour')).toBeUndefined()
        expect(Array.from(meshes[0].geometry.getAttribute('position').array)).toEqual(Array.from(geometry.getAttribute('position').array))
        geometry.dispose(); material.dispose()
        for (const mesh of meshes) { mesh.geometry.dispose(); mesh.material.dispose() }
    })

    it('keeps empty and black parts finite', () => {
        expect(toonColours(new THREE.BufferGeometry()).count).toBe(0)
        const geometry = paintedPlane()
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(12), 3))
        expect(Array.from(toonColours(geometry).array)).toEqual(new Array(12).fill(0))
        geometry.dispose()
    })
})
