attribute vec3 aPosition;

uniform mat4 uViewMatrix;
uniform mat4 uProjMatrix;

varying vec3 vPosition;

void main(void) {
  vPosition = aPosition;
  // remove transform component
  mat4 rotViewMatrix = mat4(mat3(uViewMatrix));
  vec4 clipPos = uProjMatrix * rotViewMatrix * vec4(aPosition, 1.0);
  // expand to edge of clip space
  gl_Position = clipPos.xyww;
}