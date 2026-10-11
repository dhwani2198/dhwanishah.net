import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const videos = JSON.parse(await readFile(resolve(root, 'public/media/manifest.json'), 'utf8'));
videos.push(JSON.parse(await readFile(resolve(root, 'public/media/phone-framing.json'), 'utf8')));
const chunkSize = 48 * 1024 * 1024;
const entries = [];
await mkdir(resolve(root, 'media-chunks'), { recursive: true });
for (const video of videos.filter(video => video.bytes > 100 * 1024 * 1024)) {
  const original = await readFile(resolve(root, `public/media/${video.name}.mp4`));
  assert.equal(original.length, video.bytes);
  assert.equal(createHash('sha256').update(original).digest('hex'), video.sha256);
  const parts = [];
  for (let offset = 0; offset < original.length; offset += chunkSize) {
    const part = original.subarray(offset, offset + chunkSize);
    const file = `${video.name}.part-${String(parts.length + 1).padStart(3, '0')}`;
    await writeFile(resolve(root, 'media-chunks', file), part);
    parts.push({ file, bytes: part.length, sha256: createHash('sha256').update(part).digest('hex') });
  }
  entries.push({ name: video.name, parts });
  console.log(`Stored ${video.name} as ${parts.length} lossless parts`);
}
await writeFile(resolve(root, 'media-chunks/index.json'), JSON.stringify(entries, null, 2) + '\n');
