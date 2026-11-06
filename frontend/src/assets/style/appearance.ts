import * as THREE from 'three'
import {choiceSchema, numberSchema, type ParameterSpec} from '../shared/parameters'
import {prepareToonColours} from './toon-colours'
import {GHIBLI_FUNCTIONS} from './ghibli'

export type Appearance = 'natural' | 'fluffy' | 'cel' | 'ink' | 'ghibli'
export type LeafPattern = 'original' | 'oval' | 'oak' | 'maple' | 'needle' | 'tree-leaves-01' | 'tree-leaves-02' | 'tree-leaves-03'

export const appearanceVersion = (appearance: string | undefined): number => appearance === 'ghibli' || appearance === 'cel' || appearance === 'ink' ? 2 : 1

export const APPEARANCE = {
    kind: 'choice', group: 'Appearance', key: 'appearance', label: 'Material',
    help: 'Natural follows the scene light. Fluffy keeps soft painted colours. Cel uses colour bands. Ink adds fine contours. Ghibli uses cool shadows and warm painted light.',
    default: 'natural',
    options: [
        {value: 'natural', label: 'Natural'},
        {value: 'fluffy', label: 'Fluffy'},
        {value: 'cel', label: 'Cel'},
        {value: 'ink', label: 'Ink'},
        {value: 'ghibli', label: 'Ghibli'},
    ],
} as const

export const LEAF_PATTERN = {
    kind: 'choice', group: 'Leaves', key: 'leafPattern', label: 'Leaf shape',
    help: 'The small shapes that make up each patch of leaves.',
    default: 'original',
    options: [
        {value: 'original', label: 'Original'},
        {value: 'oval', label: 'Oval'},
        {value: 'oak', label: 'Oak'},
        {value: 'maple', label: 'Maple'},
        {value: 'needle', label: 'Needles'},
        {value: 'tree-leaves-01', label: 'Tree leaves 01'},
        {value: 'tree-leaves-02', label: 'Tree leaves 02'},
        {value: 'tree-leaves-03', label: 'Tree leaves 03'},
    ],
} as const

export const SECOND_LEAF_PATTERN = {...LEAF_PATTERN, key: 'secondLeafPattern', label: 'Other leaf shape', help: 'A second kind of leaf to mix into the same plant.'} as const
export const LEAF_MIX = {
    kind: 'number', group: 'Leaves', key: 'leafMix', label: 'Leaf mix',
    help: 'How much of the second leaf shape to use. 0 keeps only the first; 1 uses only the second.',
    min: 0, max: 1, step: 0.05, default: 0,
} as const

export const appearanceSpecs: readonly ParameterSpec[] = [APPEARANCE, LEAF_PATTERN, SECOND_LEAF_PATTERN, LEAF_MIX]
export const appearanceDefaults = {
    appearance: APPEARANCE.default as Appearance,
    leafPattern: LEAF_PATTERN.default as LeafPattern,
    secondLeafPattern: SECOND_LEAF_PATTERN.default as LeafPattern,
    leafMix: LEAF_MIX.default as number,
}
export const appearanceSchema = {
    appearance: choiceSchema(APPEARANCE),
    leafPattern: choiceSchema(LEAF_PATTERN),
    secondLeafPattern: choiceSchema(SECOND_LEAF_PATTERN),
    leafMix: numberSchema(LEAF_MIX),
}
export type FoliageAppearance = typeof appearanceDefaults

