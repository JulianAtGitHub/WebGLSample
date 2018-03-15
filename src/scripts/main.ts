import { LightInfo, ProgramInfo, TextureInfo, Converter } from "./converter";
import { Painter } from "./painter";
import { Model, CreateSkybox, CreateSphere } from "./model";
import { Drawable } from "./drawable";
import { Camera } from "./camera";
import { vec3 } from "gl-matrix";
import * as Utils from "./utilities";
import { Sphere2Cube } from "./sphere2cube";

function EnableNeededExtensions(gl: WebGLRenderingContext): boolean {
  if (!gl.getExtension('OES_standard_derivatives')) {
    alert("OES_standard_derivatives is not supported!");
    return false;
  }
  if (!gl.getExtension('OES_texture_float')) {
    alert("OES_texture_float is not supported!");
    return false;
  }
  if (!gl.getExtension('OES_texture_float_linear')) {
    alert("OES_texture_float_linear is not supported!");
    return false;
  }

  return true;
}

function Main(canvasId: string) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  const gl = canvas.getContext("webgl");
  if (!gl) {
    alert("Unable to initialize WebGL. Your browser or machine may not support it.");
    return;
  }

  if (EnableNeededExtensions(gl) === false) {
    return;
  }

  const converter = new Converter(gl);
  const painter = new Painter(gl);

  const sphere2Cube = new Sphere2Cube(converter);
  sphere2Cube.image = "assets/newport_loft.hdr";

  const pbr = Utils.SetupPbrProgram(converter);
  const skybox = Utils.SetupSkyboxProgram(converter);

  const light: LightInfo = {
    position: vec3.fromValues(75.0, 75.0, 100.0), 
    color: vec3.fromValues(500.0, 500.0, 500.0)
  };

  const camera = new Camera((45 * Math.PI / 180), (canvas.clientWidth / canvas.clientHeight));
  camera.HandleMouseInput(canvas);

  const shpereModel = CreateSphere();
  shpereModel.albedoMap = "assets/iron_albedo.png";
  shpereModel.normalMap = "assets/iron_normal.png";
  shpereModel.metallicMap = "assets/iron_metallic.png";
  shpereModel.roughnessMap = "assets/iron_roughness.png";
  shpereModel.aoMap = "assets/iron_ao.png";

  const sphere = new Drawable(shpereModel, converter);
  sphere.move([0.0, 0.0, -6.0]);

  const boxModel = CreateSkybox();
  const box = new Drawable(boxModel, converter);

  // const metallicSlider: any = document.getElementById("metallic");
  // metallicSlider.oninput = () => {
  //   // sphere.values.metallic = metallicSlider.value / 100.0;
  //   // console.log("metallic:" + sphere.values.metallic);
  // };

  // const roughnessSlider: any = document.getElementById("roughness");
  // roughnessSlider.oninput = () => {
  //   // sphere.values.roughness = roughnessSlider.value / 100.0;
  //   // console.log("roughness:" + sphere.values.roughness);
  // };

  let then = 0;
  // Draw the scene repeatedly
  const render = (now: number) => {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

    sphere.rotate([0.0, deltaTime * 0.5, 0.0]);

    if (sphere2Cube.isReady) {
      painter.Clear();
      painter.Draw(camera, sphere, light, pbr);
      // box.textures.envMap = sphere2Cube.envMap;
      painter.Draw(camera, box, null, skybox);
    } else {
      sphere2Cube.update();
    }

    requestAnimationFrame(render);
  };

  requestAnimationFrame(render);

}

Main("glCanvas");
