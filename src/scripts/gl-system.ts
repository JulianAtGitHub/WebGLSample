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

export interface BufferInfo {
  buffer: WebGLBuffer;
  rawData: number[];
  rawDataType: DataType;
}

// return value is power of two
export function IsPOT(value: number): boolean {
  return (value & (value - 1)) == 0;
}

const DependentedExts = [
  "OES_texture_float_linear"
];

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

  public CreateRadianceHDRTexture(url: string): TextureInfo {
    if (!url) {
      return null;
    }

    const gl = this.gl;

    const texture = gl.createTexture();

    const level = 0;
    const internalFormat = gl.RGB;
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

    const vertexShader = this.LoadShader(preprocessor + vsSource, gl.VERTEX_SHADER);
    const fragmentShader = this.LoadShader(preprocessor + fsSource, gl.FRAGMENT_SHADER);
  
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

  private CreateBufferObject(data: Data, type: number): WebGLBuffer {
    if (!data) {
      return null;
    }

    const gl = this.gl;

    // Create a buffer object.
    const buffer = gl.createBuffer();

    // Select the buffer object as the one to apply data
    gl.bindBuffer(type, buffer);
    switch(data.type) {
      case DataType.Float2:
      case DataType.Float3:
      case DataType.Float4:
        gl.bufferData(type, new Float32Array(data.data), gl.STATIC_DRAW);
        break;
      case DataType.Int:
        gl.bufferData(type, new Uint16Array(data.data), gl.STATIC_DRAW);
        break;
      default:
        console.error("CreateBufferObject: invalid buffer type " + type);
        break;
    }
    gl.bindBuffer(type, null);
    return buffer;
  }

  public CreateBuffer(data: Data): WebGLBuffer {
    return this.CreateBufferObject(data, this.gl.ARRAY_BUFFER);
  }

  public CreateElementBuffer(data: Data): WebGLBuffer {
    return this.CreateBufferObject(data, this.gl.ELEMENT_ARRAY_BUFFER);
  }

}