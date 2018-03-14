import { LightInfo, ProgramInfo, TextureInfo, Converter } from "./converter";
import { Painter } from "./painter";
import { Model, CreateSkybox, CreateSphere } from "./model";
import { Drawable } from "./drawable";
import { Camera } from "./camera";
import { vec3 } from "gl-matrix";
import * as Utils from "./utilities";

// function GenEnvMap(gl: WebGLRenderingContext, sphereTex: TextureInfo) {
//   if (!sphereTex.texture) {
//     return;
//   }

//   const captureFBO = gl.createFramebuffer();
//   const captureRBO = gl.createRenderbuffer();
//   gl.bindFramebuffer(gl.FRAMEBUFFER, captureFBO);
//   gl.bindRenderbuffer(gl.RENDERBUFFER, captureRBO);
//   gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 512, 512);
//   gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, captureRBO);

//   const envCubeMap = gl.createTexture();
//   gl.bindTexture(gl.TEXTURE_CUBE_MAP, envCubeMap);

// }

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
  // const sphereTex = converter.CreateRadianceHDRTexture("assets/newport_loft.hdr");
  const pbr = Utils.SetupPbrProgram(converter);

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
