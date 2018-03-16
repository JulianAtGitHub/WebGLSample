attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_texCoord;

uniform mat4 u_modelMatrix;
uniform mat3 u_normalMatrix;
uniform mat4 u_viewProjMatrix;

varying vec3 v_position;
varying vec3 v_normal;
varying vec2 v_texCoord;

void main(void) {
  vec4 position = u_modelMatrix * vec4(aPosition, 1.0);
  gl_Position = u_viewProjMatrix * position;

  v_position = position.xyz;
  v_normal = u_normalMatrix * aNormal;
  v_texCoord = a_texCoord;
}