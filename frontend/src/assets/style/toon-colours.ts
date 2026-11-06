import * as THREE from 'three'

/** Remove baked brightness before the toon light is applied, preserving pigment hues. */
export function toonColours(geometry: THREE.BufferGeometry): THREE.BufferAttribute {
    const source = geometry.getAttribute('color')
    const count = geometry.getAttribute('position')?.count ?? 0
    const values = new Float32Array(count * 3)
    let total = 0
    const luminance = (r: number, g: number, b: number) => r * 0.2126 + g * 0.7152 + b * 0.0722

    if (source) {
        for (let i = 0; i < count; i++) total += luminance(source.getX(i), source.getY(i), source.getZ(i))
    }
    const base = source ? total / Math.max(count, 1) : 1

    for (let i = 0; i < count; i++) {
        const r = source?.getX(i) ?? 1
        const g = source?.getY(i) ?? 1
        const b = source?.getZ(i) ?? 1
        const scale = Math.min(base / Math.max(luminance(r, g, b), 0.0001), 1 / Math.max(r, g, b, 0.0001))
        values[i * 3] = r * scale
        values[i * 3 + 1] = g * scale
        values[i * 3 + 2] = b * scale
    }
    return new THREE.BufferAttribute(values, 3)
}

export function prepareToonColours(geometry: THREE.BufferGeometry, appearance: unknown): void {
    if (appearance === 'cel' || appearance === 'ink' || appearance === 'ghibli') geometry.setAttribute('paintColour', toonColours(geometry))
}
