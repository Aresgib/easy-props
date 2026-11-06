shader_type spatial;
render_mode unshaded;

uniform sampler2D surface_texture : source_color, filter_linear_mipmap, repeat_disable;
uniform float cut_off : hint_range(0.0, 1.0) = 0.5;
uniform int appearance : hint_range(1, 4) = 1;
uniform bool paint_foliage = true;
uniform float wind_amount : hint_range(0.0, 2.0) = 1.0;
uniform vec3 wind_direction = vec3(1.0, 0.0, 0.3);
varying vec3 painted_direction;
varying vec3 painted_position;

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

void vertex() {
    painted_direction = MODEL_NORMAL_MATRIX * NORMAL;
    vec3 original_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
    painted_position = original_position;
    vec3 origin = MODEL_MATRIX[3].xyz;
    float phase = dot(origin.xz, vec2(0.37, 0.53));
    float wave = sin(TIME * 1.1 + phase) + 0.4 * sin(TIME * 2.53 + phase);
    vec3 push = normalize(wind_direction) * wave * UV2.x * 0.25;
    VERTEX += (inverse(MODEL_MATRIX) * vec4(push * wind_amount, 0.0)).xyz;
    float local_phase = dot(original_position, vec3(3.1, 2.3, 3.7));
    VERTEX += NORMAL * sin(TIME * 5.0 + local_phase) * UV2.y * 0.04 * wind_amount;
}

void fragment() {
    vec4 surface = texture(surface_texture, UV);
    vec3 paint = surface.rgb * COLOR.rgb;
    if (appearance == 1) {
        float shade = smoothstep(-0.6, 0.8, dot(normalize(painted_direction), normalize(vec3(-0.45, 0.82, 0.35))));
        paint *= mix(vec3(0.48, 0.62, 0.68), vec3(1.18, 1.12, 1.02), shade);
    } else {
        if (cut_off > 0.0) {
            float grain = dot(surface.rgb, vec3(0.2126, 0.7152, 0.0722));
            paint /= mix(1.0, max(grain, 0.3), 0.8);
        }
        float shade = smoothstep(-0.6, 0.8, dot(normalize(painted_direction), normalize(vec3(-0.45, 0.82, 0.35))));
        if (appearance == 4) {
            if (paint_foliage) {
                paint = ghibliLeaves(paint, painted_direction, painted_position);
            } else {
                paint = ghibliWood(paint, painted_direction);
            }
        } else {
        float blend_width = clamp(fwidth(shade) * 0.65, 0.004, 0.035);
        float middle = smoothstep(0.42 - blend_width, 0.42 + blend_width, shade);
        float highlight = smoothstep(0.76 - blend_width, 0.76 + blend_width, shade);
        vec3 light = mix(vec3(0.56, 0.72, 0.78), vec3(0.94, 0.98, 1.0), middle);
        paint *= mix(light, vec3(1.2, 1.14, 1.02), highlight);
        }
        if (appearance == 3) {
            if (cut_off > 0.0) {
                float edge = 1.0 - smoothstep(cut_off, min(cut_off + 0.16, 1.0), surface.a);
                paint *= 1.0 - edge * 0.4;
            } else {
                vec3 direction_to_camera = normalize(mat3(INV_VIEW_MATRIX) * VIEW);
                float facing = abs(dot(normalize(painted_direction), direction_to_camera));
                float edge = 1.0 - smoothstep(0.015, 0.08, facing);
                paint *= 1.0 - edge * 0.48;
            }
        }
    }
    // Compatibility's unshaded output uses display colours; imported colours are linear.
    if (OUTPUT_IS_SRGB) {
        paint = mix(paint * 12.92, 1.055 * pow(max(paint, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), paint));
    }
    ALBEDO = paint;
    ALPHA = surface.a;
    ALPHA_SCISSOR_THRESHOLD = max(cut_off, 0.001);
}
