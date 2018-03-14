precision mediump float;

varying vec3 vPosition;

#ifdef USE_SPHERICAL_MAP

uniform sampler2D uSphericalMap;

const vec2 invAtan = vec2(0.1591, 0.3183);

vec2 SampleSphericalMap(vec3 v) {
  vec2 uv = vec2(atan(v.z, v.x), asin(v.y));
  uv *= invAtan;
  uv += 0.5;
  return uv;
}

void main(void) {
  vec2 uv = SampleSphericalMap(normalize(vPosition));
  vec3 color = texture2D(uSphericalMap, uv).rgb;

  gl_FragColor = vec4(color, 1.0);
}

#else

uniform samplerCube uCubeMap;

void main(void) {
  gl_FragColor = textureCube(uCubeMap, normalize(vPosition));
}

#endif