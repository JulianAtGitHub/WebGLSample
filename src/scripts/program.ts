import * as _ from "lodash";
import { DataType, TextureType, DataUsage, DataLayout } from "./model";
import { GLSystem } from "./gl-system";

const ErrorLocation = -1;

interface ShaderAttribute {
  location: number;
  type: DataType;
}

interface ShaderUniform {
  location: WebGLUniformLocation;
  type: DataType;
}

interface ShaderTexture {
  location: WebGLUniformLocation;
  type: TextureType;
  index: number;
}

export interface ProgramParameters {
  vertFile: string;
  fragFile: string;
  vertSource?: string;
  fragSource?: string;
  macros?: string[];
  uniforms?: {
    textures?: {[id: string]: TextureType};
    others?: {[id: string]: DataType};
  };
}

export class Program {
  private glProgram: WebGLProgram = null;
  private attribCount: number = 0;
  private attribLocations: {[id: string]: number} = {};
  private uniforms: {[id: string]: ShaderUniform} = {};
  private samplers: {[id: string]: ShaderTexture} = {};

  constructor(private glSystem: GLSystem, parameters: ProgramParameters) {
    if (!parameters.macros) { parameters.macros = []; }
    if (parameters.vertFile && parameters.fragFile) {
      this.glSystem.CreateProgramFromFile(parameters.vertFile, parameters.fragFile, parameters.macros, (program: WebGLProgram) => {
        this.glProgram = program;
        this.GetParameters(parameters);
      });
    } else {
      this.glProgram = this.glSystem.CreateProgram(parameters.vertSource, parameters.fragSource, parameters.macros);
      this.GetParameters(parameters);
    }
  }

  private GetParameters(parameters: ProgramParameters): void {
    if (!this.glProgram) {
      return;
    }

    const gl = this.glSystem.context;

    // get uniforms
    if (parameters.uniforms) {
      // textures
      if (parameters.uniforms.textures) {
        let idx = 0;
        _.map(parameters.uniforms.textures, (type: TextureType, samplerName: string) => {
          const sampler = gl.getUniformLocation(this.glProgram, samplerName);
          if (sampler !== null) {
            this.samplers[samplerName] = {location: sampler, type, index: idx};
            ++ idx;
          } else {
            console.error("Shader program uniform: " + samplerName + " not found");
          }
        });
      }
      // others
      if (parameters.uniforms.others) {
        _.map(parameters.uniforms.others, (type: DataType, uniformName: string) => {
          const uniform = gl.getUniformLocation(this.glProgram, uniformName);
          if (uniform !== null) {
            this.uniforms[uniformName] = {location: uniform, type};
          } else {
            console.error("Shader program uniform: " + uniformName + " not found");
          }
        });
      }
    }

    this.attribCount = gl.getProgramParameter(this.glProgram, gl.ACTIVE_ATTRIBUTES);
  }

  public get isReady(): boolean { return (this.glProgram !== null); }

  public get textureNames(): string[] { return Object.keys(this.samplers); }

  public get uniformNames(): string[] { return Object.keys(this.uniforms); }

  public Use() {
    if (!this.glProgram) {
      console.error("Program.Use: program value not exist");
      return;
    }

    const gl = this.glSystem.context;
    gl.useProgram(this.glProgram);
  }

  public SetTexture(name: string, texture: WebGLTexture, textureType: TextureType) {
    if (!name || !texture) {
      return;
    }

    const sampler = this.samplers[name];
    if (!sampler) {
      console.error("Uniform:" + name + " not exist in shader program");
      return;
    }

    if (textureType !== sampler.type) {
      console.error("SetTexture:" + name + " type not matched");
      return;
    }

    const gl = this.glSystem.context;

    switch(sampler.index) {
      case 0: gl.activeTexture(gl.TEXTURE0); break;
      case 1: gl.activeTexture(gl.TEXTURE1); break;
      case 2: gl.activeTexture(gl.TEXTURE2); break;
      case 3: gl.activeTexture(gl.TEXTURE3); break;
      case 4: gl.activeTexture(gl.TEXTURE4); break;
      case 5: gl.activeTexture(gl.TEXTURE5); break;
      case 6: gl.activeTexture(gl.TEXTURE6); break;
      case 7: gl.activeTexture(gl.TEXTURE7); break;
      case 8: gl.activeTexture(gl.TEXTURE8); break;
      case 9: gl.activeTexture(gl.TEXTURE9); break;
      case 10: gl.activeTexture(gl.TEXTURE10); break;
      case 11: gl.activeTexture(gl.TEXTURE11); break;
      case 12: gl.activeTexture(gl.TEXTURE12); break;
      case 13: gl.activeTexture(gl.TEXTURE13); break;
      case 14: gl.activeTexture(gl.TEXTURE14); break;
      case 15: gl.activeTexture(gl.TEXTURE15); break;
      default: console.error("Invalid texture location."); break;
    }

    switch(sampler.type) {
      case TextureType.Texture2D: gl.bindTexture(gl.TEXTURE_2D, texture); break;
      case TextureType.TextureCubeMap: gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture); break;
      default: console.error("Invalid texture type."); break;
    }

    gl.uniform1i(sampler.location, sampler.index);
  }

  public SetUniform(name: string, value: any, valueType: DataType) {
    if (!name || !value) {
      return;
    }

    const uniform = this.uniforms[name];
    if (!uniform) {
      console.error("Uniform:" + name + " not exist in shader program");
      return;
    }

    if (valueType !== uniform.type) {
      console.error("SetUniform:" + name + " type not matched");
      return;
    }

    const gl = this.glSystem.context;

    switch(uniform.type) {
      case DataType.Float4x4: gl.uniformMatrix4fv(uniform.location, false, value); break;
      case DataType.Float3x3: gl.uniformMatrix3fv(uniform.location, false, value); break;
      case DataType.Float4: gl.uniform4fv(uniform.location, value); break;
      case DataType.Float3: gl.uniform3fv(uniform.location, value); break;
      case DataType.Float2: gl.uniform2fv(uniform.location, value); break;
      case DataType.Float: gl.uniform1f(uniform.location, value); break;
      case DataType.Int: gl.uniform1i(uniform.location, value); break;
      default: console.error("Unknow uniform type:" + uniform.type); break;
    }
  }

  public CheckAttribLocation(layouts: DataLayout[]): boolean {
    if (!layouts) {
      return false;
    }

    if (this.attribCount > layouts.length) {
      console.error("CheckAttribLocation: vertex attribute count less than program needed!");
      return false;
    }

    const gl = this.glSystem.context;

    for (let i = 0; i < layouts.length; ++i) {
      const layout = layouts[i];
      const name = "a_" + DataUsage[layout.usage];
      let location = this.attribLocations[name];
      if (location === null || location === undefined) {
        location = gl.getAttribLocation(this.glProgram, name);
        this.attribLocations[name] = location;
      }

      if (location === -1) {
        console.error("CheckAttribLocation: attribute " + name + " not exist in program!");
        return false;
      }
    }

    return true;
  }
}
