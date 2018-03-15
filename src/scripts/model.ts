import { vec3 } from "gl-matrix";

export enum IndexMode {
  TriangleList,
  TriangleStrip,
  TriangleFan
}

export enum DataType {
  Float,
  Float2,
  Float3,
  Float4,
  Float3x3,
  Float4x4,
  Int
}

export interface Data {
  type: DataType;
  data: number[];
}

export interface Model {
  positions: Data;
  normals?: Data;
  texCoords?: Data;
  colors?: Data;
  indices: Data;
  indexMode: IndexMode;

  // texture
  normalMap?: string;

  diffuseMap?: string;
  specularMap?: string;
  
  albedoMap?: string;
  metallicMap?: string;
  roughnessMap?: string;
  aoMap?: string;

  // material
  albedo?: vec3;
  metallic?: number;
  roughness?: number;
  ao?: number;
}

export function CreateSphere(): Model {
  const X_SEGMENTS = 64;
  const Y_SEGMENTS = 64;
  const PI = 3.14159265359;

  const positions: number[] = [];
  const texCoords: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y <= Y_SEGMENTS; ++y) {
    for (let x = 0; x <= X_SEGMENTS; ++x) {
      const xSegment = x / X_SEGMENTS;
      const ySegment = y / Y_SEGMENTS;
      const xPos = Math.cos(xSegment * 2.0 * PI) * Math.sin(ySegment * PI);
      const yPos = Math.cos(ySegment * PI);
      const zPos = Math.sin(xSegment * 2.0 * PI) * Math.sin(ySegment * PI);

      positions.push(xPos, yPos, zPos);
      texCoords.push(xSegment, ySegment);
      normals.push(xPos, yPos, zPos);
    }
  }

  // TRIANGLE STRIP
  let oddRow = false;
  for (let y = 0; y < Y_SEGMENTS; ++y) {
    if (!oddRow) {
      // even rows: y == 0, y == 2; and so on
      for (let x = 0; x <= X_SEGMENTS; ++x) {
          indices.push(y       * (X_SEGMENTS + 1) + x);
          indices.push((y + 1) * (X_SEGMENTS + 1) + x);
      }
    } else {
      for (let x = X_SEGMENTS; x >= 0; --x) {
          indices.push((y + 1) * (X_SEGMENTS + 1) + x);
          indices.push(y       * (X_SEGMENTS + 1) + x);
      }
    }
    oddRow = !oddRow;
  }

  return {
    positions: {
      type: DataType.Float3,
      data: positions
    },
    normals: {
      type: DataType.Float3,
      data: normals
    },
    texCoords: {
      type: DataType.Float2,
      data: texCoords
    },
    indices: {
      type: DataType.Int,
      data: indices
    },
    indexMode: IndexMode.TriangleStrip,
  };
}

export function CreateSkybox(): Model {
  return {
    positions: {
      type: DataType.Float3,
      data: [
        // Back face
        -1.0, -1.0, -1.0, //0
        -1.0,  1.0, -1.0, //1
         1.0,  1.0, -1.0,  //2
         1.0, -1.0, -1.0,  //3
        // Front face
        -1.0, -1.0,  1.0, //4
         1.0, -1.0,  1.0, //5
         1.0,  1.0,  1.0, //6
        -1.0,  1.0,  1.0, //7
        // Left face
        -1.0, -1.0, -1.0, //8
        -1.0, -1.0,  1.0, //9
        -1.0,  1.0,  1.0, //10
        -1.0,  1.0, -1.0, //11
        // Right face
         1.0, -1.0, -1.0, //12
         1.0,  1.0, -1.0, //13
         1.0,  1.0,  1.0, //14
         1.0, -1.0,  1.0, //15
        // Bottom face
        -1.0, -1.0, -1.0, //16
         1.0, -1.0, -1.0, //17
         1.0, -1.0,  1.0, //18
        -1.0, -1.0,  1.0, //19
        // Top face
        -1.0,  1.0, -1.0, //20
        -1.0,  1.0,  1.0, //21
         1.0,  1.0,  1.0, //22
         1.0,  1.0, -1.0, //23
      ]
    },
    indices: {
      type: DataType.Int,
      data: [
        0,  2,  3,    2,  0,  1,    // back
        4,  5,  6,    6,  7,  4,    // front
        10, 11, 8,    8,  9, 10,    // left
        14, 12, 13,   12, 14, 15,   // right
        16, 17, 18,   18, 19, 16,   // bottom
        20, 22, 23,   22, 20, 21,   // top
      ]
    },
    indexMode: IndexMode.TriangleList
  };
}

