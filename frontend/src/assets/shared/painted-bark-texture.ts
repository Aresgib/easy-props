import * as THREE from 'three'

const SIZE = 512
const cache = new Map<string, THREE.DataTexture>()
const clamp = (value: number) => Math.min(1, Math.max(0, value))
const hash = (x: number, y: number) => {
    const value = Math.sin(x * 127.1 + y * 311.7 + 43117) * 43758.5453
    return value - Math.floor(value)
}
const wrap = (value: number, size: number) => ((value % size) + size) % size

/** Periodic, elongated Voronoi cells: patches of pigment rather than rectangles over bark. */
function patch(u: number, v: number, columns: number, rows: number, salt: number): number {
    const x = u * columns
    const y = v * rows
    const cx = Math.floor(x)
    const cy = Math.floor(y)
    let distance = Infinity
    let colour = 0

    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const px = wrap(cx + dx, columns)
            const py = wrap(cy + dy, rows)
            const ox = cx + dx + 0.5 + (hash(px + salt, py) - 0.5) * 0.68 - x
            const oy = cy + dy + 0.5 + (hash(px, py + salt) - 0.5) * 0.68 - y
            const d = ox * ox + oy * oy
            if (d < distance) {
                distance = d
                colour = hash(px + salt * 2, py + salt)
            }
        }
    }
    return colour
}

export interface PaintedWoodSettings {
    readonly contrast: number
    readonly scale: number
    readonly moss: number
    readonly baseShade: number
    readonly shadow: string
    readonly light: string
}

/** Approximation of the reference's Voronoi, layered noise, moss and cool base paint. */
export function getPaintedBarkTexture(settings: PaintedWoodSettings): THREE.DataTexture {
    const key = JSON.stringify(settings)
    const known = cache.get(key)
    if (known) return known
    const data = new Uint8Array(SIZE * SIZE * 4).fill(255)
    const deep = new THREE.Color(settings.shadow)
    const light = new THREE.Color(settings.light)
    const moss = new THREE.Color('#65794e')
    const cool = new THREE.Color('#3e495a')
    const paint = new THREE.Color()
    const columns = Math.max(3, Math.round(7 / settings.scale))
    const rows = Math.max(2, Math.round(10 / settings.scale))

    for (let y = 0; y < SIZE; y++) {
        const v = (y + 0.5) / SIZE
        for (let x = 0; x < SIZE; x++) {
            const u = (x + 0.5) / SIZE
            const broad = patch(u, v, columns, rows, 7)
            const fine = patch(u, v, columns * 3, rows * 3, 31)
            const mark = clamp(0.58 + ((broad - 0.5) * 0.9 + (fine - 0.5) * 0.22) * settings.contrast)
            paint.copy(deep).lerp(light, mark)
            paint.multiplyScalar(1 + Math.max(0, fine - 0.6) * 0.8 * settings.contrast)
            const growth = clamp((patch(u, v, Math.max(2, Math.round(columns / 2)), rows, 53) - 0.48) * 3)
            paint.lerp(moss, growth * settings.moss)
            const base = clamp(1 - v / 0.38) * settings.baseShade
            paint.lerp(cool, base * 0.55).multiplyScalar(1 - base * 0.35)
            paint.convertLinearToSRGB()
            const at = (y * SIZE + x) * 4
            data[at] = Math.round(clamp(paint.r) * 255)
            data[at + 1] = Math.round(clamp(paint.g) * 255)
            data[at + 2] = Math.round(clamp(paint.b) * 255)
        }
    }
    const texture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat)
    texture.name = `painted-wood-${key}`
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
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
