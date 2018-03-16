import * as _ from "lodash";
import { DataType, TextureType } from "./model";
import { Converter } from "./converter";

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
  attributes?: {[id: string]: DataType};
  uniforms?: {
    textures?: {[id: string]: TextureType};
    others?: {[id: string]: DataType};
  };
}

export class Program {
  private glProgram: WebGLProgram = null;
  private attributes: {[id: string]: ShaderAttribute} = {};
  private uniforms: {[id: string]: ShaderUniform} = {};
  private samplers: {[id: string]: ShaderTexture} = {};

  constructor(private converter: Converter, parameters: ProgramParameters) {
    if (parameters.vertFile && parameters.fragFile) {
      this.converter.CreateProgramFromFile(parameters.vertFile, parameters.fragFile, (program: WebGLProgram) => {
        this.glProgram = program;
        this.GetParameters(parameters);
      });
    } else {
      this.glProgram = this.converter.CreateProgram(parameters.vertSource, parameters.fragSource);
      this.GetParameters(parameters);
    }
  }

  private GetParameters(parameters: ProgramParameters): void {
    if (!this.glProgram) {
      return;
    }

    const gl = this.converter.context;

    // get attributes
    if (parameters.attributes) {
      _.map(parameters.attributes, (type: DataType, attrName: string) => {
        const attribute = gl.getAttribLocation(this.glProgram, attrName);
        if (attribute !== ErrorLocation) {
          this.attributes[attrName] = {location: attribute, type};
        } else {
          console.error("Shader program attribute: " + attrName + " not found");
        }
      });
    }

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

  }

  public get isReady(): boolean { return (this.glProgram !== null); }

  public get attributeNames(): string[] { return Object.keys(this.attributes); }

  public get textureNames(): string[] { return Object.keys(this.samplers); }

  public get uniformNames(): string[] { return Object.keys(this.uniforms); }

  public Use() {
    if (!this.glProgram) {
      console.error("Program.Use: program value not exist");
      return;
    }

    const gl = this.converter.context;
    gl.useProgram(this.glProgram);
  }

  public SetAttribute(name: string, buffer: WebGLBuffer, bufferType: DataType) {
    if (!name || !buffer) {
      return;
    }

    const attribute = this.attributes[name];
    if (!attribute) {
      console.error("Attribute:" + name + " not exist in shader program");
      return;
    }

    if (bufferType !== attribute.type) {
      console.error("SetAttribute:" + name + " type not matched");
      return;
    }

    const gl = this.converter.context;

    let numComponents = 0;  // pull out 2 values per iteration
    const type = gl.FLOAT;    // the data in the buffer is 32bit floats
    const normalize = false;  // don't normalize
    const stride = 0;         // how many bytes to get from one set of values to the next
    const offset = 0;         // how many bytes inside the buffer to start from

    // data type case
    switch(attribute.type) {
      case DataType.Float2: numComponents = 2; break;
      case DataType.Float3: numComponents = 3; break;
      case DataType.Float4: numComponents = 4; break;
      default: break;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(attribute.location, numComponents, type, normalize, stride, offset);
    gl.enableVertexAttribArray(attribute.location);
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

    const gl = this.converter.context;

    switch(sampler.index) {
      case 0: gl.activeTexture(gl.TEXTURE0); break;
      case 1: gl.activeTexture(gl.TEXTURE1); break;
      case 2: gl.activeTexture(gl.TEXTURE2); break;
      case 3: gl.activeTexture(gl.TEXTURE3); break;
      case 4: gl.activeTexture(gl.TEXTURE4); break;
      case 5: gl.activeTexture(gl.TEXTURE5); break;
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

    const gl = this.converter.context;

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
}
