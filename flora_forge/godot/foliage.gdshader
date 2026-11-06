shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_opaque;

uniform sampler2D foliage_atlas : source_color, filter_linear_mipmap, repeat_disable;
uniform float alpha_cutoff : hint_range(0.05, 0.95) = 0.45;
uniform float wind_strength : hint_range(0.0, 1.0) = 0.12;
uniform float wind_speed : hint_range(0.0, 5.0) = 1.6;
uniform vec2 wind_direction = vec2(1.0, 0.35);
uniform bool cel_shading = false;
uniform vec4 shadow_tint : source_color = vec4(0.205984, 0.516881, 0.473121, 1.0);
uniform vec3 light_direction = vec3(-0.45, 0.82, 0.35);
varying vec3 crown_normal_world;

vec3 ff_srgb_to_linear(vec3 c) {
    return mix(c / 12.92, pow((c + vec3(0.055)) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}

vec3 ff_linear_to_srgb(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - vec3(0.055), step(vec3(0.0031308), c));
}

void vertex() {
    // Carry authored normals independently of backface handling.
    crown_normal_world = normalize(MODEL_NORMAL_MATRIX * NORMAL);
    vec3 world_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
    float wave = sin(TIME * wind_speed + dot(world_position.xz, vec2(0.37, 0.21)));
    float flutter = sin(TIME * wind_speed * 2.3 + UV.x * 6.283185) * 0.18;
    vec3 world_offset = vec3(wind_direction.x, 0.12, wind_direction.y)
        * (wave + flutter) * wind_strength * UV2.x;
    VERTEX += (inverse(MODEL_MATRIX) * vec4(world_offset, 0.0)).xyz;
}

void fragment() {
    vec4 texel = texture(foliage_atlas, UV);
    vec3 direction = length(light_direction) > 0.0001 ? normalize(light_direction) : vec3(0.0, 1.0, 0.0);
    float shade = smoothstep(-0.6, 0.8, dot(normalize(crown_normal_world), direction));
    if (cel_shading) {
        shade = shade > 0.72 ? 1.0 : (shade > 0.45 ? 0.55 : 0.15);
    }
    bool petals = UV.x > 0.5 && UV.y < 0.5;
    vec3 shadow_color = shadow_tint.rgb;
    vec3 texture_color = texel.rgb;
    // glTF vertex colors are linear. Compatibility renders unshaded color in sRGB.
    if (OUTPUT_IS_SRGB) {
        shadow_color = ff_srgb_to_linear(shadow_color);
        texture_color = ff_srgb_to_linear(texture_color);
    }
    if (petals) { shadow_color = COLOR.rgb * 0.45; }
    vec3 paint = texture_color * mix(shadow_color, COLOR.rgb, shade);
    ALBEDO = OUTPUT_IS_SRGB ? ff_linear_to_srgb(paint) : paint;
    ALPHA = texel.a;
    ALPHA_SCISSOR_THRESHOLD = alpha_cutoff;
}
