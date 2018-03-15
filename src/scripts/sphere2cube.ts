import * as _ from "lodash";
import { vec3, mat4 } from "gl-matrix";
import { ProgramInfo, TextureInfo, Converter } from "./converter";
import { DataType, CreateSkybox } from "./model";
import { Drawable } from "./drawable";

// Spherical map to cubic map

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
    // vec3 color = texture2D(uSphereMap, uv).rgb;
    vec3 color = texture2D(uSphereMap, vec2(uv.x, 1.0 - uv.y)).rgb;
    gl_FragColor = vec4(color, 1.0);
  }`;

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
  private cubeMap: TextureInfo;
  private width: number;
  private height: number;

  public constructor(private converter: Converter) {
    this.program = null;
    this.unitCube = null;
    this.shpereMap = null;
    this.cubeMap = null;
    this.width = 512;
    this.height = 512;

    this.LoadShaderAndModel();
  }

  public get isReady(): boolean { return (this.state === State.Finished); }

  public set image(image: string) {
    this.state = State.LoadRadianceTexture;
    this.shpereMap = this.converter.CreateRadianceHDRTexture(image);
  }

  public get envMap(): TextureInfo { return this.cubeMap; }

  public update() {
    if (this.state !== State.LoadRadianceTexture) {
      return;
    }

    if (!this.shpereMap || !this.shpereMap.texture) {
      return;
    }

    this.RenderToCubemap();
  }

  private ClearCubemap() {
    if (this.cubeMap && this.cubeMap.texture) {
      const gl = this.converter.context;
      gl.deleteTexture(this.cubeMap.texture);
    }
    this.cubeMap = null;
  }

  private LoadShaderAndModel() {
    this.state = State.LoadShaderAndModel;

    // create shader program
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

    this.ClearCubemap();

    const gl = this.converter.context;

    const captureFBO = gl.createFramebuffer();
    const captureRBO = gl.createRenderbuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, captureFBO);
    gl.bindRenderbuffer(gl.RENDERBUFFER, captureRBO);
  
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
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
      gl.texImage2D(cubemapTargets[i], level, internalFormat, this.width, this.height, border, srcFormat, srcType, null);
    }
  
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const ToRadians = (angle: number) => {
      return angle * (Math.PI / 180.0);
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
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.useProgram(this.program.program);

    const sphereTex = this.program.uniforms.textures.sphereMap;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.shpereMap.texture);
    gl.uniform1i(sphereTex.location, 0);

    gl.viewport(0, 0, this.width, this.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, captureFBO);

    {
      const viewProjMatrix = this.program.uniforms.transforms.viewProjMatrix;
      const positionIndex = this.program.attributes.position;
      const indexBuffer = this.unitCube.buffers.indices;
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;

      for (let i = 0; i < cubemapTargets.length; ++i) {
        gl.uniformMatrix4fv(viewProjMatrix.location, false, viewProjMatrixes[i]);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, cubemapTargets[i], envCubeMap, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.unitCube.buffers.positions.buffer);
        gl.vertexAttribPointer( positionIndex, numComponents, type, normalize, stride, offset);
        gl.enableVertexAttribArray(positionIndex);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer);
        const vertexCount = indexBuffer.rawData.length;

        gl.drawElements(gl.TRIANGLES, vertexCount, gl.UNSIGNED_SHORT, 0);
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    this.cubeMap = {
      texture: envCubeMap,
      width: this.width,
      height: this.height,
    };

    this.state = State.Finished;
  }

}