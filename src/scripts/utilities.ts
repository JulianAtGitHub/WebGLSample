import { DataType } from "./model";
import { ProgramInfo, Converter } from "./converter";

export function SetupPhongProgram(converter: Converter): ProgramInfo {
  const program: ProgramInfo = {
    program: null,
  };

  converter.CreateProgramFromFile("assets/phong.vs", "assets/phong.fs", (shaderProgram: WebGLProgram) => {
    const gl = converter.context;
    program.program = shaderProgram;
    program.attributes = {
      position: gl.getAttribLocation(shaderProgram, "aPosition"),
      normal: gl.getAttribLocation(shaderProgram, "aNormal"),
      texCoord: gl.getAttribLocation(shaderProgram, "aTexCoord")
    };
    program.uniforms = {};
    program.uniforms.transforms = {
      modelMatrix: {location: gl.getUniformLocation(shaderProgram, "uModelMatrix"), type: DataType.Float4x4},
      normalMatrix: {location: gl.getUniformLocation(shaderProgram, "uNormalMatrix"), type: DataType.Float3x3},
      viewProjMatrix: {location: gl.getUniformLocation(shaderProgram, "uViewProjMatrix"), type: DataType.Float4x4},
    };
    program.uniforms.others = {
      viewPosition: {location: gl.getUniformLocation(shaderProgram, "uViewPos"), type: DataType.Float3},
      lightPosition: {location: gl.getUniformLocation(shaderProgram, "uLightPos"), type: DataType.Float3}
    };
    program.uniforms.textures = {
      diffuseMap: {location: gl.getUniformLocation(shaderProgram, 'uDiffuseMap'), index: 0}
    };
  });

  return program;
}

export function SetupSkyboxProgram(converter: Converter): ProgramInfo {
  const program: ProgramInfo = {
    program: null,
  };

  converter.CreateProgramFromFile("assets/skybox.vs", "assets/skybox.fs", (shaderProgram: WebGLProgram) => {
    const gl = converter.context;
    program.program = shaderProgram;
    program.attributes = {
      position: gl.getAttribLocation(shaderProgram, "aPosition"),
    };
    program.uniforms = {};
    program.uniforms.transforms = {
      viewMatrix: {location: gl.getUniformLocation(shaderProgram, "uViewMatrix"), type: DataType.Float4x4},
      projMatrix: {location: gl.getUniformLocation(shaderProgram, "uProjMatrix"), type: DataType.Float4x4}
    };
    program.uniforms.others = {};
    program.uniforms.textures = {
      envMap: {location: gl.getUniformLocation(shaderProgram, 'uEnvMap'), index: 0}
    };
  });
  return program;
}

export function SetupPbrProgram(converter: Converter): ProgramInfo {
  const program: ProgramInfo = {
    program: null,
  };

  converter.CreateProgramFromFile("assets/pbr.vs", "assets/pbr.fs", (shaderProgram: WebGLProgram) => {
    const gl = converter.context;
    program.program = shaderProgram;
    program.attributes = {
      position: gl.getAttribLocation(shaderProgram, "aPosition"),
      normal: gl.getAttribLocation(shaderProgram, "aNormal"),
      texCoord: gl.getAttribLocation(shaderProgram, "aTexCoord")
    };
    program.uniforms = {};
    program.uniforms.transforms = {
      modelMatrix: {location: gl.getUniformLocation(shaderProgram, "uModelMatrix"), type: DataType.Float4x4},
      normalMatrix: {location: gl.getUniformLocation(shaderProgram, "uNormalMatrix"), type: DataType.Float3x3},
      viewProjMatrix: {location: gl.getUniformLocation(shaderProgram, "uViewProjMatrix"), type: DataType.Float4x4},
    };
    program.uniforms.others = {
      viewPos: {location: gl.getUniformLocation(shaderProgram, "uViewPos"), type: DataType.Float3},
      lightPos: {location: gl.getUniformLocation(shaderProgram, "uLightPos"), type: DataType.Float3},
      lightColor: {location: gl.getUniformLocation(shaderProgram, "uLightColor"), type: DataType.Float3}
    };
    program.uniforms.textures = {
      normalMap: {location: gl.getUniformLocation(shaderProgram, 'uNormalMap'), index: 0},
      albedoMap: {location: gl.getUniformLocation(shaderProgram, 'uAlbedoMap'), index: 1},
      metallicMap: {location: gl.getUniformLocation(shaderProgram, 'uMetallicMap'), index: 2},
      roughnessMap: {location: gl.getUniformLocation(shaderProgram, 'uRoughnessMap'), index: 3},
      aoMap: {location: gl.getUniformLocation(shaderProgram, 'uAOMap'), index: 4},
      irradianceMap: {location: gl.getUniformLocation(shaderProgram, 'uIrradianceMap'), index: 5}
    };
  });

  return program;
}