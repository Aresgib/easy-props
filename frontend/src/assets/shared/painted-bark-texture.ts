import * as THREE from 'three'
import {getBarkTexture, type BarkPrint} from './bark-texture'
import {createSeededRandom} from './random'

const SIZE = 512
const cache = new Map<string, THREE.DataTexture>()

/** Broad, overlapping brush marks; colour variation supplies detail instead of relief. */
export function getPaintedBarkTexture(strength: number, pattern: BarkPrint): THREE.DataTexture {
    const key = `${strength}:${pattern}`
    const known = cache.get(key)
    if (known) return known
    const data = new Uint8Array(SIZE * SIZE * 4).fill(255)
    const random = createSeededRandom(43117)
    const colours = [[0.75, 0.79, 0.68], [1, 0.92, 0.72], [0.5, 0.6, 0.62], [0.88, 0.9, 0.75]]

    for (let stroke = 0; stroke < 130; stroke++) {
        const cx = Math.floor(random() * SIZE)
        const cy = Math.floor(random() * SIZE)
        const width = 7 + random() * 23
        const length = 25 + random() * 80
        const lean = (random() - 0.5) * 0.55
        const colour = colours[Math.floor(random() * colours.length)]
        const opacity = Math.min(1, strength * (0.45 + random() * 0.45))
        for (let y = -Math.ceil(length); y <= length; y++) {
            const taper = 1 - Math.abs(y / length) * 0.2
            for (let x = -Math.ceil(width); x <= width; x++) {
                if (Math.abs(x / width) > taper) continue
                const px = ((Math.round(cx + x + y * lean) % SIZE) + SIZE) % SIZE
                const py = ((cy + y) % SIZE + SIZE) % SIZE
                const at = (py * SIZE + px) * 4
                for (let channel = 0; channel < 3; channel++) data[at + channel] = Math.round(data[at + channel] * (1 - opacity) + colour[channel] * 255 * opacity)
            }
        }
    }
    if (pattern !== 'none') {
        const original = getBarkTexture(strength, pattern).image.data as Uint8Array
        for (let at = 0; at < data.length; at += 4) {
            for (let channel = 0; channel < 3; channel++) data[at + channel] *= 0.5 + original[at + channel] / 510
        }
    }
    const texture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat)
    texture.name = `painted-wood-${key}`
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = 4
    texture.needsUpdate = true
    cache.set(key, texture)
    if (cache.size > 12) {
        const oldest = cache.keys().next().value!
        cache.get(oldest)!.dispose()
        cache.delete(oldest)
    }
    return texture
}
