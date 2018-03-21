precision mediump float;

uniform sampler2D u_texture2D;

in vec2 v_texCoord;

out vec4 o_fragColor;

void main(void) {
  vec3 color = texture(u_texture2D, v_texCoord).rgb;
  o_fragColor = vec4(color, 1.0);
}