precision mediump float;

varying vec2 v_texCoord;

uniform sampler2D u_texture2D;

void main(void) {
  vec3 color = texture2D(u_texture2D, v_texCoord).rgb;
  gl_FragColor = vec4(color, 1.0);
}