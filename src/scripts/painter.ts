import * as _ from "lodash";
import { mat4, vec3 } from "gl-matrix";
import { ShaderUniforms, ShaderTexture, LightInfo, TextureInfo, ProgramInfo } from "./converter";
import { Drawable } from "./drawable";
import { Camera } from "./camera";
import { IndexMode, DataType } from "./model";

export class Painter {

  public constructor(private gl: WebGLRenderingContext) { }

  private SetupAttributes(drawable: Drawable, program: ProgramInfo): void {
    if (!drawable || !program || !program.attributes) {
      return;
    }

    const gl = this.gl;
    _.map(program.attributes, (attribute: number, id: string) => {
      let numComponents = 3;  // pull out 2 values per iteration
      const type = gl.FLOAT;    // the data in the buffer is 32bit floats
      const normalize = false;  // don't normalize
      const stride = 0;         // how many bytes to get from one set of values to the next
                                // 0 = use type and numComponents above
      const offset = 0;         // how many bytes inside the buffer to start from

      const buffer = drawable.buffers[id + "s"];
      if (!buffer) {
        console.error("Attribute " + id + "s" + " not found when draw object.");
      } else {
        // data type case
        switch(buffer.rawDataType) {
          case DataType.Float2: numComponents = 2; break;
          case DataType.Float4: numComponents = 4; break;
          case DataType.Float3:
          default: break;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer);
        gl.vertexAttribPointer(
          attribute,
          numComponents,
          type,
          normalize,
          stride,
          offset);
        gl.enableVertexAttribArray(attribute);
      }
    });
  }

  private SetUniform(uniform: WebGLUniformLocation, value: any, type: DataType): void {
    if (uniform == null || uniform == undefined || value == null || value == undefined) {
      return;
    }

    const gl = this.gl;
    switch(type) {
      case DataType.Float4x4: gl.uniformMatrix4fv(uniform, false, value); break;
      case DataType.Float3x3: gl.uniformMatrix3fv(uniform, false, value); break;
      case DataType.Float4: gl.uniform4fv(uniform, value); break;
      case DataType.Float3: gl.uniform3fv(uniform, value); break;
      case DataType.Float2: gl.uniform2fv(uniform, value); break;
      case DataType.Float: gl.uniform1f(uniform, value); break;
      case DataType.Int: gl.uniform1i(uniform, value); break;
      default: console.error("Unknow uniform type:" + type); break;
    }
  }

  private SetupTransformUniforms(camera: Camera, drawable: Drawable, program: ProgramInfo): void {
    if (!camera || !drawable || !program || !program.uniforms || !program.uniforms.transforms) {
      return;
    }

    const gl = this.gl;
    _.map(program.uniforms.transforms, (uniform: ShaderUniforms, id: string) => {
      let value = undefined;
      if (id === "viewProjMatrix") {
        value = camera.viewProjMatrix;
      } else if (id === "modelMatrix") {
        value = drawable.modelMatrix;
      } else if (id === "normalMatrix") {
        value = drawable.normalMatrix;
      }

      if (value != undefined && value != null) {
        this.SetUniform(uniform.location, value, uniform.type);
      }
    });
  }

  private SetupTextureUniforms(drawable: Drawable, program: ProgramInfo): void {
    if (!drawable || !program || !program.uniforms || !program.uniforms.textures) {
      return;
    }
    const gl = this.gl;

    _.map(program.uniforms.textures, (texture: ShaderTexture, id: string) => {
      const textureInfo = drawable.textures[id];
      if (textureInfo && textureInfo.texture) {
        const index = texture.index;
        const uniform = texture.location;
        switch(index) {
          case 0: gl.activeTexture(gl.TEXTURE0); break;
          case 1: gl.activeTexture(gl.TEXTURE1); break;
          case 2: gl.activeTexture(gl.TEXTURE2); break;
          case 3: gl.activeTexture(gl.TEXTURE3); break;
          case 4: gl.activeTexture(gl.TEXTURE4); break;
          case 5: gl.activeTexture(gl.TEXTURE5); break;
          default: console.error("Invalid texture location."); break;
        }
        gl.bindTexture(gl.TEXTURE_2D, textureInfo.texture);
        gl.uniform1i(uniform, index);
      }
    });
  }

  private SetupOtherUniforms(camera: Camera, drawable: Drawable, light: LightInfo, program: ProgramInfo): void {
    if (!program || !program.uniforms || !program.uniforms.others) {
      return;
    }

    const gl = this.gl;
    _.map(program.uniforms.others, (uniform: ShaderUniforms, id: string) => {
      let value = undefined;
      if (id === "viewPos") {
        value = camera.eye;
      } else if (id === "lightPos") {
        value = light.position;
      } else if (id === "lightColor") {
        value = light.color;
      } else if (id === "albedo") {
        value = drawable.values.albedo;
      } else if (id === "metallic") {
        value = drawable.values.metallic;
      } else if (id === "roughness") {
        value = drawable.values.roughness;
      } else if (id === "ao") {
        value = drawable.values.ao;
      }

      if (value != undefined && value != null) {
        this.SetUniform(uniform.location, value, uniform.type);
      } else {
        console.error("Uniform " + id + " not found value setted in drawable!");
      }
    });
  }

  private SetupUniforms(camera: Camera, drawable: Drawable, light: LightInfo, program: ProgramInfo): void {
    if (!camera || !drawable || !program || !program.uniforms) {
      return;
    }

    this.SetupTransformUniforms(camera, drawable, program);
    this.SetupTextureUniforms(drawable, program);
    this.SetupOtherUniforms(camera, drawable, light, program);
  }

  public Draw(camera: Camera, drawable: Drawable, light: LightInfo, program: ProgramInfo): void {
    if (!camera || !drawable || !program || !program.program) {
      return;
    }

    const gl = this.gl;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    this.SetupAttributes(drawable, program);

    // Tell WebGL to use our program when drawing
    gl.useProgram(program.program);

    this.SetupUniforms(camera, drawable, light, program);

    // Tell WebGL which indices to use to index the vertices
    const indices = drawable.buffers.indices;
    if (indices && indices.buffer) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices.buffer);

      const vertexCount = indices.rawData.length;
      const type = gl.UNSIGNED_SHORT;
      const offset = 0;

      let mode = gl.TRIANGLES;
      switch(drawable.indexMode) {
        case IndexMode.TriangleStrip: mode = gl.TRIANGLE_STRIP; break;
        case IndexMode.TriangleFan: mode = gl.TRIANGLE_FAN; break;
        default: break;
      }

      gl.drawElements(mode, vertexCount, type, offset);
    }
  }

}
