#extension GL_OES_standard_derivatives : enable
precision mediump float;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vTexCoord;

// material
uniform sampler2D uNormalMap;
uniform sampler2D uAlbedoMap;
uniform sampler2D uMetallicMap;
uniform sampler2D uRoughnessMap;
uniform sampler2D uAOMap;

// light
uniform vec3 uLightPos;
uniform vec3 uLightColor;

uniform vec3 uViewPos;

const float PI = 3.14159265359;

// Easy trick to get tangent-normals to world-space to keep PBR code simplified.
vec3 NormalFromTexture() {
  vec3 tangentNormal = texture2D(uNormalMap, vTexCoord).xyz * 2.0 - 1.0;

  vec3 Q1 = dFdx(vPosition);
  vec3 Q2 = dFdy(vPosition);
  vec2 st1 = dFdx(vTexCoord);
  vec2 st2 = dFdy(vTexCoord);

  vec3 N = normalize(vNormal);
  vec3 T = normalize(Q1 * st2.t - Q2 * st1.t);
  vec3 B = -normalize(cross(N, T));
  mat3 TBN = mat3(T, B, N);

  return normalize(TBN * tangentNormal);
}

vec3 HDRToneMapping(vec3 color) {
  return color / (color + vec3(1.0));
}

vec3 GammaCorrect(vec3 color) {
  return pow(color, vec3(1.0 / 2.2));
}

// D, G, F formula is refered from http://graphicrants.blogspot.tw/2013/08/specular-brdf-reference.html

// GGX Trowbridge-Reitz
float DistributionGGX(float NdotH, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH2 = NdotH * NdotH;

  float nom = a2;
  float denom = NdotH2 * (a2 - 1.0) + 1.0;
  denom = PI * denom * denom;

  return nom / denom;
}

// Smith's Schlick-GGX with k = (a + 1)2 / 8
float GeometrySchlickGGX(float NdotV, float roughness) {
  float r = roughness + 1.0;
  float k = (r * r) / 8.0;

  float nom = NdotV;
  float denom = NdotV * (1.0 - k) + k;

  return nom / denom;
}

float GeometrySmith(float NdotV, float NdotL, float roughness) {
  float ggx1 = GeometrySchlickGGX(NdotV, roughness);
  float ggx2 = GeometrySchlickGGX(NdotL, roughness);

  return ggx1 * ggx2;
}

// Fresnel-Schlick
vec3 FresnelSchlick(float cosTheta, vec3 f0) {
  return f0 + (1.0 - f0) * pow(1.0 - cosTheta, 5.0);
}

void main(void) {
  vec3 albedo = pow(texture2D(uAlbedoMap, vTexCoord).rgb, vec3(2.2));
  float metallic = texture2D(uMetallicMap, vTexCoord).r;
  float roughness = texture2D(uRoughnessMap, vTexCoord).r;
  float ao = texture2D(uAOMap, vTexCoord).r;

  vec3 N = NormalFromTexture();
  // vec3 N = normalize(vNormal);
  vec3 V = normalize(uViewPos - vPosition);

  vec3 L = normalize(uLightPos - vPosition);
  vec3 H = normalize(V + L);

  float NdotH = max(dot(N, H), 0.0);
  float NdotV = max(dot(N, V), 0.0);
  float NdotL = max(dot(N, L), 0.0);

  // vec3 Lo = vec3(0.0);

  // calculate light radiance
  float distance = length(uLightPos - vPosition);
  float attenuation = 1.0 / (distance);
  vec3 radiance = uLightColor * attenuation;

  // Calculate reflectance at normal incidence; 
  // If dia-electric (like plastic) use F0 of 0.04
  // And if it's a metal, use the albedo color as F0 (metal workflow)
  vec3 f0 = vec3(0.4);
  f0 = mix(f0, albedo, metallic);

  // BRDF of Cook-Torrance
  float D = DistributionGGX(NdotH, roughness);
  float G = GeometrySmith(NdotV, NdotL, roughness);
  vec3 F = FresnelSchlick(max(dot(H, V), 0.0), f0);

  vec3 nom = D * G * F;
  float denom = 4.0 * NdotV * NdotL + 0.001;
  vec3 specular = nom / denom;

  // kS is equal to Fresnel
  vec3 kS = F;
  // For energy conservation, the diffuse and specular light can't be above 1.0; 
  // To preserve this relationship the diffuse component (kD) should equal 1.0 - kS.
  vec3 kD = vec3(1.0) - kS;
  // Multiply kD by the inverse metalness such that only non-metals have diffuse lighting.
  kD *= 1.0 - metallic;

  // note that we already multiplied the BRDF by the Fresnel (kS) so we won't multiply by kS again
  vec3 Lo = (kD * albedo / PI + specular) * radiance * NdotL;

  vec3 ambient = vec3(0.03) * albedo * ao;

  vec3 color = ambient + Lo;
  
  color = HDRToneMapping(color);
  color = GammaCorrect(color);
  gl_FragColor = vec4(color, 1.0);
}