precision mediump float;

varying vec3 v_position;
varying vec3 v_normal;
varying vec2 v_texCoord;

uniform vec3 u_viewPos;
uniform vec3 u_lightPos;
uniform sampler2D u_diffuseMap;

void main(void) {
  vec3 color = texture2D(u_diffuseMap, v_texCoord).rgb;
  // ambient
  vec3 ambient = 0.05 * color;
  // diffuse
  vec3 lightDir = normalize(u_lightPos - v_position);
  vec3 normal = normalize(v_normal);
  float diff = max(dot(lightDir, normal), 0.0);
  vec3 diffuse = diff * color;
  // specular
  vec3 viewDir = normalize(u_viewPos - v_position);
  vec3 halfwayDir = normalize(lightDir + viewDir);  
  float spec = pow(max(dot(normal, halfwayDir), 0.0), 32.0);
  vec3 specular = spec * vec3(0.3); // assuming bright white light color

  gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
}
