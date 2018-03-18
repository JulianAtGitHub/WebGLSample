import * as _ from "lodash";
import { mat4, vec3 } from "gl-matrix";
import { LightInfo, TextureInfo, BufferInfo } from "./converter";
import { Program } from "./program";
import { Drawable } from "./drawable";
import { Camera } from "./camera";
import { IndexMode, DataType, TextureType } from "./model";

export class Renderer {

  public constructor(private gl: WebGLRenderingContext) { }

  private SetupOtherUniforms(camera: Camera, drawable: Drawable, light: LightInfo, program: Program): void {
    if (!camera || !drawable || !program) {
      return;
    }

    const gl = this.gl;
    _.map(program.uniformNames, (name: string) => {
      const id = name.substring(2);

      let value = undefined;
      let type = undefined;
      switch (id) {

        case "viewProjMatrix": 
          value = camera.viewProjMatrix;
          type = DataType.Float4x4;
          break;

        case "modelMatrix": 
          value = drawable.modelMatrix;
          type = DataType.Float4x4;
          break;

        case "normalMatrix": 
          value = drawable.normalMatrix;
          type = DataType.Float3x3;
          break;

        case "viewMatrix":
          value = camera.viewMatrix;
          type = DataType.Float4x4;
          break;

        case "projMatrix":
          value = camera.projMatrix;
          type = DataType.Float4x4;
          break;

        case "viewPos":
          value = camera.eye;
          type = DataType.Float3;
          break;

        case "lightPos":
          value = light.position;
          type = DataType.Float3;
          break;

        case "lightColor":
          value = light.color;
          type = DataType.Float3;
          break;

        case "albedo":
          value = drawable.values.albedo;
          type = DataType.Float3;
          break;

        case "metallic":
          value = drawable.values.metallic;
          type = DataType.Float;
          break;

        case "roughness":
          value = drawable.values.roughness;
          type = DataType.Float;
          break;

        case "ao":
          value = drawable.values.ao;
          type = DataType.Float;
          break;

        default:
          break;
      }

      if (value != undefined && value != null) {
        program.SetUniform(name, value, type);
      } else {
        console.error("Uniform " + id + " not found in drawable!");
      }
    });
  }

  public Clear() {
    const gl = this.gl;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  public Draw(camera: Camera, drawable: Drawable, light: LightInfo, program: Program): void {
    if (!camera || !drawable || !program || !program.isReady) {
      return;
    }

    const gl = this.gl;

    // Tell WebGL to use our program when drawing
    program.Use();

    // set attributes
    _.map(program.attributeNames, (id: string) => {
      const name = id.substring(2) + "s";
      const bufferInfo = drawable.buffers[name];
      if (bufferInfo) {
        program.SetAttribute(id, bufferInfo.buffer, bufferInfo.rawDataType);
      } else {
        console.error("Drawable buffer:" + name + " not exsit");
      }
    });

    // set textures
    _.map(program.textureNames, (id: string) => {
      const name = id.substring(2);
      const textureInfo = drawable.textures[name];
      if (textureInfo) {
        program.SetTexture(id, textureInfo.texture, textureInfo.type);
      } else {
        console.error("Drawable texture:" + name + " not exsit");
      }
    });

    this.SetupOtherUniforms(camera, drawable, light, program);

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
