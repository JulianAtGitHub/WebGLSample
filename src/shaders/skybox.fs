varying vec3 vPosition;

uniform samplerCube uEnvMap;

void main(void) {
  vec3 envColor = textureCube(uEnvMap, vPosition).rgb;

  // HDR tonemap
  envColor = envColor / (envColor + vec3(1.0));
  // gamma correction
  envColor = pow(envColor, vec3(1.0 / 2.2));

  gl_FragColor = vec4(envColor, 1.0);
}