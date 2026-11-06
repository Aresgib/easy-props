/**
 * What a preset's shipped picture was drawn from.
 *
 * Its settings, and the version of every generator behind it: if any of those change
 * the picture is out of date, and a test says so. Nothing computed goes in, because the
 * last digit of a computed number can differ between a browser and the tests.
 */

import {findPropGenerator} from '../assets/prop-generators'
import {findPreset} from '../assets/trees/presets'
import {createSceneFromPreset} from '../core/scene/initial-scene'
import {appearanceVersion} from '../assets/style/appearance'

/** Raise when the way pictures are drawn changes: the camera, the light, the backdrop. */
const DRAWING_VERSION = 1

// These neutral options did not exist when the original pictures were drawn.
// Leaving them out keeps a picture current when its prop still looks identical.
const OPTIONAL_DEFAULTS: Readonly<Record<string, number | string>> = {
    appearance: 'natural', leafPattern: 'original', secondLeafPattern: 'original', leafMix: 0,
    vines: 0, vineLength: 0.75, vineThickness: 0.015, vineCurl: 0.3, vineLeaves: 0.65,
    barkFinish: 'match',
}

export function presetFingerprint(presetId: string): string {
    const preset = findPreset(presetId)
    const lookVersion = appearanceVersion(preset?.parameters.appearance as string | undefined)
    const parts = (createSceneFromPreset(presetId).assets[0]?.components ?? []).map(
        ({generatorId, generatorVersion}) => `${generatorId}@${generatorVersion}`,
    )
    const text = JSON.stringify([
        lookVersion === 1 ? DRAWING_VERSION : [DRAWING_VERSION, lookVersion],
        preset ? {...preset, parameters: Object.fromEntries(Object.entries(preset.parameters).filter(([key, value]) => OPTIONAL_DEFAULTS[key] !== value))} : preset,
        preset ? findPropGenerator(preset.generatorId)?.version : null,
        [...new Set(parts)].sort(),
    ])
    let hash = 0x811c9dc5

    for (let at = 0; at < text.length; at++) {
        hash = Math.imul(hash ^ text.charCodeAt(at), 0x01000193)
    }

    return (hash >>> 0).toString(16).padStart(8, '0')
}
