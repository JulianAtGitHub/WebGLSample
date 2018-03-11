import { vec3, mat4 } from "gl-matrix";

export class Camera {
  readonly eye: vec3;
  readonly lookAt: vec3;
  readonly up: vec3;

  readonly fieldOfView: number;   // in radians
  readonly aspect: number;        // ratio of width divided by height
  readonly near: number;
  readonly far: number;

  private _viewMatrix: mat4;
  private _projMatrix: mat4;
  private _viewProjMatrix: mat4;

  private _isDirty: boolean;

  constructor(fov: number, aspect: number) {
    this.eye = vec3.fromValues(0.0, 0.0, 0.0);
    this.lookAt = vec3.fromValues(0.0, 0.0, -1.0);
    this.up = vec3.fromValues(0.0, 1.0, 0.0);

    this.fieldOfView = fov;
    this.aspect = aspect;
    this.near = 0.1;
    this.far = 100.0;

    this._isDirty = true;
  }

  private CalculateMatrixs(): void {
    this._viewMatrix = mat4.create();
    this._projMatrix = mat4.create();
    this._viewProjMatrix = mat4.create();
    
    mat4.lookAt(
      this._viewMatrix,
      this.eye,
      this.lookAt,
      this.up
    );

    mat4.perspective(
      this._projMatrix,
      this.fieldOfView,
      this.aspect,
      this.near,
      this.far
    );

    mat4.multiply(
      this._viewProjMatrix, 
      this._projMatrix, 
      this._viewMatrix
    );
  }

  get viewMatrix(): mat4 {
    if (this._isDirty) {
      this.CalculateMatrixs();
      this._isDirty = false;
    }
    return this._viewMatrix;
  }

  get projMatrix(): mat4 {
    if (this._isDirty) {
      this.CalculateMatrixs();
      this._isDirty = false;
    }
    return this._projMatrix;
  }

  get viewProjMatrix(): mat4 {
    if (this._isDirty) {
      this.CalculateMatrixs();
      this._isDirty = false;
    }
    return this._viewProjMatrix;
  }
}
