import { LightInfo, TextureInfo, GLSystem } from "./gl-system";
import { Renderer } from "./renderer";
import { Model, CreateSkybox, CreateSphere, CreateQuad } from "./model";
import { Drawable } from "./drawable";
import { Camera } from "./camera";
import { vec3 } from "gl-matrix";
import * as Utils from "./utilities";
import { PreCompute } from "./pre-compute";

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
  preCompute.image = "assets/newport_loft.hdr";

  const pbr = Utils.CreatePbrProgram(glSystem);
  const pbrNoTextured = Utils.CreatePbrNoTexturedProgram(glSystem);
  const skybox = Utils.CreateSkyboxProgram(glSystem);

  const light: LightInfo = {
    position: vec3.fromValues(10.0, 10.0, 10.0), 
    color: vec3.fromValues(300.0, 300.0, 300.0)
  };

  const camera = new Camera((45 * Math.PI / 180), (canvas.clientWidth / canvas.clientHeight));
  camera.HandleMouseInput(canvas);

  const ironSphereModel = CreateSphere();
  ironSphereModel.albedoMap = "assets/iron_albedo.png";
  ironSphereModel.normalMap = "assets/iron_normal.png";
  ironSphereModel.metallicMap = "assets/iron_metallic.png";
  ironSphereModel.roughnessMap = "assets/iron_roughness.png";
  ironSphereModel.aoMap = "assets/iron_ao.png";

  const ironSphere = new Drawable(ironSphereModel, glSystem);
  ironSphere.move([3.0, 0.0, -8.0]);

  const sphereModel = CreateSphere();
  sphereModel.albedo = vec3.fromValues(1.0, 1.0, 1.0);
  sphereModel.metallic = 0.5;
  sphereModel.roughness = 0.5;
  sphereModel.ao = 0.5;
  const sphere = new Drawable(sphereModel, glSystem);
  sphere.move([0.0, 0.0, -8.0]);

  const goldSphereModel = CreateSphere();
  goldSphereModel.albedoMap = "assets/gold_albedo.png";
  goldSphereModel.normalMap = "assets/gold_normal.png";
  goldSphereModel.metallicMap = "assets/gold_metallic.png";
  goldSphereModel.roughnessMap = "assets/gold_roughness.png";
  goldSphereModel.aoMap = "assets/gold_ao.png";

  const goldSphere = new Drawable(goldSphereModel, glSystem);
  goldSphere.move([-3.0, 0.0, -8.0]);

  const boxModel = CreateSkybox();
  const box = new Drawable(boxModel, glSystem);

  // debug
  const debugTexture2D = Utils.CreateDebugTexture2DProgram(glSystem);
  const quadModel = CreateQuad();
  const quad = new Drawable(quadModel, glSystem);

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

  const aoSlider: any = document.getElementById("ao");
  aoSlider.oninput = () => {
    sphere.values.ao = aoSlider.value / 100.0;
    // console.log("roughness:" + sphere.values.roughness);
  };

  let then = 0;
  let pbrImageSetted = false;
  // Draw the scene repeatedly
  const render = (now: number) => {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

    ironSphere.rotate([0.0, deltaTime * 0.5, 0.0]);
    goldSphere.rotate([0.0, deltaTime * 0.5, 0.0]);

    if (preCompute.isReady) {
      if (!pbrImageSetted) {
        ironSphere.textures.irradianceMap = preCompute.irrMap;
        ironSphere.textures.prefilterMap = preCompute.filMap;
        ironSphere.textures.brdfMap = preCompute.brdfMap;

        goldSphere.textures.irradianceMap = preCompute.irrMap;
        goldSphere.textures.prefilterMap = preCompute.filMap;
        goldSphere.textures.brdfMap = preCompute.brdfMap;

        sphere.textures.irradianceMap = preCompute.irrMap;
        sphere.textures.prefilterMap = preCompute.filMap;
        sphere.textures.brdfMap = preCompute.brdfMap;

        box.textures.envMap = preCompute.envMap;
        pbrImageSetted = true;
      }

      renderer.Clear();
      // scene 
      renderer.Draw(camera, ironSphere, light, pbr);
      renderer.Draw(camera, goldSphere, light, pbr);
      renderer.Draw(camera, sphere, light, pbrNoTextured);
      // skybox
      renderer.Draw(camera, box, null, skybox);

      // debug
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
