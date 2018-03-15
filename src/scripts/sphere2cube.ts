import * as _ from "lodash";
import { vec3, mat4 } from "gl-matrix";
import { ProgramInfo, TextureInfo, Converter } from "./converter";
import { DataType, CreateSkybox } from "./model";
import { Drawable } from "./drawable";
import { Painter } from "./painter";

// Spherical map to cubic map

enum State {
  LoadShaderAndModel,
  LoadRadianceTexture,
  RenderToCubemapTexture,
  Finished
}

export class Sphere2Cube {

  private state: State;
  private program: ProgramInfo;
  private unitCube: Drawable;
  private shpereMap: TextureInfo;

  public constructor(private converter: Converter, private painter: Painter) {
    this.program = null;
    this.unitCube = null;
    this.shpereMap = null;

    this.LoadShaderAndModel();
  }

  public set Image(image: string) {
    this.state = State.LoadRadianceTexture;
    this.shpereMap = this.converter.CreateRadianceHDRTexture(image);
  }

  public update() {
    if (this.state !== State.LoadRadianceTexture) {
      return;
    }

    if (!this.shpereMap || !this.shpereMap.texture) {
      return;
    }

    this.unitCube.textures.sphereMap = this.shpereMap;
    this.RenderToCubemap();
  }

  private LoadShaderAndModel() {
    this.state = State.LoadShaderAndModel;

    // create shader program
    const vertSource = `
      attribute vec3 aPosition;
      uniform mat4 uViewProjMatrix;
      varying vec3 vPosition;
      void main(void) {
        vPosition = aPosition;
        gl_Position = uViewProjMatrix * vec4(aPosition, 1.0);
      }`;
    const fragSource = `
      precision mediump float;
      varying vec3 vPosition;
      uniform sampler2D uSphereMap;
      const vec2 invAtan = vec2(0.1591, 0.3183);
      vec2 SampleSphereMap(vec3 v) {
        vec2 uv = vec2(atan(v.z, v.x), asin(v.y));
        uv *= invAtan;
        uv += 0.5;
        return uv;
      }
      void main(void) {
        vec2 uv = SampleSphereMap(normalize(vPosition));
        vec3 color = texture2D(uSphereMap, uv).rgb;
        gl_FragColor = vec4(color, 1.0);
      }`;
    
    this.program = {
      program: this.converter.CreateProgram(vertSource, fragSource)
    };

    const gl = this.converter.context;

    this.program.attributes = {
      position: gl.getAttribLocation(this.program.program, "aPosition")
    };
    this.program.uniforms = {
      transforms: { viewProjMatrix: {location: gl.getUniformLocation(this.program.program, "uViewProjMatrix"), type: DataType.Float4x4} },
      others: { },
      textures: { sphereMap: {location: gl.getUniformLocation(this.program.program, 'uSphereMap'), index: 0} }
    };

    // load model
    const cube = CreateSkybox();
    this.unitCube = new Drawable(cube, this.converter);
  }

  private RenderToCubemap() {
    this.state = State.RenderToCubemapTexture;

    const gl = this.converter.context;

    const captureFBO = gl.createFramebuffer();
    const captureRBO = gl.createRenderbuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, captureFBO);
    gl.bindRenderbuffer(gl.RENDERBUFFER, captureRBO);
  
    const width = 512;
    const height = 512;
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, captureRBO);
  
    const envCubeMap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, envCubeMap);
  
    const level = 0;
    const internalFormat = gl.RGB;
    const border = 0;
    const srcFormat = gl.RGB;
    const srcType = gl.FLOAT;
    const cubemapTargets = [
      gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    ];

    for (let i = 0; i < cubemapTargets.length; ++i) {
      gl.texImage2D(cubemapTargets[i], level, internalFormat, width, height, border, srcFormat, srcType, null);
    }
  
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const ToRadians = (angle: number) => {
      return angle * (Math.PI / 180);
    };

    const projection = mat4.perspective(mat4.create(), ToRadians(90.0), 1.0, 0.1, 10.0);
    const viewProjMatrixes = [
      mat4.multiply(mat4.create(), projection, mat4.lookAt(mat4.create(), vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues( 1.0, 0.0, 0.0), vec3.fromValues(0.0,-1.0, 0.0))),
      mat4.multiply(mat4.create(), projection, mat4.lookAt(mat4.create(), vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues(-1.0, 0.0, 0.0), vec3.fromValues(0.0,-1.0, 0.0))),
      mat4.multiply(mat4.create(), projection, mat4.lookAt(mat4.create(), vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues( 0.0, 1.0, 0.0), vec3.fromValues(0.0, 0.0, 1.0))),
      mat4.multiply(mat4.create(), projection, mat4.lookAt(mat4.create(), vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues( 0.0,-1.0, 0.0), vec3.fromValues(0.0, 0.0,-1.0))),
      mat4.multiply(mat4.create(), projection, mat4.lookAt(mat4.create(), vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues( 0.0, 0.0, 1.0), vec3.fromValues(0.0,-1.0, 0.0))),
      mat4.multiply(mat4.create(), projection, mat4.lookAt(mat4.create(), vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues( 0.0, 0.0,-1.0), vec3.fromValues(0.0,-1.0, 0.0)))
    ];

    // draw each side
  }

}