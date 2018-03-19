precision mediump float;

varying vec2 v_texCoord;

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

// Smith's Schlick-GGX with k = a * a / 2
float GeometrySchlickGGX(float NdotV, float roughness) {
  float a = roughness;
  float k = (a * a) / 2.0;

  float nom = NdotV;
  float denom = NdotV * (1.0 - k) + k;

  return nom / denom;
}

float GeometrySmith(float NdotV, float NdotL, float roughness) {
  float ggx1 = GeometrySchlickGGX(NdotV, roughness);
  float ggx2 = GeometrySchlickGGX(NdotL, roughness);

  return ggx1 * ggx2;
}

vec2 IntegrateBRDF(float NdotV, float roughness) {
  vec3 V = vec3(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV);
  float A = 0.0;
  float B = 0.0;
  vec3 N = vec3(0.0, 0.0, 1.0);

  for (int i = 0; i < SAMPLE_COUNT; ++i) {
    // generates a sample vector that's biased towards the preferred alignment direction (importance sampling).
    vec2 Xi = Hammersley(i, SAMPLE_COUNT);
    vec3 H = ImportanceSampleGGX(Xi, N, roughness);
    vec3 L = normalize(2.0 * dot(V, H) * H - V);

    float NdotL = max(L.z, 0.0);
    float NdotH = max(H.z, 0.0);
    float VdotH = max(dot(V, H), 0.0);

    if (NdotL > 0.0) {
      float G = GeometrySmith(max(dot(N, V), 0.0), max(dot(N, L), 0.0), roughness);
      float G_Vis = (G * VdotH) / (NdotH * NdotV);
      float Fc = pow(1.0 - VdotH, 5.0);

      A += (1.0 - Fc) * G_Vis;
      B += Fc * G_Vis;
    }
  }

  A /= float(SAMPLE_COUNT);
  B /= float(SAMPLE_COUNT);

  return vec2(A, B);
}

void main(void) {
  vec2 integrateBRDF = IntegrateBRDF(v_texCoord.x, v_texCoord.y);
  gl_FragColor = vec4(integrateBRDF, 0.0, 1.0);
}