// export function CreateCube(): Model {
//   return {

//     positions: {
//       type: DataType.Float3,
//       data: [
//         // Front face
//         -1.0, -1.0,  1.0,
//          1.0, -1.0,  1.0,
//          1.0,  1.0,  1.0,
//         -1.0,  1.0,  1.0,
//         // Back face
//         -1.0, -1.0, -1.0,
//         -1.0,  1.0, -1.0,
//          1.0,  1.0, -1.0,
//          1.0, -1.0, -1.0,
//         // Top face
//         -1.0,  1.0, -1.0,
//         -1.0,  1.0,  1.0,
//          1.0,  1.0,  1.0,
//          1.0,  1.0, -1.0,
//         // Bottom face
//         -1.0, -1.0, -1.0,
//          1.0, -1.0, -1.0,
//          1.0, -1.0,  1.0,
//         -1.0, -1.0,  1.0,
//         // Right face
//          1.0, -1.0, -1.0,
//          1.0,  1.0, -1.0,
//          1.0,  1.0,  1.0,
//          1.0, -1.0,  1.0,
//         // Left face
//         -1.0, -1.0, -1.0,
//         -1.0, -1.0,  1.0,
//         -1.0,  1.0,  1.0,
//         -1.0,  1.0, -1.0,
//       ]
//     },

//     texCoords: {
//       type: DataType.Float2,
//       data: [
//         // Front
//         0.0,  0.0,
//         1.0,  0.0,
//         1.0,  1.0,
//         0.0,  1.0,
//         // Back
//         0.0,  0.0,
//         1.0,  0.0,
//         1.0,  1.0,
//         0.0,  1.0,
//         // Top
//         0.0,  0.0,
//         1.0,  0.0,
//         1.0,  1.0,
//         0.0,  1.0,
//         // Bottom
//         0.0,  0.0,
//         1.0,  0.0,
//         1.0,  1.0,
//         0.0,  1.0,
//         // Right
//         0.0,  0.0,
//         1.0,  0.0,
//         1.0,  1.0,
//         0.0,  1.0,
//         // Left
//         0.0,  0.0,
//         1.0,  0.0,
//         1.0,  1.0,
//         0.0,  1.0,
//       ]
//     },

//     colors: {
//       type: DataType.Float3,
//       data: [
//         // Front face: white
//         1.0,  1.0,  1.0,
//         1.0,  1.0,  1.0,
//         1.0,  1.0,  1.0,
//         1.0,  1.0,  1.0,
//         // Back face: red
//         1.0,  0.0,  0.0,
//         1.0,  0.0,  0.0,
//         1.0,  0.0,  0.0,
//         1.0,  0.0,  0.0,
//         // Top face: green
//         0.0,  1.0,  0.0,
//         0.0,  1.0,  0.0,
//         0.0,  1.0,  0.0,
//         0.0,  1.0,  0.0,
//         // Bottom face: blue
//         0.0,  0.0,  1.0,
//         0.0,  0.0,  1.0,
//         0.0,  0.0,  1.0,
//         0.0,  0.0,  1.0,
//         // Right face: yellow
//         1.0,  1.0,  0.0,
//         1.0,  1.0,  0.0,
//         1.0,  1.0,  0.0,
//         1.0,  1.0,  0.0,
//         // Left face: purple
//         1.0,  0.0,  1.0,
//         1.0,  0.0,  1.0,
//         1.0,  0.0,  1.0,
//         1.0,  0.0,  1.0,
//       ]
//     },

//     indices: {
//       type: DataType.Int,
//       data: [
//         0,  1,  2,      0,  2,  3,    // front
//         4,  5,  6,      4,  6,  7,    // back
//         8,  9,  10,     8,  10, 11,   // top
//         12, 13, 14,     12, 14, 15,   // bottom
//         16, 17, 18,     16, 18, 19,   // right
//         20, 21, 22,     20, 22, 23,   // left
//       ]
//     },
//     indexMode: IndexMode.TriangleList,

//     diffuseMap: "assets/webgl-logo.png"
//   };

// }
