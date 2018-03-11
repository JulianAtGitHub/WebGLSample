precision mediump float;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vTexCoord;

uniform vec3 uViewPos;
uniform vec3 uLightPos;
uniform sampler2D uDiffuseMap;

void main(void) {
  vec3 color = texture2D(uDiffuseMap, vTexCoord).rgb;
  // ambient
  vec3 ambient = 0.05 * color;
  // diffuse
  vec3 lightDir = normalize(uLightPos - vPosition);
  vec3 normal = normalize(vNormal);
  float diff = max(dot(lightDir, normal), 0.0);
  vec3 diffuse = diff * color;
  // specular
  vec3 viewDir = normalize(uViewPos - vPosition);
  vec3 halfwayDir = normalize(lightDir + viewDir);  
  float spec = pow(max(dot(normal, halfwayDir), 0.0), 32.0);
  vec3 specular = spec * vec3(0.3); // assuming bright white light color

  gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
}
