import * as _ from "lodash";
import { vec3, mat4 } from "gl-matrix";
import { ProgramInfo, TextureInfo, Converter } from "./converter";
import { DataType, TextureType, CreateSkybox } from "./model";
import { Drawable } from "./drawable";

// Spherical map to cubic map
const rad2envShader = {
  vertSource: `
  attribute vec3 aPosition;
  uniform mat4 uViewProjMatrix;
  varying vec3 vPosition;
  void main(void) {
    vPosition = aPosition;
    gl_Position = uViewProjMatrix * vec4(aPosition, 1.0);
  }`,

  fragSource: `
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
  }`
};

const env2irrShader = {
  vertSource: rad2envShader.vertSource,
  fragSource: `
  precision mediump float;
  varying vec3 vPosition;
  uniform samplerCube uEnvMap;
  const float PI = 3.14159265359;
  const float PI_2 = 1.570796326795; // PI / 2.0
  const float PI2 = 6.28318530718;  // PI * 2.0
  const float sampleDelta = 0.025;
  void main(void) {
    // The world vector acts as the normal of a tangent surface from the origin, aligned to vPosition. 
    // Given this normal, calculate all incoming radiance of the environment. 
    // The result of this radiance is the radiance of light coming from -Normal direction, 
    // which is what we use in the PBR shader to sample irradiance.
    vec3 N = normalize(vPosition);
    vec3 irradiance = vec3(0.0);
    // tangent sapce calculation from origin point
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 right = cross(up, N);
    up = cross(N, right);
    // calculation irradiance
    float nrSamples = 0.0;
    for (float phi = 0.0; phi < PI2; phi += sampleDelta) {
      for (float theta = 0.0; theta < PI_2; theta += sampleDelta) {
        vec3 tangentSample = vec3(sin(theta) * cos(phi),  sin(theta) * sin(phi), cos(theta));
        vec3 worldSample = tangentSample.x * right + tangentSample.y * up + tangentSample.z * N;
        irradiance += textureCube(uEnvMap, worldSample).rgb * cos(theta) * sin(theta);
        nrSamples += 1.0;
      }
    }
    irradiance = PI * irradiance * (1.0 / nrSamples);
    gl_FragColor = vec4(irradiance, 1.0);
  }
  `
};


enum State {
  PrepareRenderObjects,
  LoadRadianceTexture,
  ConvertToEnvironmentMap,
  CalculateIrradianceMap,
  Finished
}

export class Sphere2Cube {

  private state: State;
  private rad2envProgram: ProgramInfo;
  private env2irrProgram: ProgramInfo;
  private unitCube: Drawable;
  private shpereMap: TextureInfo;
  private envSize: number;
  private irrSize: number;

  // temp properties
  private cubemapTargets: number[];
  private viewProjMatrixes: mat4[];
  private envCubeMap: WebGLTexture;
  private irrCubeMap: WebGLTexture;
  private captureFBO: WebGLFramebuffer;
  private captureRBO: WebGLRenderbuffer;

  public constructor(private converter: Converter) {
    this.rad2envProgram = null;
    this.env2irrProgram = null;
    this.unitCube = null;
    this.shpereMap = null;
    this.envSize = 512;
    this.irrSize = 32;

    const gl = this.converter.context;
    this.cubemapTargets = [
      gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    ];
    const ToRadians = (angle: number) => {
      return angle * (Math.PI / 180.0);
    };
    const projection = mat4.perspective(mat4.create(), ToRadians(90.0), 1.0, 0.1, 10.0);
    this.viewProjMatrixes = [
      mat4.multiply(mat4.create(), projection, mat4.lookAt(mat4.create(), vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues( 1.0, 0.0, 0.0), vec3.fromValues(0.0,-1.0, 0.0))),
      mat4.multiply(mat4.create(), projection, mat4.lookAt(mat4.create(), vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues(-1.0, 0.0, 0.0), vec3.fromValues(0.0,-1.0, 0.0))),
      mat4.multiply(mat4.create(), projection, mat4.lookAt(mat4.create(), vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues( 0.0, 1.0, 0.0), vec3.fromValues(0.0, 0.0, 1.0))),
      mat4.multiply(mat4.create(), projection, mat4.lookAt(mat4.create(), vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues( 0.0,-1.0, 0.0), vec3.fromValues(0.0, 0.0,-1.0))),
      mat4.multiply(mat4.create(), projection, mat4.lookAt(mat4.create(), vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues( 0.0, 0.0, 1.0), vec3.fromValues(0.0,-1.0, 0.0))),
      mat4.multiply(mat4.create(), projection, mat4.lookAt(mat4.create(), vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues( 0.0, 0.0,-1.0), vec3.fromValues(0.0,-1.0, 0.0)))
    ];
    
    this.envCubeMap = null;
    this.irrCubeMap = null;
    this.captureFBO = null;
    this.captureRBO = null;

    this.PrepareRenderObjects();
  }

  public get isReady(): boolean { return (this.state === State.Finished); }

  public get envMap(): TextureInfo { 
    return {
      texture: this.envCubeMap,
      type: TextureType.TextureCubeMap,
      width: this.envSize,
      height: this.envSize
    }; 
  }

  public get irrMap(): TextureInfo { 
    return {
      texture: this.irrCubeMap,
      type: TextureType.TextureCubeMap,
      width: this.irrSize,
      height: this.irrSize
    }; 
  }

  public set image(image: string) {
    this.state = State.LoadRadianceTexture;
    this.shpereMap = this.converter.CreateRadianceHDRTexture(image);
  }

