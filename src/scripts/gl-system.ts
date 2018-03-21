import * as $ from "jquery";
import * as _ from "lodash";
import { HDRImage } from "./hdrpng";
import { vec3 } from "gl-matrix";
import { DataType, TextureType, Data } from "./model";

export interface LightInfo {
  position?: vec3;
  color?: vec3;
}

export interface TextureInfo {
  texture: WebGLTexture;
  type: TextureType;
  width: number;
  height: number;
}

export interface VertexInfo {
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer; // vertex buffer
  ebo?: WebGLBuffer; // element buffer
  // Count is element count if ebo is exist
  // Count is vertex count if ebo is not exist
  count: number;
}

// return value is power of two
export function IsPOT(value: number): boolean {
  return (value & (value - 1)) == 0;
}

const DependentedExts = [
  "EXT_color_buffer_float",
  "OES_texture_float_linear"
];

const ShaderVersion = `#version 300 es \n`;

export class GLSystem {

  private extensions: {[id: string]: any} = {};

  private _isReliable: boolean = true;
  public get isReliable(): boolean { return this._isReliable; }

  public constructor(private gl: WebGL2RenderingContext) {
    _.map(DependentedExts, (ext) => {
      !this.GetExtension(ext) && (this._isReliable = false);
    });
  }

  public get context(): WebGL2RenderingContext {
    return this.gl;
  }

  public GetExtension(ext: string): any {
    let extObj = this.extensions[ext];
    if (!extObj) {
      extObj = this.gl.getExtension(ext);
      (extObj !== null) ? (this.extensions[ext] = extObj) : alert("Extension " + ext + " is not supported!");
    }
    return extObj;
  }

  // Initialize a texture and load an image.
  // When the image finished loading copy it into the texture.
  public CreateTexture(url: string): TextureInfo {
    if (!url) {
      return null;
    }

    const gl = this.gl;

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Because images have to be download over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGB;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGB;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([255, 0, 255]);  // deep pink
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  width, height, border, srcFormat, srcType, pixel);

    gl.bindTexture(gl.TEXTURE_2D, null);

    const textureInfo: TextureInfo = {
      texture,
      type: TextureType.Texture2D,
      width,
      height,
    };

