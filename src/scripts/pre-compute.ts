import * as _ from "lodash";
import { vec3, mat4 } from "gl-matrix";
import { TextureInfo, Converter } from "./converter";
import { Program } from "./program";
import { DataType, TextureType, CreateSkybox } from "./model";
import { Drawable } from "./drawable";

// Spherical map to cubic map
const rad2envShader = {
  vertSource: `
  attribute vec3 a_position;
  uniform mat4 u_viewProjMatrix;
  varying vec3 v_position;
  void main(void) {
    v_position = a_position;
    gl_Position = u_viewProjMatrix * vec4(a_position, 1.0);
  }`,

  fragSource: `
  precision mediump float;
  varying vec3 v_position;
  uniform sampler2D u_sphereMap;
  const vec2 invAtan = vec2(0.1591, 0.3183);
  vec2 SampleSphereMap(vec3 v) {
    vec2 uv = vec2(atan(v.z, v.x), asin(v.y));
    uv *= invAtan;
    uv += 0.5;
    return uv;
  }
  void main(void) {
    vec2 uv = SampleSphereMap(normalize(v_position));
    // vec3 color = texture2D(u_sphereMap, uv).rgb;
    vec3 color = texture2D(u_sphereMap, vec2(uv.x, 1.0 - uv.y)).rgb;
    gl_FragColor = vec4(color, 1.0);
  }`
};

const env2irrShader = {
  vertSource: rad2envShader.vertSource,
  fragSource: `
  precision mediump float;
  varying vec3 v_position;
  uniform samplerCube u_envMap;
  const float PI = 3.14159265359;
  const float PI_2 = 1.570796326795; // PI / 2.0
  const float PI2 = 6.28318530718;  // PI * 2.0
  const float sampleDelta = 0.025;
  void main(void) {
    // The world vector acts as the normal of a tangent surface from the origin, aligned to vPosition. 
    // Given this normal, calculate all incoming radiance of the environment. 
    // The result of this radiance is the radiance of light coming from -Normal direction, 
    // which is what we use in the PBR shader to sample irradiance.
    vec3 N = normalize(v_position);
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
        irradiance += textureCube(u_envMap, worldSample).rgb * cos(theta) * sin(theta);
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

export class PreCompute {

  private state: State;
  private rad2envProgram: Program;
  private env2irrProgram: Program;
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
    this.rad2envProgram = new Program(this.converter, {
      vertFile: undefined,
      fragFile: undefined,
      vertSource: rad2envShader.vertSource,
      fragSource: rad2envShader.fragSource,
      attributes: { "a_position": DataType.Float3 },
      uniforms: {
        textures: { "u_sphereMap": TextureType.Texture2D },
        others: { "u_viewProjMatrix": DataType.Float4x4 }
      }
    });

    this.env2irrProgram = new Program(this.converter, {
      vertFile: undefined,
      fragFile: undefined,
      vertSource: env2irrShader.vertSource,
      fragSource: env2irrShader.fragSource,
      attributes: { "a_position": DataType.Float3 },
      uniforms: {
        textures: { "u_envMap": TextureType.TextureCubeMap },
        others: { "u_viewProjMatrix": DataType.Float4x4 }
      }
    });

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

    this.rad2envProgram.Use();

    this.rad2envProgram.SetTexture("u_sphereMap", this.shpereMap.texture, this.shpereMap.type);

    gl.viewport(0, 0, this.envSize, this.envSize);

    {
      const indexBuffer = this.unitCube.buffers.indices;
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;

      for (let i = 0; i < this.cubemapTargets.length; ++i) {
        this.rad2envProgram.SetUniform("u_viewProjMatrix", this.viewProjMatrixes[i], DataType.Float4x4);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.cubemapTargets[i], this.envCubeMap, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const positions = this.unitCube.buffers.positions;
        this.rad2envProgram.SetAttribute("a_position", positions.buffer, positions.rawDataType);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer);
        const vertexCount = indexBuffer.rawData.length;

        gl.drawElements(gl.TRIANGLES, vertexCount, gl.UNSIGNED_SHORT, 0);
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

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

    this.env2irrProgram.Use();

    this.env2irrProgram.SetTexture("u_envMap", this.envCubeMap, TextureType.TextureCubeMap);

    gl.viewport(0, 0, this.irrSize, this.irrSize);

    {
      const indexBuffer = this.unitCube.buffers.indices;
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;

      for (let i = 0; i < this.cubemapTargets.length; ++i) {
        this.env2irrProgram.SetUniform("u_viewProjMatrix", this.viewProjMatrixes[i], DataType.Float4x4);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.cubemapTargets[i], this.irrCubeMap, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const positions = this.unitCube.buffers.positions;
        this.env2irrProgram.SetAttribute("a_position", positions.buffer, positions.rawDataType);

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