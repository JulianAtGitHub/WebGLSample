attribute vec3 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main(void) {
  v_texCoord = a_texCoord;
  gl_Position = vec4(a_position, 1.0); 
}