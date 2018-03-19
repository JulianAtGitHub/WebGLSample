import { DataType, TextureType } from "./model";
import { GLSystem } from "./gl-system";
import { Program } from "./program";

export function CreatePhoneProgram(glSystem: GLSystem): Program {
  const program = new Program(glSystem, {
    vertFile: "assets/shaders/phong.vs",
    fragFile: "assets/shaders/phong.fs",
    attributes: {
      "a_position": DataType.Float3,
      "a_normal": DataType.Float3,
      "a_texCoord": DataType.Float2
    },
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
    attributes: {
      "a_position": DataType.Float3
    },
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
    attributes: {
      "a_position": DataType.Float3,
      "a_normal": DataType.Float3,
      "a_texCoord": DataType.Float2
    },
    uniforms: {
      textures: {
        "u_normalMap": TextureType.Texture2D,
        "u_albedoMap": TextureType.Texture2D,
        "u_metallicMap": TextureType.Texture2D,
        "u_roughnessMap": TextureType.Texture2D,
        "u_aoMap": TextureType.Texture2D,
        "u_irradianceMap": TextureType.TextureCubeMap
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

export function CreateDebugTexture2DProgram(glSystem: GLSystem): Program {
  const program = new Program(glSystem, {
    vertFile: "assets/shaders/debug/texture2d.vs",
    fragFile: "assets/shaders/debug/texture2d.fs",
    attributes: {
      "a_position": DataType.Float3,
      "a_texCoord": DataType.Float2
    },
    uniforms: {
      textures: { "u_texture2D": TextureType.Texture2D },
      others: { }
    }
  });

  return program;
}
