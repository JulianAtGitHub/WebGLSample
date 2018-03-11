attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModelMatrix;
uniform mat3 uNormalMatrix;
uniform mat4 uViewProjMatrix;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vTexCoord;

void main(void) {
  vec4 position = uModelMatrix * vec4(aPosition, 1.0);
  gl_Position = uViewProjMatrix * position;

  vPosition = position.xyz;
  vNormal = uNormalMatrix * aNormal;
  vTexCoord = aTexCoord;
}