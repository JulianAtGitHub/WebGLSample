uniform mat4 u_viewMatrix;
uniform mat4 u_projMatrix;

layout (location = 0) in vec3 a_position;

out vec3 v_position;

void main(void) {
  v_position = a_position;
  // remove transform component
  mat4 rotViewMatrix = mat4(mat3(u_viewMatrix));
  vec4 clipPos = u_projMatrix * rotViewMatrix * vec4(a_position, 1.0);
  // expand to edge of clip space
  gl_Position = clipPos.xyww;
}