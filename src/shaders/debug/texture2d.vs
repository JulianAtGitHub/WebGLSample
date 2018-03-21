layout (location = 0) in vec3 a_position;
layout (location = 1) in vec2 a_texCoord;

out vec2 v_texCoord;

void main(void) {
  v_texCoord = a_texCoord;
  gl_Position = vec4(a_position, 1.0); 
}