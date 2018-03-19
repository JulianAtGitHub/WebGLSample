// full environment cube map to pre-filtering environment cube map
#extension GL_EXT_shader_texture_lod : enable
precision mediump float;

varying vec3 v_position;

uniform samplerCube u_envMap;

uniform float u_roughness;
uniform float u_resolution;

const float PI = 3.14159265359;
const float PI2 = 6.28318530718;  // PI * 2.0
const int SAMPLE_COUNT = 1024;

float VanDerCorpus(int n, int base) {
  float invBase = 1.0 / float(base);
  float denom = 1.0;
  float result = 0.0;

  for (int i = 0; i < 32; ++i) {
    if (n > 0) {
      denom = mod(float(n), 2.0);
      result += denom * invBase;
      invBase = invBase / 2.0;
      n = int(float(n) / 2.0);
    }
  }

  return result;
}

vec2 Hammersley(int i, int N) {
  return vec2(float(i)/float(N), VanDerCorpus(i, 2));
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
  for (int i = 0; i < SAMPLE_COUNT; ++i) {
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

      prefilteredColor += textureCubeLodEXT(u_envMap, L, mipLevel).rgb * NdotL;
      totalWeight += NdotL;
    }
  }

  prefilteredColor /= totalWeight;
  gl_FragColor = vec4(prefilteredColor, 1.0);
}
