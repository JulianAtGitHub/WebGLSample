// radiance spherical map to environment cube map

precision mediump float;

varying vec3 v_position;

uniform sampler2D u_sphereMap;

const vec2 invAtan = vec2(0.1591, 0.3183);

vec2 SampleSphereMap(vec3 v) {
  vec2 uv = vec2(atan(v.z, v.x), asin(v.y));
  uv *= invAtan;
  uv += 0.5;
  return uv;
}

void main(void) {
  vec2 uv = SampleSphereMap(normalize(v_position));
  vec3 color = texture2D(u_sphereMap, uv).rgb;
  gl_FragColor = vec4(color, 1.0);
}