/** Shared with the Godot material. Authored directions survive double-sided leaves. */
export const APPEARANCE_FRAGMENT = /* glsl */ `
    #if PAINT_STYLE == 1
        float paintShade = smoothstep(-0.6, 0.8, dot(normalize(vPaintNormal), normalize(vec3(-0.45, 0.82, 0.35))));
        outgoingLight = diffuseColor.rgb * mix(vec3(0.48, 0.62, 0.68), vec3(1.18, 1.12, 1.02), paintShade);
    #else
        // A neutral pigment and one light ramp make bands follow the whole
        // volume, instead of posterising every brush mark and tiny shadow.
        vec3 paint = vPaintColour * diffuse;
        #if defined(USE_MAP)
            vec3 paper = texture2D(map, vMapUv).rgb;
            paint *= paper;
            #if defined(USE_ALPHATEST)
                float grain = dot(paper, vec3(0.2126, 0.7152, 0.0722));
                paint /= mix(1.0, max(grain, 0.3), 0.8);
            #endif
        #endif
        float shade = smoothstep(-0.6, 0.8, dot(normalize(vPaintNormal), normalize(vec3(-0.45, 0.82, 0.35))));
        #if PAINT_STYLE == 4
            #if PAINT_FOLIAGE == 1
                outgoingLight = ghibliLeaves(paint, vPaintNormal, vPaintPosition);
            #else
                outgoingLight = ghibliWood(paint, vPaintNormal);
            #endif
        #else
        float blendWidth = clamp(fwidth(shade) * 0.65, 0.004, 0.035);
        float middle = smoothstep(0.42 - blendWidth, 0.42 + blendWidth, shade);
        float highlight = smoothstep(0.76 - blendWidth, 0.76 + blendWidth, shade);
        vec3 light = mix(vec3(0.56, 0.72, 0.78), vec3(0.94, 0.98, 1.0), middle);
        light = mix(light, vec3(1.2, 1.14, 1.02), highlight);
        outgoingLight = paint * light;
        #endif
        #if PAINT_STYLE == 3
            #if defined(USE_MAP) && defined(USE_ALPHATEST)
                // Trace only the filtered cut-out boundary. Neighbour sampling
                // spreads ink into opaque leaves and turns fine detail into dots.
                float edge = 1.0 - smoothstep(alphaTest, min(alphaTest + 0.16, 1.0), diffuseColor.a);
                outgoingLight *= 1.0 - edge * 0.4;
            #else
                vec3 viewDirection = inverseTransformDirection(normalize(vViewPosition), viewMatrix);
                float facing = abs(dot(normalize(vPaintNormal), viewDirection));
                float edge = 1.0 - smoothstep(0.015, 0.08, facing);
                outgoingLight *= 1.0 - edge * 0.48;
            #endif
        #endif
    #endif
`

export function applyAppearance(material: THREE.MeshStandardMaterial, appearance: Appearance = 'natural', geometry?: THREE.BufferGeometry, foliage = false): void {
    material.userData.appearance = appearance
    material.userData.foliage = foliage
    if (appearance === 'natural') return
    material.toneMapped = false
    if (geometry) prepareToonColours(geometry, appearance)

    const style = appearance === 'fluffy' ? 1 : appearance === 'cel' ? 2 : appearance === 'ink' ? 3 : 4
    const previous = material.onBeforeCompile
    const previousKey = material.customProgramCacheKey.bind(material)
    const key = previousKey()

    material.onBeforeCompile = (shader, renderer) => {
        previous.call(material, shader, renderer)
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vPaintNormal;')
            .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvPaintNormal = inverseTransformDirection(transformedNormal, viewMatrix);')
        if (style === 4) {
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nvarying vec3 vPaintPosition;')
                .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaintPosition = (modelMatrix * vec4(position, 1.0)).xyz;')
        }
        if (style >= 2) {
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nattribute vec3 paintColour;\nvarying vec3 vPaintColour;')
                .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaintColour = paintColour;')
        }
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>\nvarying vec3 vPaintNormal;\n${style >= 2 ? 'varying vec3 vPaintColour;' : ''}\n${style === 4 ? `varying vec3 vPaintPosition;\n${GHIBLI_FUNCTIONS}` : ''}\n#define PAINT_STYLE ${style}\n#define PAINT_FOLIAGE ${foliage ? 1 : 0}`)
            .replace('#include <opaque_fragment>', `${APPEARANCE_FRAGMENT}\n#include <opaque_fragment>`)
    }
    material.customProgramCacheKey = () => `${key}:paint-${style}-${appearanceVersion(appearance)}-${foliage ? 'leaves' : 'solid'}`
}
