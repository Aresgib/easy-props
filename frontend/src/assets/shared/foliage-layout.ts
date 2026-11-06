import masks from '../leaves/masks.json'
import type {FoliageAppearance, LeafPattern} from '../style/appearance'

export function leafChoices(settings: FoliageAppearance) {
    let {leafPattern: primary, secondLeafPattern: secondary, leafMix: mix} = settings
    if (mix >= 1) primary = secondary
    if (mix <= 0 || mix >= 1 || primary === secondary) { secondary = primary; mix = 0 }
    return {primary, secondary, mix}
}

export const isSuppliedLeaf = (pattern: LeafPattern): pattern is keyof typeof masks.masks => pattern in masks.masks
export const usesSuppliedLeaves = (settings: FoliageAppearance): boolean => {
    const {primary, secondary} = leafChoices(settings)
    return isSuppliedLeaf(primary) || isSuppliedLeaf(secondary)
}

/** Extra cells keep whole silhouettes intact while mixing two kinds of leaves. */
export function foliageCell(settings: FoliageAppearance, sample: number, bush = false): readonly [number, number, number] {
    const {mix} = leafChoices(settings)
    let cell: number
    let grid: number
    if (usesSuppliedLeaves(settings)) {
        grid = 4
        cell = mix > 0 && sample < mix
            ? 8 + Math.min((bush ? 7 : 8) - 1, Math.floor(sample / mix * (bush ? 7 : 8)))
            : Math.min(7, Math.floor((sample - mix) / (1 - mix) * 8))
    } else {
        grid = 2
        cell = Math.floor(sample * (bush ? 3 : 4))
    }
    return [(cell % grid) / grid, Math.floor(cell / grid) / grid, 1 / grid]
}

export function foliageFlowerCell(settings: FoliageAppearance): readonly [number, number, number] {
    return usesSuppliedLeaves(settings) ? [0.75, 0.75, 0.25] : [0.5, 0.5, 0.5]
}

export function foliageSolidUv(settings: FoliageAppearance): readonly [number, number] {
    if (!usesSuppliedLeaves(settings)) return [0.25, 0.25]
    const {primary} = leafChoices(settings)
    const [x, y] = isSuppliedLeaf(primary) ? masks.masks[primary].solid : [masks.size / 2, masks.size / 2]
    return [(x + 0.5) / (masks.size * 4), (y + 0.5) / (masks.size * 4)]
}
