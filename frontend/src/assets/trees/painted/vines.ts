import * as THREE from 'three'
import {foliageCell, foliageSolidUv} from '../../shared/foliage-layout'
import {createSeededRandom, hashSeed} from '../../shared/random'
import {leafColours, type LeafBuffers} from './frond-mesh'
import type {PaintedTreeParameters} from './parameters'
import {cross, normalize, perpendicularTo, type Clump, type TreePlan, type Vec3} from './plan'

/** Attached to the clump's own geometry, so moving or removing it carries its vines. */
export function addVines(buffers: LeafBuffers, plan: TreePlan, clump: Clump, tree: PaintedTreeParameters, share: number): void {
    const at = plan.clumps.indexOf(clump)
    const paint = leafColours(tree, clump)
    const vertex = (point: Vec3, normal: Vec3, colour: THREE.Color, uv: readonly [number, number]) => {
        const index = buffers.positions.length / 3
        buffers.positions.push(...point)
        buffers.normals.push(...normal)
        buffers.colors.push(colour.r, colour.g, colour.b)
        buffers.uvs.push(...uv)
        return index
    }
    const quad = (a: number, b: number, c: number, d: number, both = false) => {
        buffers.indices.push(a, b, c, a, c, d)
        if (both) buffers.indices.push(a, c, b, a, d, c)
    }

    for (let vine = at; vine < tree.vines; vine += plan.clumps.length) {
        const random = createSeededRandom(hashSeed(clump.seed, 24000 + vine))
        const angle = random() * Math.PI * 2
        const reach = clump.radius * (0.45 + random() * 0.4)
        const start: Vec3 = [Math.cos(angle) * reach, -clump.radius * clump.flatten * 0.3, Math.sin(angle) * reach]
        const clearance = start[1] + clump.centre[1] - 0.12
        if (clearance <= 0) continue
        const length = clearance * tree.vineLength * (0.75 + random() * 0.25)
        const phase = random() * Math.PI * 2
        const curl = length * tree.vineCurl * 0.16
        const point = (t: number): Vec3 => [
            start[0] + curl * (Math.sin(phase + t * 8) - Math.sin(phase)),
            start[1] - length * t,
            start[2] + curl * (Math.cos(phase + t * 8) - Math.cos(phase)),
        ]
        const segments = Math.max(2, Math.round((8 + length * 3) * share))
        const sides = share < 0.3 ? 3 : 5
        const first = buffers.positions.length / 3

        for (let ring = 0; ring <= segments; ring++) {
            const t = ring / segments
            const centre = point(t)
            const before = point(Math.max(0, t - 0.01))
            const after = point(Math.min(1, t + 0.01))
            const tangent = normalize([after[0] - before[0], after[1] - before[1], after[2] - before[2]])
            const u = perpendicularTo(tangent)
            const v = cross(tangent, u)
            const radius = tree.vineThickness * (1 - t * 0.75)
            for (let side = 0; side < sides; side++) {
                const turn = side / sides * Math.PI * 2
                const n: Vec3 = [u[0] * Math.cos(turn) + v[0] * Math.sin(turn), u[1] * Math.cos(turn) + v[1] * Math.sin(turn), u[2] * Math.cos(turn) + v[2] * Math.sin(turn)]
                vertex([centre[0] + n[0] * radius, centre[1] + n[1] * radius, centre[2] + n[2] * radius], n, paint(0.12 + t * 0.12), foliageSolidUv(tree))
                if (ring > 0) {
                    const a = first + (ring - 1) * sides + side
                    const b = first + (ring - 1) * sides + (side + 1) % sides
                    const c = first + ring * sides + (side + 1) % sides
                    const d = first + ring * sides + side
                    quad(a, b, c, d, true)
                }
            }
        }
        // A stem sways with its leaves, but does not flutter and change thickness.
        buffers.rigid.push(first, buffers.positions.length / 3)

        const leaves = Math.min(64, Math.round(length * (3 + tree.vineLeaves * 9)))
        const stride = Math.max(1, Math.round(1 / share))
        for (let leaf = 0; leaf < leaves; leaf++) {
            const t = (leaf + 0.5) / leaves
            const turn = leaf * 2.39996 + phase
            const width = Math.min(0.3, Math.max(0.045, tree.height * 0.022)) * tree.leafSize * (1 - t * 0.4)
            const sample = random()
            if (tree.vineLeaves === 0 || leaf % stride !== 0) continue
            const p = point(t)
            const u: Vec3 = [Math.cos(turn) * width, 0, Math.sin(turn) * width]
            const v: Vec3 = [0, Math.min(width * 1.4, length / leaves * 1.2), 0]
            const n = normalize([Math.sin(turn), 0.4, -Math.cos(turn)])
            const [ux, uy, size] = foliageCell(tree, sample)
            const base = buffers.positions.length / 3
            for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
                vertex([p[0] + u[0] * (x + 0.65), p[1] + v[1] * y, p[2] + u[2] * (x + 0.65)], n, paint(0.65 - t * 0.3), [ux + (x + 1) * size / 2, uy + (y + 1) * size / 2])
            }
            quad(base, base + 1, base + 2, base + 3, true)
        }
    }
}
