precision mediump float;

// radiance spherical map to environment cube map

uniform sampler2D u_sphereMap;

in vec3 v_position;

out vec4 o_fragColor;

const vec2 invAtan = vec2(0.1591, 0.3183);

vec2 SampleSphereMap(vec3 v) {
  vec2 uv = vec2(atan(v.z, v.x), asin(v.y));
  uv *= invAtan;
  uv += 0.5;
  return uv;
}

void main(void) {
  vec2 uv = SampleSphereMap(normalize(v_position));
  vec3 color = texture(u_sphereMap, uv).rgb;
  o_fragColor = vec4(color, 1.0);
}
