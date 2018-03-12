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
      lightColor: {location: gl.getUniformLocation(shaderProgram, "uLightColor"), type: DataType.Float3}
    };
    program.uniforms.textures = {
      normalMap: {location: gl.getUniformLocation(shaderProgram, 'uNormalMap'), index: 0},
      albedoMap: {location: gl.getUniformLocation(shaderProgram, 'uAlbedoMap'), index: 1},
      metallicMap: {location: gl.getUniformLocation(shaderProgram, 'uMetallicMap'), index: 2},
      roughnessMap: {location: gl.getUniformLocation(shaderProgram, 'uRoughnessMap'), index: 3},
      aoMap: {location: gl.getUniformLocation(shaderProgram, 'uAOMap'), index: 4}
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

  // enabling extensions
  if (!gl.getExtension('OES_standard_derivatives')) {
    alert("OES_standard_derivatives is not supported!");
    return;
  }

  const converter = new Converter(gl);
  const pbr = SetupPbrProgram(converter);

  const painter = new Painter(gl);
  const light: LightInfo = {
    position: vec3.fromValues(75.0, 75.0, 100.0), 
    color: vec3.fromValues(500.0, 500.0, 500.0)
  };
  const camera = new Camera((45 * Math.PI / 180), (canvas.clientWidth / canvas.clientHeight));

  const shpereModel = CreateSphere();
  shpereModel.albedoMap = "assets/iron_albedo.png";
  shpereModel.normalMap = "assets/iron_normal.png";
  shpereModel.metallicMap = "assets/iron_metallic.png";
  shpereModel.roughnessMap = "assets/iron_roughness.png";
  shpereModel.aoMap = "assets/iron_ao.png";

  const sphere = new Drawable(shpereModel, converter);

  const metallicSlider: any = document.getElementById("metallic");
  metallicSlider.oninput = () => {
    // sphere.values.metallic = metallicSlider.value / 100.0;
    // console.log("metallic:" + sphere.values.metallic);
  };

  const roughnessSlider: any = document.getElementById("roughness");
  roughnessSlider.oninput = () => {
    // sphere.values.roughness = roughnessSlider.value / 100.0;
    // console.log("roughness:" + sphere.values.roughness);
  };

  sphere.move([0.0, 0.0, -5.0]);

  let then = 0;
  // Draw the scene repeatedly
  const render = (now: number) => {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

    sphere.rotate([0.0, deltaTime * 0.5, 0.0]);

    painter.Draw(camera, sphere, light, pbr);

    requestAnimationFrame(render);
  };

  requestAnimationFrame(render);

}

Main("glCanvas");
