// import * as $ from "jquery";

// export function LoadTextFile(file: string, complete: (text: string, error: string) => void) {
//   $.ajax({ 
//     url: file, 
//     dataType: 'text',
//     success: (data, status) => {
//       complete && complete(data, undefined);
//     },
//     error: (jqXHR, status, error) => {
//       complete && complete(undefined, error);
//     }
//   });
// }

// export function ProgramSource(vsFile: string, fsFile: string, complete: (vsSource: string, fsSource: string) => void) {
//   LoadTextFile(vsFile, (vsSource, error) => {
//     if (error) {
//       console.warn("Error:" + error);
//       return;
//     }
//     LoadTextFile(fsFile, (fsSource, error) => {
//       if (error) {
//         console.warn("Error:" + error);
//         return;
//       }
//       complete && complete(vsSource, fsSource);
//     });
//   });
// }

// return value is power of two
export function IsPOT(value: number) {
  return (value & (value - 1)) == 0;
}