import { LightInfo, ProgramInfo, Converter } from "./converter";
import { Painter } from "./painter";
import { Model, CreateCube, DataType, CreateSphere } from "./model";
import { Drawable } from "./drawable";
import { Camera } from "./camera";
import { vec3 } from "gl-matrix";

function SetupPhongProgram(converter: Converter): ProgramInfo {
  const program: ProgramInfo = {
    program: null,
  };

  converter.CreateShaderProgram("assets/phong.vs", "assets/phong.fs", (shaderProgram: WebGLProgram) => {
    const gl = converter.context;
    program.program = shaderProgram;
    program.attributes = {
      position: gl.getAttribLocation(shaderProgram, "aPosition"),
      normal: gl.getAttribLocation(shaderProgram, "aNormal"),
      texCoord: gl.getAttribLocation(shaderProgram, "aTexCoord")
    };
    program.uniforms = {};
    program.uniforms.transforms = {
      modelMatrix: {location: gl.getUniformLocation(shaderProgram, "uModelMatrix"), type: DataType.Float4x4},
      normalMatrix: {location: gl.getUniformLocation(shaderProgram, "uNormalMatrix"), type: DataType.Float3x3},
      viewProjMatrix: {location: gl.getUniformLocation(shaderProgram, "uViewProjMatrix"), type: DataType.Float4x4},
    };
    program.uniforms.others = {
      viewPosition: {location: gl.getUniformLocation(shaderProgram, "uViewPos"), type: DataType.Float3},
      lightPosition: {location: gl.getUniformLocation(shaderProgram, "uLightPos"), type: DataType.Float3}
    };
    program.uniforms.textures = {
      diffuseMap: {location: gl.getUniformLocation(shaderProgram, 'uDiffuseMap'), index: 0}
    };
  });

  return program;
}

function SetupPbrProgram(converter: Converter): ProgramInfo {
  const program: ProgramInfo = {
    program: null,
  };

  converter.CreateShaderProgram("assets/pbr.vs", "assets/pbr.fs", (shaderProgram: WebGLProgram) => {
    const gl = converter.context;
    program.program = shaderProgram;
    program.attributes = {
      position: gl.getAttribLocation(shaderProgram, "aPosition"),
      normal: gl.getAttribLocation(shaderProgram, "aNormal"),
      texCoord: gl.getAttribLocation(shaderProgram, "aTexCoord")
    };
    program.uniforms = {};
    program.uniforms.transforms = {
      modelMatrix: {location: gl.getUniformLocation(shaderProgram, "uModelMatrix"), type: DataType.Float4x4},
      normalMatrix: {location: gl.getUniformLocation(shaderProgram, "uNormalMatrix"), type: DataType.Float3x3},
      viewProjMatrix: {location: gl.getUniformLocation(shaderProgram, "uViewProjMatrix"), type: DataType.Float4x4},
    };
    program.uniforms.others = {
      viewPos: {location: gl.getUniformLocation(shaderProgram, "uViewPos"), type: DataType.Float3},
      lightPos: {location: gl.getUniformLocation(shaderProgram, "uLightPos"), type: DataType.Float3},
      lightColor: {location: gl.getUniformLocation(shaderProgram, "uLightColor"), type: DataType.Float3},
      albedo: {location: gl.getUniformLocation(shaderProgram, "uAlbedo"), type: DataType.Float3},
      metallic: {location: gl.getUniformLocation(shaderProgram, "uMetallic"), type: DataType.Float},
      roughness: {location: gl.getUniformLocation(shaderProgram, "uRoughness"), type: DataType.Float},
      ao: {location: gl.getUniformLocation(shaderProgram, "uAO"), type: DataType.Float}
    };
    program.uniforms.textures = {

    };
  });

  return program;
}

function Main(canvasId: string) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  const gl = canvas.getContext("webgl");
  if (!gl) {
    alert("Unable to initialize WebGL. Your browser or machine may not support it.");
    return;
  }

  const converter = new Converter(gl);
  const pbr = SetupPbrProgram(converter);

  const painter = new Painter(gl);
  const light: LightInfo = {
    position: vec3.fromValues(75.0, 75.0, 100.0), 
    color: vec3.fromValues(1000.0, 1000.0, 1000.0)
  };
  const camera = new Camera((45 * Math.PI / 180), (canvas.clientWidth / canvas.clientHeight));

  const shpereModel = CreateSphere();
  shpereModel.albedo = vec3.fromValues(0.75, 0.0, 0.0);
  shpereModel.metallic = 0.5;
  shpereModel.roughness = 0.5;
  shpereModel.ao = 1.0;
  const sphere = new Drawable(shpereModel, converter);

  const metallicSlider: any = document.getElementById("metallic");
  metallicSlider.oninput = () => {
    sphere.values.metallic = metallicSlider.value / 100.0;
    // console.log("metallic:" + sphere.values.metallic);
  };

  const roughnessSlider: any = document.getElementById("roughness");
  roughnessSlider.oninput = () => {
    sphere.values.roughness = roughnessSlider.value / 100.0;
    // console.log("roughness:" + sphere.values.roughness);
  };

  sphere.move([0.0, 0.0, -6.0]);

  let then = 0;
  // Draw the scene repeatedly
  const render = (now: number) => {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

    // sphere.rotate([0.0, deltaTime * 0.7, deltaTime]);

    painter.Draw(camera, sphere, light, pbr);

    requestAnimationFrame(render);
  };

  requestAnimationFrame(render);

}

Main("glCanvas");
