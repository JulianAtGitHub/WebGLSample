precision mediump float;

// full environment cube map to pre-filtering environment cube map

uniform samplerCube u_envMap;

uniform float u_roughness;
uniform float u_resolution;

in vec3 v_position;

out vec4 o_fragColor;

const float PI = 3.14159265359;
const float PI2 = 6.28318530718;  // PI * 2.0
const uint SAMPLE_COUNT = 1024u;

// http://holger.dammertz.org/stuff/notes_HammersleyOnHemisphere.html
// Efficient VanDerCorpus calculation.
float RadicalInverse_VdC(uint bits) 
{
     bits = (bits << 16u) | (bits >> 16u);
     bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
     bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
     bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
     bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
     return float(bits) * 2.3283064365386963e-10; // / 0x100000000
}

vec2 Hammersley(uint i, uint N) {
  return vec2(float(i)/float(N), RadicalInverse_VdC(i));
}

vec3 ImportanceSampleGGX(vec2 Xi, vec3 N, float roughness) {
  float a = roughness * roughness;

  float phi = PI2 * Xi.x;
  float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a * a - 1.0) * Xi.y));
  float sinTheta = sqrt(1.0 - cosTheta * cosTheta);

  // from spherical coordinates to cartesian coordinates
  vec3 H = vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);

  // from tangent-space vector to world-space sample vector
  vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(up, N));
  vec3 bitangent = cross(N, tangent);

  vec3 sampleVec = tangent * H.x + bitangent * H.y + N * H.z;
  return normalize(sampleVec);
}

float DistributionGGX(float NdotH, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH2 = NdotH * NdotH;

  float nom = a2;
  float denom = NdotH2 * (a2 - 1.0) + 1.0;
  denom = PI * denom * denom;

  return nom / denom;
}

void main(void) {
  vec3 N = normalize(v_position);
  vec3 R = N;
  vec3 V = R;

  float totalWeight = 0.0;
  vec3 prefilteredColor = vec3(0.0);
  for (uint i = 0u; i < SAMPLE_COUNT; ++i) {
    vec2 Xi = Hammersley(i, SAMPLE_COUNT);
    vec3 H = ImportanceSampleGGX(Xi, N, u_roughness);
    vec3 L = normalize(2.0 * dot(V, H) * H - V);

    float NdotL = max(dot(N, L), 0.0);
    if (NdotL > 0.0) {
      // sample from the environment's mip level based on roughness/pdf
      float NdotH = max(dot(N, H), 0.0);
      float D = DistributionGGX(NdotH, u_roughness);
      float HdotV = max(dot(H, V), 0.0);
      float pdf = D * NdotH / (4.0 * HdotV) + 0.0001;

      float saTexel = 4.0 * PI / (6.0 * u_resolution * u_resolution);
      float saSample = 1.0 / (float(SAMPLE_COUNT) * pdf + 0.0001);
      float mipLevel = u_roughness == 0.0 ? 0.0 : 0.5 * log2(saSample / saTexel);

      prefilteredColor += textureLod(u_envMap, L, mipLevel).rgb * NdotL;
      totalWeight += NdotL;
    }
  }

  prefilteredColor /= totalWeight;
  o_fragColor = vec4(prefilteredColor, 1.0);
}
