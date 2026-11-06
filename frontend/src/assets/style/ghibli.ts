/** The reference's two diffuse ramps, blue linear-light shade and lightened highlights. */
export const GHIBLI_FUNCTIONS = /* glsl */ `
    float paintHash(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
    }
    float paintNoise(vec3 p) {
        vec3 cell = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(paintHash(cell), paintHash(cell + vec3(1,0,0)), f.x),
                       mix(paintHash(cell + vec3(0,1,0)), paintHash(cell + vec3(1,1,0)), f.x), f.y),
                   mix(mix(paintHash(cell + vec3(0,0,1)), paintHash(cell + vec3(1,0,1)), f.x),
                       mix(paintHash(cell + vec3(0,1,1)), paintHash(cell + vec3(1,1,1)), f.x), f.y), f.z);
    }
    vec3 paintNoiseColour(vec3 p) {
        return vec3(paintNoise(p), paintNoise(p + 19.1), paintNoise(p + 47.7));
    }
    vec3 paintHsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        return vec3(abs(q.z + (q.w-q.y)/(6.0*d+0.00001)), d/(q.x+0.00001), q.x);
    }
    vec3 paintRgb(vec3 c) {
        vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0))*6.0-3.0);
        return c.z * mix(vec3(1.0), clamp(p-1.0, 0.0, 1.0), clamp(c.y, 0.0, 1.0));
    }
    vec3 ghibliLeaves(vec3 pigment, vec3 direction, vec3 position) {
        vec3 p = position * 0.25;
        // LeavesNormal_GN is sampled from the rounded source, never the card's facing.
        vec3 warp = paintNoiseColour(p * 2.3 + paintNoiseColour(p * 2.3) * 2.0);
        vec3 grain = paintNoiseColour(p * 5.9 + paintNoiseColour(p * 5.9) * 0.4);
        vec3 n = normalize(direction) * warp * grain;
        vec3 sun = normalize(vec3(-0.818, 0.575, 0.0));
        float shade = clamp(max(dot(normalize(n + vec3(-0.16, 0.06, 0.0)), sun), 0.0) * 0.8 / (3.14159265 * 0.27727279), 0.0, 1.0);
        float highlight = clamp(max(dot(normalize(n + vec3(0.0, 0.0, -0.09)), sun), 0.0) * 0.8 / (3.14159265 * 0.28636363), 0.0, 1.0);
        float variation = clamp((paintNoise(p * 0.5) - 0.42) / 0.29, 0.0, 1.0) * 0.3;
        vec3 hsv = paintHsv(pigment);
        vec3 warm = paintRgb(hsv + vec3(-0.08, 0.0, 0.0));
        vec3 base = mix(pigment, warm, variation);
        float pigmentStrength = max(max(base.r, base.g), base.b) / 0.622255;
        vec3 blue = clamp(base + pigmentStrength * 0.25833333 * (2.0 * vec3(0.0, 0.016091, 0.607717) - 1.0), 0.0, 1.0);
        float green = clamp((base.g - max(base.r, base.b)) * 8.0, 0.0, 1.0);
        blue = mix(blue, max(max(base.r, base.g), base.b) * vec3(0.015, 0.28, 0.65), green * 0.8);
        vec3 lit = base * shade;
        vec3 shadow = mix(lit, max(lit, blue), 1.0 - shade);
        vec3 brightHsv = paintHsv(base * highlight);
        brightHsv.x += 0.03;
        brightHsv.y *= 2.0;
        brightHsv.z *= 1.47;
        return max(shadow, paintRgb(brightHsv));
    }
    vec3 ghibliWood(vec3 pigment, vec3 direction) {
        float diffuseLight = max(dot(normalize(direction), normalize(vec3(-0.818, 0.575, 0.0))), 0.0) * 0.8 / 3.14159265;
        float shade = clamp((diffuseLight - 0.05909092) / 0.05, 0.0, 1.0);
        vec3 overlay = pigment * 2.0 * vec3(0.0223, 0.066454, 0.223);
        vec3 cool = mix(pigment, overlay, 0.75);
        vec3 lit = pigment * shade;
        return mix(lit, max(lit, cool), 1.0 - shade);
    }
`
