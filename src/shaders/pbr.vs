uniform mat4 u_modelMatrix;
uniform mat3 u_normalMatrix;
uniform mat4 u_viewProjMatrix;

layout (location = 0) in vec3 a_position;
layout (location = 1) in vec3 a_normal;
layout (location = 2) in vec2 a_texCoord;

out vec3 v_position;
out vec3 v_normal;
out vec2 v_texCoord;

void main(void) {
  vec4 position = u_modelMatrix * vec4(a_position, 1.0);
  gl_Position = u_viewProjMatrix * position;

  v_position = position.xyz;
  v_normal = u_normalMatrix * a_normal;
  v_texCoord = a_texCoord;
}