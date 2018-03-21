precision mediump float;

// environment cube map to irradiance cube map

uniform samplerCube u_envMap;

in vec3 v_position;

out vec4 o_fragColor;

const float PI = 3.14159265359;
const float PI_2 = 1.570796326795; // PI / 2.0
const float PI2 = 6.28318530718;  // PI * 2.0
const float sampleDelta = 0.025;

void main(void) {
  // The world vector acts as the normal of a tangent surface from the origin, aligned to vPosition. 
  // Given this normal, calculate all incoming radiance of the environment. 
  // The result of this radiance is the radiance of light coming from -Normal direction, 
  // which is what we use in the PBR shader to sample irradiance.
  vec3 N = normalize(v_position);
  vec3 irradiance = vec3(0.0);

  // tangent sapce calculation from origin point
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 right = cross(up, N);
  up = cross(N, right);

  // calculation irradiance
  float nrSamples = 0.0;
  for (float phi = 0.0; phi < PI2; phi += sampleDelta) {
    for (float theta = 0.0; theta < PI_2; theta += sampleDelta) {
      vec3 tangentSample = vec3(sin(theta) * cos(phi),  sin(theta) * sin(phi), cos(theta));
      vec3 worldSample = tangentSample.x * right + tangentSample.y * up + tangentSample.z * N;
      irradiance += texture(u_envMap, worldSample).rgb * cos(theta) * sin(theta);
      nrSamples ++;
    }
  }

  irradiance = PI * irradiance * (1.0 / nrSamples);
  o_fragColor = vec4(irradiance, 1.0);
}
