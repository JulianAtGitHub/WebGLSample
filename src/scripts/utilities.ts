import { DataType, TextureType, Model, CreateSphere } from "./model";
import { GLSystem } from "./gl-system";
import { Program } from "./program";
import { Drawable } from "./drawable";
import { vec3 } from "gl-matrix";

export function CreatePhoneProgram(glSystem: GLSystem): Program {
  const program = new Program(glSystem, {
    vertFile: "assets/shaders/phong.vs",
    fragFile: "assets/shaders/phong.fs",
    uniforms: {
      textures: {
        "u_diffuseMap": TextureType.Texture2D
      },
      others: {
        "u_modelMatrix": DataType.Float4x4,
        "u_normalMatrix": DataType.Float3x3,
        "u_viewProjMatrix": DataType.Float4x4,
        "u_viewPos": DataType.Float3,
        "u_lightPos": DataType.Float3
      }
    }
  });

  return program;
}

export function CreateSkyboxProgram(glSystem: GLSystem): Program {
  const program = new Program(glSystem, {
    vertFile: "assets/shaders/skybox.vs",
    fragFile: "assets/shaders/skybox.fs",
    uniforms: {
      textures: {
        "u_envMap": TextureType.TextureCubeMap
      },
      others: {
        "u_viewMatrix": DataType.Float4x4,
        "u_projMatrix": DataType.Float4x4
      }
    }
  });

  return program;
}

export function CreatePbrProgram(glSystem: GLSystem): Program {
  const program = new Program(glSystem, {
    vertFile: "assets/shaders/pbr.vs",
    fragFile: "assets/shaders/pbr.fs",
    macros: ["#define HAS_PBR_TEXTURES"],
    uniforms: {
      textures: {
        "u_normalMap": TextureType.Texture2D,
        "u_albedoMap": TextureType.Texture2D,
        "u_metallicMap": TextureType.Texture2D,
        "u_roughnessMap": TextureType.Texture2D,
        "u_aoMap": TextureType.Texture2D,
        "u_irradianceMap": TextureType.TextureCubeMap,
        "u_prefilterMap": TextureType.TextureCubeMap,
        "u_brdfMap": TextureType.Texture2D
      },
      others: {
        "u_modelMatrix": DataType.Float4x4,
        "u_normalMatrix": DataType.Float3x3,
        "u_viewProjMatrix": DataType.Float4x4,
        "u_viewPos": DataType.Float3,
        "u_lightPos": DataType.Float3,
        "u_lightColor": DataType.Float3
      }
    }
  });

  return program;
}

export function CreatePbrNoTexturedProgram(glSystem: GLSystem): Program {
  const program = new Program(glSystem, {
    vertFile: "assets/shaders/pbr.vs",
    fragFile: "assets/shaders/pbr.fs",
    uniforms: {
      textures: {
        "u_irradianceMap": TextureType.TextureCubeMap,
        "u_prefilterMap": TextureType.TextureCubeMap,
        "u_brdfMap": TextureType.Texture2D
      },
      others: {
        "u_modelMatrix": DataType.Float4x4,
        "u_normalMatrix": DataType.Float3x3,
        "u_viewProjMatrix": DataType.Float4x4,
        "u_viewPos": DataType.Float3,
        "u_lightPos": DataType.Float3,
        "u_lightColor": DataType.Float3,
        "u_albedo": DataType.Float3,
        "u_metallic": DataType.Float,
        "u_roughness": DataType.Float,
        "u_ao": DataType.Float,
      }
    }
  });

  return program;
}

export function CreateDebugTexture2DProgram(glSystem: GLSystem): Program {
  const program = new Program(glSystem, {
    vertFile: "assets/shaders/debug/texture2d.vs",
    fragFile: "assets/shaders/debug/texture2d.fs",
    uniforms: {
      textures: { "u_texture2D": TextureType.Texture2D },
      others: { }
    }
  });

  return program;
}

export function CreateGoldenSphere(glSystem: GLSystem): Drawable {
  const sphereModel = CreateSphere();
  sphereModel.albedoMap = "assets/gold_albedo.png";
  sphereModel.normalMap = "assets/gold_normal.png";
  sphereModel.metallicMap = "assets/gold_metallic.png";
  sphereModel.roughnessMap = "assets/gold_roughness.png";
  sphereModel.aoMap = "assets/gold_ao.png";

  const sphere = new Drawable(sphereModel, glSystem);
  return sphere;
}

export function CreateIronSphere(glSystem: GLSystem): Drawable {
  const sphereModel = CreateSphere();
  sphereModel.albedoMap = "assets/iron_albedo.png";
  sphereModel.normalMap = "assets/iron_normal.png";
  sphereModel.metallicMap = "assets/iron_metallic.png";
  sphereModel.roughnessMap = "assets/iron_roughness.png";
  sphereModel.aoMap = "assets/iron_ao.png";

  const sphere = new Drawable(sphereModel, glSystem);
  return sphere;
}

export function CreatePlasticSphere(glSystem: GLSystem): Drawable {
  const sphereModel = CreateSphere();
  sphereModel.albedoMap = "assets/plastic_albedo.png";
  sphereModel.normalMap = "assets/plastic_normal.png";
  sphereModel.metallicMap = "assets/plastic_metallic.png";
  sphereModel.roughnessMap = "assets/plastic_roughness.png";
  sphereModel.aoMap = "assets/plastic_ao.png";

  const sphere = new Drawable(sphereModel, glSystem);
  return sphere;
}

export function CreateNoTexturedSphere(glSystem: GLSystem): Drawable {
  const sphereModel = CreateSphere();
  sphereModel.albedo = vec3.fromValues(1.0, 1.0, 1.0);
  sphereModel.metallic = 0.5;
  sphereModel.roughness = 0.5;
  sphereModel.ao = 0.5;
  const sphere = new Drawable(sphereModel, glSystem);
  return sphere;
}
