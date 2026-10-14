import { mkdir, writeFile } from 'node:fs/promises';
import { knotGeometry } from '../src/components/knotGeometry.ts';
import { projectRoot } from './project-root.mjs';
import path from 'node:path';

// Precompute ambient occlusion in the build, never in the visitor's main thread.
const geometry = knotGeometry();
// Signed normalized positions/normals keep subpixel precision, without sending
// seven 32-bit floats per vertex. The GPU reads the interleaved data directly.
const vertexCount = geometry.positions.length / 3;
const stride = 14;
const positionScale = 1.5;
const header = Buffer.alloc(24);
header.writeUInt32LE(0x544f4e4b, 0); // KNOT
header.writeUInt32LE(1, 4);
header.writeUInt32LE(vertexCount, 8);
header.writeUInt32LE(geometry.indices.length, 12);
header.writeFloatLE(positionScale, 16);
header.writeUInt32LE(stride, 20);
const vertices = Buffer.alloc(vertexCount * stride);
for (let vertex = 0; vertex < vertexCount; vertex++) {
  for (let axis = 0; axis < 3; axis++) {
    vertices.writeInt16LE(Math.round(geometry.positions[vertex * 3 + axis] / positionScale * 32767), vertex * stride + axis * 2);
    vertices.writeInt16LE(Math.round(geometry.normals[vertex * 3 + axis] * 32767), vertex * stride + 6 + axis * 2);
  }
  vertices.writeUInt8(Math.round(geometry.occlusions[vertex] * 255), vertex * stride + 12);
}
const destination = path.join(projectRoot, 'public/sculpture');
await mkdir(destination, { recursive: true });
const output = Buffer.concat([header, vertices, Buffer.from(geometry.indices.buffer)]);
await writeFile(path.join(destination, 'knot.bin'), output);
console.log(`Precomputed knot: ${vertexCount} vertices, ${geometry.indices.length / 3} triangles, ${output.length} bytes.`);
