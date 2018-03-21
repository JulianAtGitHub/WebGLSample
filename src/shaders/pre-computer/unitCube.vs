uniform mat4 u_viewProjMatrix;

layout (location = 0) in vec3 a_position;

out vec3 v_position;

void main(void) {
  v_position = a_position;
  gl_Position = u_viewProjMatrix * vec4(a_position, 1.0);
}
