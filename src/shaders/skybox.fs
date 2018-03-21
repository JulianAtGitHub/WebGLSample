precision mediump float;

uniform samplerCube u_envMap;

in vec3 v_position;

out vec4 o_fragColor;

void main(void) {
  vec3 envColor = texture(u_envMap, v_position).rgb;

  // HDR tonemap
  envColor = envColor / (envColor + vec3(1.0));
  // gamma correction
  envColor = pow(envColor, vec3(1.0 / 2.2));

  o_fragColor = vec4(envColor, 1.0);
}