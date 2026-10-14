import { mkdir, writeFile } from 'node:fs/promises';
import { knotGeometry } from '../src/components/knotGeometry.ts';
import { projectRoot } from './project-root.mjs';
import path from 'node:path';

// Precompute ambient occlusion in the build, never in the visitor's main thread.
const geometry = knotGeometry();
const arrays = [geometry.positions, geometry.normals, geometry.occlusions, geometry.indices];
const header = Buffer.alloc(16);
arrays.forEach((array, index) => header.writeUInt32LE(array.length, index * 4));
const destination = path.join(projectRoot, 'public/sculpture');
await mkdir(destination, { recursive: true });
await writeFile(path.join(destination, 'knot.bin'), Buffer.concat([header, ...arrays.map(array => Buffer.from(array.buffer))]));
console.log(`Precomputed knot: ${geometry.positions.length / 3} vertices.`);
