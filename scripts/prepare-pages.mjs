import { mkdirSync, cpSync, writeFileSync, rmSync } from 'node:fs';

rmSync('build', { recursive: true, force: true });
mkdirSync('build', { recursive: true });
cpSync('index.html', 'build/index.html');
cpSync('dist', 'build/dist', { recursive: true });
cpSync('styles', 'build/styles', { recursive: true });
writeFileSync('build/.nojekyll', '');

console.log('build/ ready');
