shader_type spatial;
render_mode unshaded, cull_back;

uniform vec3 light_direction = vec3(-0.45, 0.82, 0.35);
uniform sampler2D bark_atlas : source_color, filter_linear_mipmap, repeat_disable;
uniform bool textured_bark = false;
varying vec3 wood_normal_world;

vec3 ff_bark_srgb(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - vec3(0.055), step(vec3(0.0031308), c));
}

vec3 ff_bark_linear(vec3 c) {
    return mix(c / 12.92, pow((c + vec3(0.055)) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}

void vertex() {
    wood_normal_world = normalize(MODEL_NORMAL_MATRIX * NORMAL);
}

void fragment() {
    vec3 direction = length(light_direction) > 0.0001 ? normalize(light_direction) : vec3(0.0, 1.0, 0.0);
    float shade = 0.55 + 0.45 * (dot(normalize(wood_normal_world), direction) * 0.5 + 0.5);
    vec3 paint = COLOR.rgb * shade;
    if (textured_bark) {
        vec3 ink = texture(bark_atlas, UV).rgb;
        paint *= OUTPUT_IS_SRGB ? ff_bark_linear(ink) : ink;
    }
    ALBEDO = OUTPUT_IS_SRGB ? ff_bark_srgb(paint) : paint;
}