    const image = new Image();
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                    srcFormat, srcType, image);

      // WebGL1 has different requirements for power of 2 images
      // vs non power of 2 images so check if the image is a
      // power of 2 in both dimensions.
      if (IsPOT(image.width) && IsPOT(image.height)) {
        // Yes, it's a power of 2. Generate mips.
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      } else {
        // No, it's not a power of 2. Turn of mips and set
        // wrapping to clamp to edge
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }

      gl.bindTexture(gl.TEXTURE_2D, null);

      textureInfo.width = image.width;
      textureInfo.height = image.height;
    };
    image.src = url;

    return textureInfo;
  }

  public CreateHDRTexture(url: string): TextureInfo {
    if (!url) {
      return null;
    }

    const gl = this.gl;

    const texture = gl.createTexture();

    const level = 0;
    const internalFormat = gl.RGB16F;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGB;
    const srcType = gl.FLOAT;

    const textureInfo: TextureInfo = {
      texture: null,
      type: TextureType.Texture2D,
      width,
      height,
    };
    const hdrImage = new HDRImage();
    hdrImage.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, hdrImage.width, hdrImage.height, 
                    border, srcFormat, srcType, hdrImage.DataFloat(true));

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      gl.bindTexture(gl.TEXTURE_2D, null);
      
      textureInfo.texture = texture;
      textureInfo.width = hdrImage.width;
      textureInfo.height = hdrImage.height;
    };
    hdrImage.src = url;

    return textureInfo;
  }

  private LoadShader(source: string, type: number): WebGLShader {
    const gl = this.gl;

    const shader = gl.createShader(type);
    // Send the source to the shader object
    gl.shaderSource(shader, source);
    // Compile the shader program
    gl.compileShader(shader);

    // check if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  public CreateProgram(vsSource: string, fsSource: string, macros: string[]): WebGLProgram {
    const gl = this.gl;

    let preprocessor = "";
    if (macros.length > 0) {
      _.map(macros, (macro: string) => {
        preprocessor += `${macro} \n`;
      });
    }

    const prefix = ShaderVersion + preprocessor;

    const vertexShader = this.LoadShader(prefix + vsSource, gl.VERTEX_SHADER);
    const fragmentShader = this.LoadShader(prefix + fsSource, gl.FRAGMENT_SHADER);
  
    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
  
    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
      return null;
    }

    return shaderProgram;
  }

  public CreateProgramFromFile(vsFile: string, fsFile: string, macros: string[], complete: (program: WebGLProgram) => void): void {
    const vertDeferred = $.ajax({
      url: vsFile,
      dataType: 'text',
      async: true,
      error: (jqXhr, textStatus, errorThrown) => {
        console.error("Read " + vsFile + " failed! File not exist");
      }
    });
    const fragDeferred = $.ajax({
      url: fsFile,
      dataType: 'text',
      async: true,
      error: (jqXhr, textStatus, errorThrown) => {
        console.error("Read " + fsFile + " failed! File not exist");
      }
    });
    $.when(vertDeferred, fragDeferred).then((vsSource, fsSource) => {
      const program = this.CreateProgram(vsSource[0], fsSource[0], macros);
      complete && complete(program);
    });
  }

  public CreateBufferObject(data: number[], type: DataType, isElement: boolean = false): WebGLBuffer {
    if (!data) {
      return null;
    }

    const gl = this.gl;

    // Create a buffer object.
    const buffer = gl.createBuffer();

    const target = (isElement === true ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER);

    // Select the buffer object as the one to apply data
    gl.bindBuffer(target, buffer);
    switch(type) {
      case DataType.Float:
      case DataType.Float2:
      case DataType.Float3:
      case DataType.Float4:
        gl.bufferData(target, new Float32Array(data), gl.STATIC_DRAW);
        break;
      case DataType.Int:
        gl.bufferData(target, new Uint16Array(data), gl.STATIC_DRAW);
        break;
      default:
        console.error("CreateBufferObject: invalid buffer type " + type);
        break;
    }
    gl.bindBuffer(target, null);
    return buffer;
  }

  public CreateVertexInfo(vertices: Data, indices: Data | null): VertexInfo {
    if (!vertices || !vertices.data) {
      return null;
    }

    const gl = this.gl;

    const vbo = this.CreateBufferObject(vertices.data, DataType.Float, false);
    const ebo = (indices ? this.CreateBufferObject(indices.data, DataType.Int, true): null);
    const vao = gl.createVertexArray();

    // setup vertex array
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    const sizeOfFloat = 4;
    // calculate stride
    let stride = 0;
    for (let i = 0; i < vertices.layouts.length; ++i) {
      const layout = vertices.layouts[i];
      switch(layout.type) {
        case DataType.Float: stride += sizeOfFloat; break;
        case DataType.Float2: stride += 2 * sizeOfFloat; break;
        case DataType.Float3: stride += 3 * sizeOfFloat; break;
        case DataType.Float4: stride += 4 * sizeOfFloat; break;
        default: console.error("Invalod layout data type in vertices, type:" + layout.type);
      }
    }

    let offset = 0;
    for (let i = 0; i < vertices.layouts.length; ++i) {
      const layout = vertices.layouts[i];
      gl.enableVertexAttribArray(i);
      let size = 0;
      switch(layout.type) {
        case DataType.Float: size = 1; break;
        case DataType.Float2: size = 2; break;
        case DataType.Float3: size = 3; break;
        case DataType.Float4: size = 4; break;
        default: console.error("Invalod layout data type in vertices, type:" + layout.type);
      }
      gl.vertexAttribPointer(i, size, gl.FLOAT, false, stride, offset);

      offset += size * sizeOfFloat;
    }

    if (ebo) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    }

    gl.bindVertexArray(null);

    const count = (ebo !== null ? indices.data.length : vertices.data.length / (stride / sizeOfFloat));

    return {vao, vbo, ebo, count};
  }


  public CheckBindedFramebufferStatus(): boolean {
    const gl = this.gl;

    let isSuccess = false;
    const fbStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    switch (fbStatus) {
      case gl.FRAMEBUFFER_COMPLETE: console.log("Frame Buffer Status: FRAMEBUFFER_COMPLETE"); isSuccess = true; break;
      case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT: console.error("Frame Buffer Status: FRAMEBUFFER_INCOMPLETE_ATTACHMENT"); break;
      case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: console.error("Frame Buffer Status: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT"); break;
      case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS: console.error("Frame Buffer Status: FRAMEBUFFER_INCOMPLETE_DIMENSIONS"); break;
      case gl.FRAMEBUFFER_UNSUPPORTED: console.error("Frame Buffer Status: FRAMEBUFFER_UNSUPPORTED"); break;
      case gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE: console.error("Frame Buffer Status: FRAMEBUFFER_INCOMPLETE_MULTISAMPLE"); break;
      default: console.error("Frame Buffer Status:" + fbStatus); break;
    }

    return isSuccess;
  }

  public CheckError(): boolean {
    const gl = this.gl;

    let isNoError = false;
    const error = gl.getError();
    switch (error) {
      case gl.NO_ERROR: console.log("WebGL Error: NO_ERROR"); isNoError = true; break;
      case gl.INVALID_ENUM: console.error("WebGL Error: INVALID_ENUM"); break;
      case gl.INVALID_VALUE: console.error("WebGL Error: INVALID_VALUE"); break;
      case gl.INVALID_OPERATION: console.error("WebGL Error: INVALID_OPERATION"); break;
      case gl.INVALID_FRAMEBUFFER_OPERATION: console.error("WebGL Error: INVALID_FRAMEBUFFER_OPERATION"); break;
      case gl.OUT_OF_MEMORY: console.error("WebGL Error: OUT_OF_MEMORY"); break;
      case gl.CONTEXT_LOST_WEBGL: console.error("WebGL Error: CONTEXT_LOST_WEBGL"); break;
      default: console.error("WebGL Error:" + error); break;
    }

    return isNoError;
  }

}