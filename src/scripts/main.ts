import { LightInfo, TextureInfo, GLSystem } from "./gl-system";
import { Renderer } from "./renderer";
import { Model, CreateSkybox, CreateSphere, CreateQuad } from "./model";
import { Drawable } from "./drawable";
import { Camera } from "./camera";
import { vec3 } from "gl-matrix";
import * as Utils from "./utilities";
import { PreCompute } from "./pre-compute";

function SetIBLTextureToDrawable(drawable: Drawable, preCompute: PreCompute) {
  if (!drawable || !preCompute) {
    return;
  }

  drawable.textures.irradianceMap = preCompute.irrMap;
  drawable.textures.prefilterMap = preCompute.filMap;
  drawable.textures.brdfMap = preCompute.brdfMap;
}

function Main(canvasId: string) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  const gl = canvas.getContext("webgl");
  if (!gl) {
    alert("Unable to initialize WebGL. Your browser or machine may not support it.");
    return;
  }

  const glSystem = new GLSystem(gl);
  if (!glSystem.isReliable) {
    return;
  }

  const renderer = new Renderer(glSystem);

  const preCompute = new PreCompute(glSystem);
  preCompute.image = "assets/Mans_Outside_2k.hdr";

  const pbr = Utils.CreatePbrProgram(glSystem);
  const pbrNoTextured = Utils.CreatePbrNoTexturedProgram(glSystem);
  const skybox = Utils.CreateSkyboxProgram(glSystem);

  const light: LightInfo = {
    position: vec3.fromValues(-10.0, 10.0, 10.0), 
    color: vec3.fromValues(300.0, 300.0, 300.0)
  };

  const camera = new Camera((45 * Math.PI / 180), (canvas.clientWidth / canvas.clientHeight));
  camera.HandleMouseInput(canvas);

  const goldSphere = Utils.CreateGoldenSphere(glSystem);
  const plasticSphere = Utils.CreatePlasticSphere(glSystem);
  const ironSphere = Utils.CreateIronSphere(glSystem);
  const sphere = Utils.CreateNoTexturedSphere(glSystem);
  const box = new Drawable(CreateSkybox(), glSystem);

  goldSphere.move([-1.1, 1.1, -8.0]);
  plasticSphere.move([-1.1, -1.1, -8.0]);
  ironSphere.move([1.1, -1.1, -8.0]);
  sphere.move([1.1, 1.1, -8.0]);

  // debug
  const debugTexture2D = Utils.CreateDebugTexture2DProgram(glSystem);
  const quad = new Drawable(CreateQuad(), glSystem);

  // html elements
  const metallicSlider: any = document.getElementById("metallic");
  metallicSlider.oninput = () => {
    sphere.values.metallic = metallicSlider.value / 100.0;
  };

  const roughnessSlider: any = document.getElementById("roughness");
  roughnessSlider.oninput = () => {
    sphere.values.roughness = roughnessSlider.value / 100.0;
  };

  const aoSlider: any = document.getElementById("ao");
  aoSlider.oninput = () => {
    sphere.values.ao = aoSlider.value / 100.0;
  };

  const albedoCP: any = document.getElementById("albedo");
  albedoCP.addEventListener("change", (event: any) => {
    const hexColor = event.target.value;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
    const r = parseInt(result[1], 16) / 255.0;
    const g = parseInt(result[2], 16) / 255.0;
    const b = parseInt(result[3], 16) / 255.0;
    sphere.values.albedo = vec3.fromValues(r, g, b);
  }, false);

  // Draw the scene repeatedly
  let then = 0;
  let pbrImageSetted = false;
  const render = (now: number) => {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

    ironSphere.rotate([0.0, deltaTime * 0.1, 0.0]);
    goldSphere.rotate([0.0, deltaTime * 0.1, 0.0]);
    plasticSphere.rotate([0.0, deltaTime * 0.1, 0.0]);

    if (preCompute.isReady) {
      if (!pbrImageSetted) {
        SetIBLTextureToDrawable(ironSphere, preCompute);
        SetIBLTextureToDrawable(goldSphere, preCompute);
        SetIBLTextureToDrawable(plasticSphere, preCompute);
        SetIBLTextureToDrawable(sphere, preCompute);

        box.textures.envMap = preCompute.envMap;
        pbrImageSetted = true;
      }

      renderer.Clear();
      // scene 
      renderer.Draw(camera, ironSphere, light, pbr);
      renderer.Draw(camera, goldSphere, light, pbr);
      renderer.Draw(camera, plasticSphere, light, pbr);
      renderer.Draw(camera, sphere, light, pbrNoTextured);
      // skybox
      renderer.Draw(camera, box, null, skybox);

      // debug
      // gl.viewport(0, 0, 512, 512);
      // quad.textures.texture2D = preCompute.brdfMap;
      // renderer.Draw(camera, quad, null, debugTexture2D);

    } else {
      preCompute.update();
    }

    requestAnimationFrame(render);
  };

  requestAnimationFrame(render);

}

Main("glCanvas");
