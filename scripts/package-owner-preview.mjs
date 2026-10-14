import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve('apps/web/dist');
const logo = await readFile(resolve('apps/web/public/brand/golden-hand-original.jpg'));
const image = `data:image/jpeg;base64,${logo.toString('base64')}`;
let html = await readFile(resolve(root, 'index.html'), 'utf8');
html = html.replace('<html lang="id">', `<html lang="id" data-demo-portal="owner" data-brand-image="${image}">`)
    .replace(/<title>.*?<\/title>/, '<title>GOLDEN HAND MAHJONG · Owner Demo</title>')
    .replace(/\s*<link rel="manifest"[^>]*>/, '')
    .replace(/(<link rel="icon" href=")[^"]+/, `$1${image}`);

const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="(\/assets\/[^" ]+)"[^>]*><\/script>/g)];
if (scripts.length !== 1) throw new Error('Expected one bundled entry script; update packaging for code splitting.');
for (const [tag, asset] of scripts) {
    const js = await readFile(resolve(root, `.${asset}`), 'utf8');
    html = html.replace(tag, () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`);
}
for (const [tag, asset] of [...html.matchAll(/<link\b[^>]*href="(\/assets\/[^" ]+\.css)"[^>]*>/g)]) {
    const css = await readFile(resolve(root, `.${asset}`), 'utf8');
    html = html.replace(tag, () => `<style>${css}</style>`);
}
if (/\b(?:src|href)="\/assets\//.test(html)) throw new Error('Unbundled asset reference.');
await mkdir(resolve('downloads'), { recursive: true });
const path = resolve('downloads/golden-hand-owner-demo.html');
await writeFile(path, html);
const hash = createHash('sha256').update(html).digest('hex');
await writeFile(`${path}.sha256`, `${hash}  golden-hand-owner-demo.html\n`);
console.log(`Owner browser preview: ${path}\nSHA-256: ${hash}`);
