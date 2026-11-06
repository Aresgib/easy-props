shader_type spatial;
render_mode unshaded;

uniform sampler2D surface_texture : source_color, filter_linear_mipmap, repeat_disable;
uniform float cut_off : hint_range(0.0, 1.0) = 0.5;
uniform int appearance : hint_range(1, 4) = 1;
uniform bool paint_foliage = true;
uniform float wind_amount : hint_range(0.0, 2.0) = 1.0;
uniform vec3 wind_direction = vec3(1.0, 0.0, 0.3);
varying vec3 painted_direction;

void vertex() {
    painted_direction = MODEL_NORMAL_MATRIX * NORMAL;
    vec3 original_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
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
            vec3 shadow = paint * vec3(0.47, 0.66, 0.72);
            vec3 sunlight = paint * vec3(1.35, 1.22, 0.85);
            if (paint_foliage) {
                float green = clamp((paint.g - max(paint.r, paint.b)) * 4.0, 0.0, 1.0);
                float value = dot(paint, vec3(0.2126, 0.7152, 0.0722));
                shadow = mix(paint * vec3(0.52, 0.72, 0.98), value * vec3(0.025, 0.4, 0.75), green * 0.75);
                sunlight = mix(paint * vec3(1.22, 1.2, 0.87), value * vec3(1.6, 1.65, 0.35), green * 0.3);
            }
            paint = mix(shadow, sunlight, smoothstep(0.18, 0.9, shade));
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