  public update() {
    switch (this.state) {
      case State.LoadRadianceTexture: {
        if (this.shpereMap && this.shpereMap.texture) {
          this.RenderToEnvCubemap();
        }
        break;
      }
      case State.CalculateIrradianceMap: {
        this.RenderToIrrCubemap();
        break;
      }
      default:
        break;
    }
  }

  private ClearCubemap() {
    const gl = this.converter.context;
    if (this.envCubeMap) { gl.deleteTexture(this.envCubeMap); }
    if (this.irrCubeMap) { gl.deleteTexture(this.irrCubeMap); }
    this.envCubeMap = null;
    this.irrCubeMap = null;
  }

  private PrepareRenderObjects() {
    this.state = State.PrepareRenderObjects;

    const gl = this.converter.context;

    // create shader program
    this.rad2envProgram = {
      program: this.converter.CreateProgram(rad2envShader.vertSource, rad2envShader.fragSource)
    };

    this.rad2envProgram.attributes = {
      position: gl.getAttribLocation(this.rad2envProgram.program, "aPosition")
    };
    this.rad2envProgram.uniforms = {
      transforms: { viewProjMatrix: {location: gl.getUniformLocation(this.rad2envProgram.program, "uViewProjMatrix"), type: DataType.Float4x4} },
      others: { },
      textures: { sphereMap: {location: gl.getUniformLocation(this.rad2envProgram.program, 'uSphereMap'), index: 0} }
    };

    this.env2irrProgram = {
      program: this.converter.CreateProgram(env2irrShader.vertSource, env2irrShader.fragSource)
    };

    this.env2irrProgram.attributes = {
      position: gl.getAttribLocation(this.env2irrProgram.program, "aPosition")
    };
    this.env2irrProgram.uniforms = {
      transforms: { viewProjMatrix: {location: gl.getUniformLocation(this.env2irrProgram.program, "uViewProjMatrix"), type: DataType.Float4x4} },
      others: { },
      textures: { envMap: {location: gl.getUniformLocation(this.env2irrProgram.program, 'uEnvMap'), index: 0} }
    };

    // load model
    const cube = CreateSkybox();
    this.unitCube = new Drawable(cube, this.converter);
  }

  private RenderToEnvCubemap() {
    this.state = State.ConvertToEnvironmentMap;

    this.ClearCubemap();

    const gl = this.converter.context;

    this.captureFBO = gl.createFramebuffer();
    this.captureRBO = gl.createRenderbuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.captureFBO);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.captureRBO);

    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.envSize, this.envSize);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.captureRBO);

    const level = 0;
    const internalFormat = gl.RGB;
    const border = 0;
    const srcFormat = gl.RGB;
    const srcType = gl.FLOAT;

    const envCubeMap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, envCubeMap);
    for (let i = 0; i < this.cubemapTargets.length; ++i) {
      gl.texImage2D(this.cubemapTargets[i], level, internalFormat, this.envSize, this.envSize, border, srcFormat, srcType, null);
    }
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.envCubeMap = envCubeMap;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.useProgram(this.rad2envProgram.program);

    const sphereTex = this.rad2envProgram.uniforms.textures.sphereMap;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.shpereMap.texture);
    gl.uniform1i(sphereTex.location, 0);

    gl.viewport(0, 0, this.envSize, this.envSize);

    {
      const viewProjMatrix = this.rad2envProgram.uniforms.transforms.viewProjMatrix;
      const positionIndex = this.rad2envProgram.attributes.position;
      const indexBuffer = this.unitCube.buffers.indices;
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;

      for (let i = 0; i < this.cubemapTargets.length; ++i) {
        gl.uniformMatrix4fv(viewProjMatrix.location, false, this.viewProjMatrixes[i]);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.cubemapTargets[i], this.envCubeMap, 0);
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
    // gl.deleteFramebuffer(captureFBO);
    // gl.deleteRenderbuffer(captureRBO);

    // gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    // this.state = State.Finished;

    this.state = State.CalculateIrradianceMap;
  }

  private RenderToIrrCubemap() {
    const gl = this.converter.context;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.captureFBO);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.captureRBO);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.irrSize, this.irrSize);

    const level = 0;
    const internalFormat = gl.RGB;
    const border = 0;
    const srcFormat = gl.RGB;
    const srcType = gl.FLOAT;

    const irrCubeMap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, irrCubeMap);
    for (let i = 0; i < this.cubemapTargets.length; ++i) {
      gl.texImage2D(this.cubemapTargets[i], level, internalFormat, this.irrSize, this.irrSize, border, srcFormat, srcType, null);
    }
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.irrCubeMap = irrCubeMap;

    gl.useProgram(this.env2irrProgram.program);

    const envMap = this.env2irrProgram.uniforms.textures.envMap;
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.envCubeMap);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(envMap.location, 0);

    gl.viewport(0, 0, this.irrSize, this.irrSize);
    // gl.bindFramebuffer(gl.FRAMEBUFFER, captureFBO);

    {
      const viewProjMatrix = this.env2irrProgram.uniforms.transforms.viewProjMatrix;
      const positionIndex = this.env2irrProgram.attributes.position;
      const indexBuffer = this.unitCube.buffers.indices;
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;

      for (let i = 0; i < this.cubemapTargets.length; ++i) {
        gl.uniformMatrix4fv(viewProjMatrix.location, false, this.viewProjMatrixes[i]);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.cubemapTargets[i], this.irrCubeMap, 0);
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
    // gl.deleteFramebuffer(captureFBO);
    // gl.deleteRenderbuffer(captureRBO);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    this.state = State.Finished;
  }

}