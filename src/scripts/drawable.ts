import * as _ from "lodash";
import { vec3, mat4, mat3 } from "gl-matrix";
import { PrimitiveMode, Data, Model } from "./model";
import { TextureInfo, BufferInfo, GLSystem} from "./gl-system";

export class Drawable {
  public buffers: {[id: string]: BufferInfo};
  public textures: {[id: string]: TextureInfo};
  public values: {[id: string]: any};

  private _primitiveMode: PrimitiveMode;
  public get primitiveMode(): PrimitiveMode { return this._primitiveMode; }

  private _position: vec3;
  private _rotation: vec3;
  private _scale: vec3;
  private _modelMatrix: mat4;
  private _normalMatrix: mat3;

  private _isDirty: boolean;

  constructor(model: Model, glSystem: GLSystem) {
    this._position = vec3.fromValues(0.0, 0.0, 0.0);
    this._rotation = vec3.fromValues(0.0, 0.0, 0.0);
    this._scale = vec3.fromValues(1.0, 1.0, 1.0);

    this.buffers = {};
    this.LoadBuffers(model, glSystem);

    this.textures = {};
    this.LoadTextures(model, glSystem);

    this.values = {};
    this.CopyMaterialValues(model);

    this._isDirty = true;
  }

  private LoadBuffers(model: Model, glSystem: GLSystem) {
    if (!model || !glSystem) {
      return;
    }

    if (model.positions) { this.buffers.positions = this.LoadBuffer(model.positions, glSystem, {isElement: false}); }
    if (model.normals) { this.buffers.normals = this.LoadBuffer(model.normals, glSystem, {isElement: false}); }
    if (model.texCoords) { this.buffers.texCoords = this.LoadBuffer(model.texCoords, glSystem, {isElement: false}); }
    if (model.colors) { this.buffers.colors = this.LoadBuffer(model.colors, glSystem, {isElement: false}); }
    if (model.indices) { this.buffers.indices = this.LoadBuffer(model.indices, glSystem, {isElement: true}); }
    this._primitiveMode = model.primitive;
  }

  private LoadBuffer(data: Data, glSystem: GLSystem, options: {isElement: boolean}): BufferInfo {
    if (!data || !glSystem) {
      return null;
    }

    const bufferInfo = {
      rawData: data.data,
      rawDataType: data.type,
      buffer: options.isElement ? glSystem.CreateElementBuffer(data) : glSystem.CreateBuffer(data)
    };

    return bufferInfo;
  }

  private LoadTextures(model: Model, glSystem: GLSystem) {
    if (!model || !glSystem) {
      return;
    }

    if (model.normalMap) { this.textures.normalMap = glSystem.CreateTexture(model.normalMap); }

    if (model.diffuseMap) { this.textures.diffuseMap = glSystem.CreateTexture(model.diffuseMap); }
    if (model.specularMap) { this.textures.specularMap = glSystem.CreateTexture(model.specularMap); }

    if (model.albedoMap) { this.textures.albedoMap = glSystem.CreateTexture(model.albedoMap); }
    if (model.metallicMap) { this.textures.metallicMap = glSystem.CreateTexture(model.metallicMap); }
    if (model.roughnessMap) { this.textures.roughnessMap = glSystem.CreateTexture(model.roughnessMap); }
    if (model.aoMap) { this.textures.aoMap = glSystem.CreateTexture(model.aoMap); }
  }

  private CopyMaterialValues(model: Model) {
    if (!model) {
      return;
    }

    _.assign(this.values, {
      albedo: model.albedo,
      metallic: model.metallic,
      roughness: model.roughness,
      ao: model.ao
    });
  }

  private CalculateMatrix() {
    let tempMatrix = mat4.create();

    this._modelMatrix = mat4.create();
    this._normalMatrix = mat3.create();

    mat4.fromScaling(tempMatrix, this._scale);
    mat4.multiply(this._modelMatrix, tempMatrix, this._modelMatrix);

    mat4.fromXRotation(tempMatrix, this._rotation[0]);
    mat4.multiply(this._modelMatrix, tempMatrix, this._modelMatrix);
    mat4.fromYRotation(tempMatrix, this._rotation[1]);
    mat4.multiply(this._modelMatrix, tempMatrix, this._modelMatrix);
    mat4.fromZRotation(tempMatrix, this._rotation[2]);
    mat4.multiply(this._modelMatrix, tempMatrix, this._modelMatrix);

    mat4.fromTranslation(tempMatrix, this._position);
    mat4.multiply(this._modelMatrix, tempMatrix, this._modelMatrix);

    // mat4.invert(tempMatrix, this._modelMatrix);
    // mat4.transpose(tempMatrix2, tempMatrix);
    mat3.normalFromMat4(this._normalMatrix, this._modelMatrix);
  }

  get modelMatrix(): mat4 {
    if (this._isDirty) {
      this.CalculateMatrix();
      this._isDirty = false;
    }

    return this._modelMatrix;
  }

  get normalMatrix(): mat3 {
    if (this._isDirty) {
      this.CalculateMatrix();
      this._isDirty = false;
    }

    return this._normalMatrix;
  }

  get position(): vec3 {
    return this.position;
  }

  get rotation(): vec3 {
    return this.rotation;
  }

  get scale(): vec3 {
    return this.scale;
  }

  public move(v: vec3 | number[]) {
    vec3.add(this._position, this._position, v);
    this._isDirty = true;
  }

  public rotate(r: vec3 | number[]) {
    vec3.add(this._rotation, this._rotation, r);
    this._isDirty = true;
  }
}
