import * as THREE from 'three'
import masks from '../leaves/masks.json'
import type {FoliageAppearance, LeafPattern} from '../style/appearance'
import {isSuppliedLeaf, leafChoices} from './foliage-layout'
import {getLeafTexture} from './leaf-texture'

const decoded = new Map<string, Uint8Array>()

export function suppliedLeafAlpha(pattern: keyof typeof masks.masks): Uint8Array {
    const known = decoded.get(pattern)
    if (known) return known
    const packed = atob(masks.masks[pattern].alpha)
    const pixels = new Uint8Array(masks.size * masks.size)
    let at = 0
    for (let i = 0; i < packed.length; i += 3) {
        const count = packed.charCodeAt(i + 1) | packed.charCodeAt(i + 2) << 8
        pixels.fill(packed.charCodeAt(i), at, at + count)
        at += count
    }
    decoded.set(pattern, pixels)
    return pixels
}

export function suppliedLeafAtlas(
    settings: FoliageAppearance,
    bush: boolean,
    generated: (pattern: LeafPattern) => THREE.DataTexture,
): Uint8Array {
    const cellSize = masks.size
    const size = cellSize * 4
    const data = new Uint8Array(size * size * 4)
    const {primary, secondary} = leafChoices(settings)
    for (let i = 0; i < data.length; i += 4) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255 }
    for (let cell = 0; cell < 16; cell++) {
        const flower = bush && cell === 15
        const pattern = cell < 8 ? primary : secondary
        const variant = cell % 8
        const alpha = isSuppliedLeaf(pattern) && !flower ? suppliedLeafAlpha(pattern) : null
        const original = alpha ? null : (flower ? getLeafTexture() : generated(pattern)).image
        const pixels = original?.data as Uint8Array | undefined
        const sourceCell = flower ? 3 : variant % (bush ? 3 : 4)
        const ox = (cell % 4) * cellSize
        const oy = Math.floor(cell / 4) * cellSize
        for (let y = 0; y < cellSize; y++) {
            for (let x = 0; x < cellSize; x++) {
                const at = ((oy + y) * size + ox + x) * 4
                if (alpha) {
                    let sx = variant >= 4 ? cellSize - 1 - x : x
                    let sy = y
                    for (let turn = 0; turn < variant % 4; turn++) [sx, sy] = [sy, cellSize - 1 - sx]
                    data[at + 3] = alpha[sy * cellSize + sx]
                } else {
                    const sourceSize = original!.width / 2
                    const sx = sourceCell % 2 * sourceSize + Math.floor(x / cellSize * sourceSize)
                    const sy = Math.floor(sourceCell / 2) * sourceSize + Math.floor(y / cellSize * sourceSize)
                    const from = (sy * original!.width + sx) * 4
                    data.set(pixels!.subarray(from, from + 4), at)
                }
            }
        }
    }
    return data
}
