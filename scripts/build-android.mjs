import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const nativeRoot = resolve('apps/android');
const command = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const result = spawnSync(command, ['--no-daemon', 'assembleDebug', 'lintDebug'], {
    cwd: nativeRoot, stdio: 'inherit', shell: process.platform === 'win32',
});
if (result.error) { console.error(result.error.message); process.exit(1); }
if (result.status !== 0) process.exit(result.status ?? 1);

const output = resolve('downloads/golden-hand-pos-demo.apk');
await mkdir(resolve('downloads'), { recursive: true });
await copyFile(resolve(nativeRoot, 'app/build/outputs/apk/debug/app-debug.apk'), output);
const hash = createHash('sha256').update(await readFile(output)).digest('hex');
await writeFile(`${output}.sha256`, `${hash}  golden-hand-pos-demo.apk\n`);
console.log(`APK demo: ${output}\nSHA-256: ${hash}`);
