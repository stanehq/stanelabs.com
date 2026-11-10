import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { projectRoot } from './project-root.mjs';

// Publish the Next.js static export as dist/, the directory every deployment serves.
const exported = path.join(projectRoot, 'out');
const destination = path.join(projectRoot, 'dist');
if (!existsSync(path.join(exported, 'index.html'))) throw new Error('Next.js static export is missing.');
rmSync(destination, { recursive: true, force: true });
cpSync(exported, destination, { recursive: true });
console.log('Next.js export prepared in dist/.');
