import * as THREE from 'three'
import type {FoliageAppearance, LeafPattern} from '../style/appearance'
import {getDabTexture} from './dab-texture'
import {getLeafTexture} from './leaf-texture'
import {createSeededRandom} from './random'
import {leafChoices, usesSuppliedLeaves} from './foliage-layout'
import {suppliedLeafAtlas} from './supplied-leaf-atlas'

const SIZE = 512
const CELL = SIZE / 2
const cache = new Map<string, THREE.DataTexture>()

/** A generated atlas with the same layout as the existing tree and bush atlases. */
export function getFoliageTexture(settings: FoliageAppearance, bush = false): THREE.DataTexture {
    const {primary: leafPattern, secondary: secondLeafPattern, mix: leafMix} = leafChoices(settings)
    const original = bush ? getLeafTexture() : getDabTexture()
    if (leafPattern === 'original' && (leafMix === 0 || secondLeafPattern === 'original')) return original

    const supplied = usesSuppliedLeaves(settings)
    const key = `${bush}:${leafPattern}:${secondLeafPattern}:${supplied ? 'supplied' : leafMix}`
    const known = cache.get(key)
    if (known) return known
    if (supplied) {
        const data = suppliedLeafAtlas(settings, bush, (pattern) => getFoliageTexture({...settings, leafPattern: pattern, secondLeafPattern: pattern, leafMix: 0}, bush))
        return rememberTexture(data, 1024, key)
    }

    const data = new Uint8Array(SIZE * SIZE * 4)
    const source = original.image.data as Uint8Array
    const random = createSeededRandom(71309)
    for (let i = 0; i < data.length; i += 4) data.set([245, 245, 245, 0], i)

    for (let cell = 0; cell < (bush ? 3 : 4); cell++) {
        const ox = (cell % 2) * CELL
        const oy = Math.floor(cell / 2) * CELL
        const pattern = leafMix >= 1 ? secondLeafPattern : leafPattern
        if (pattern === 'original' && leafMix === 0) {
            for (let y = 0; y < CELL; y++) {
                const start = ((oy + y) * SIZE + ox) * 4
                data.set(source.subarray(start, start + CELL * 4), start)
            }
            continue
        }

        for (let stamp = 0; stamp < 90; stamp++) {
            const turn = random() * Math.PI * 2
            const reach = Math.sqrt(random()) * 83
            const cx = CELL / 2 + Math.cos(turn) * reach
            const cy = CELL / 2 + Math.sin(turn) * reach
            const shape: LeafPattern = random() < leafMix ? secondLeafPattern : leafPattern
            const rotation = random() * Math.PI * 2
            const length = 17 + random() * 18
            const width = shape === 'needle' ? length * 0.18 : length * 0.6
            const cos = Math.cos(rotation)
            const sin = Math.sin(rotation)
            const shade = Math.round(225 + random() * 28)

            for (let y = Math.max(5, Math.floor(cy - length)); y < Math.min(CELL - 5, cy + length); y++) {
                for (let x = Math.max(5, Math.floor(cx - length)); x < Math.min(CELL - 5, cx + length); x++) {
                    const dx = x - cx
                    const dy = y - cy
                    const u = (dx * cos + dy * sin) / width
                    const v = (-dx * sin + dy * cos) / length
                    const angle = Math.atan2(v, u)
                    const lobes = shape === 'oak' ? 1 + 0.22 * Math.cos(v * Math.PI * 5) : 1
                    const radius = shape === 'maple' ? 0.72 + 0.28 * Math.cos(angle * 5) : lobes
                    const distance = Math.hypot(u, v) / radius
                    const alpha = Math.round(255 * THREE.MathUtils.clamp((1 - distance) * 12, 0, 1))
                    const at = ((oy + y) * SIZE + ox + x) * 4
                    if (alpha > data[at + 3]) data.set([shade, shade, shade, alpha], at)
                }
            }
        }
        // Solid sampling point for stems, fruit and untextured leaf shapes.
        for (let y = CELL / 2 - 3; y <= CELL / 2 + 3; y++) {
            for (let x = CELL / 2 - 3; x <= CELL / 2 + 3; x++) data.set([245, 245, 245, 255], ((oy + y) * SIZE + ox + x) * 4)
        }
    }

    if (bush) {
        for (let y = CELL; y < SIZE; y++) {
            const start = (y * SIZE + CELL) * 4
            data.set(source.subarray(start, start + CELL * 4), start)
        }
    }

    return rememberTexture(data, SIZE, key)
}

function rememberTexture(data: Uint8Array, size: number, key: string): THREE.DataTexture {
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    texture.name = `leaves-${key}`
    texture.colorSpace = THREE.SRGBColorSpace
    texture.magFilter = THREE.LinearFilter
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = 4
    texture.needsUpdate = true
    cache.set(key, texture)
    // A dragged mix slider must not retain a GPU atlas for every value forever.
    let bytes = [...cache.values()].reduce((sum, entry) => sum + entry.image.width * entry.image.height * 4, 0)
    while (bytes > 32 * 1024 * 1024) {
        const oldest = cache.keys().next().value!
        const removed = cache.get(oldest)!
        bytes -= removed.image.width * removed.image.height * 4
        removed.dispose()
        cache.delete(oldest)
    }
    return texture
}
