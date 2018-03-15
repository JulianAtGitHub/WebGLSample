import { vec3, mat4 } from "gl-matrix";

export class Camera {
  readonly eye: vec3;
  readonly lookAt: vec3;
  readonly up: vec3;

  readonly fieldOfView: number;   // in radians
  readonly aspect: number;        // ratio of width divided by height
  readonly near: number;
  readonly far: number;

  // input
  private _mouseDown = false;
  private _lastX = 0;
  private _lastY = 0;
  private _xRotation = 0;
  private _yRotation = 0;

  private _rotationX = 0;
  private _rotationY = 0;

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

    let lookAt = vec3.rotateY(vec3.create(), this.lookAt, this.eye, this._rotationX);
    lookAt = vec3.rotateX(lookAt, lookAt, this.eye, this._rotationY);

    let up = vec3.rotateY(vec3.create(), this.up, this.eye, this._rotationX);
    up = vec3.rotateX(up, up, this.eye, this._rotationY);
    
    mat4.lookAt(
      this._viewMatrix,
      this.eye,
      lookAt,
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

  public get viewMatrix(): mat4 {
    if (this._isDirty) {
      this.CalculateMatrixs();
      this._isDirty = false;
    }
    return this._viewMatrix;
  }

  public get projMatrix(): mat4 {
    if (this._isDirty) {
      this.CalculateMatrixs();
      this._isDirty = false;
    }
    return this._projMatrix;
  }

  public get viewProjMatrix(): mat4 {
    if (this._isDirty) {
      this.CalculateMatrixs();
      this._isDirty = false;
    }
    return this._viewProjMatrix;
  }

  // handle input
  public HandleMouseInput(canvas: HTMLCanvasElement) {
    canvas.addEventListener("mousedown", (ev) => this.MouseDownHandler(ev), false);
    canvas.addEventListener("mousemove", (ev) => this.MouseMoveHandler(ev), false);
    canvas.addEventListener("mouseup", (ev) => this.MouseUpHandler(ev), false);
  }

  private MouseDownHandler(ev: MouseEvent): boolean {
    this._mouseDown = true;
    this._lastX = ev.screenX;
    this._lastY = ev.screenY;
    return true;
  }

  private MouseMoveHandler(ev: MouseEvent): boolean {
    if (!this._mouseDown) { return false; }
  
    const deltaX = ev.screenX - this._lastX;
    this._lastX = ev.screenX;
    this._xRotation -= deltaX * 0.25;
    if (this._xRotation < -45.0) { this._xRotation = -45.0; }
    if (this._xRotation > 45.0) { this._xRotation = 45.0; }
  
    const deltaY = ev.screenY - this._lastY;
    this._lastY = ev.screenY;
    this._yRotation -= deltaY * 0.25;
    if (this._yRotation < -45.0) { this._yRotation = -45.0; }
    if (this._yRotation > 45.0) { this._yRotation = 45.0; }

    this.SetRotation(this._xRotation, this._yRotation);
  
    return true;
  }

  private MouseUpHandler(ev: MouseEvent): void {
    this._mouseDown = false;
  }

  private SetRotation(x: number, y: number) {
    x = x * (Math.PI / 180.0);
    y = y * (Math.PI / 180.0);

    this._rotationX = x;
    if (this._rotationX > this.fieldOfView) {this._rotationX = this.fieldOfView;}
    if (this._rotationX < -this.fieldOfView) {this._rotationX = -this.fieldOfView;}

    this._rotationY = y;
    if (this._rotationY > this.fieldOfView) {this._rotationY = this.fieldOfView;}
    if (this._rotationY < -this.fieldOfView) {this._rotationY = -this.fieldOfView;}

    this._isDirty = true;
  }
}
