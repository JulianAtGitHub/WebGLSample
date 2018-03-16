precision mediump float;

varying vec3 v_position;

uniform samplerCube u_envMap;

void main(void) {
  vec3 envColor = textureCube(u_envMap, v_position).rgb;

  // HDR tonemap
  envColor = envColor / (envColor + vec3(1.0));
  // gamma correction
  envColor = pow(envColor, vec3(1.0 / 2.2));

  gl_FragColor = vec4(envColor, 1.0);
}