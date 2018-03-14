attribute vec3 aPosition;

uniform mat4 uViewProjMatrix;

varying vec3 vPosition;

void main(void) {
  vPosition = aPosition;
  gl_Position = uViewProjMatrix * vec4(aPosition, 1.0);
}