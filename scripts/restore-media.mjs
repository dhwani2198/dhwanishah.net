import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { readFile, mkdir, open, rename, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function digestFile(path) {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const buffer of createReadStream(path)) {
    hash.update(buffer);
    bytes += buffer.length;
  }
  return { sha256: hash.digest('hex'), bytes };
}

// GitHub blocks individual Git blobs over 100 MiB. Join the stored parts
// before building so visitors receive the exact original 4K MP4 files.
export async function restoreOriginalMedia(root = resolve(import.meta.dirname, '..')) {
  const entries = JSON.parse(await readFile(resolve(root, 'media-chunks/index.json'), 'utf8'));
  const videos = JSON.parse(await readFile(resolve(root, 'public/media/manifest.json'), 'utf8'));
  await mkdir(resolve(root, 'public/media'), { recursive: true });
  for (const entry of entries) {
    const original = videos.find(video => video.name === entry.name);
    assert.ok(original, `Missing original metadata for ${entry.name}`);
    const destination = resolve(root, `public/media/${entry.name}.mp4`);
    const existing = await digestFile(destination).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    });
    if (existing?.sha256 === original.sha256 && existing.bytes === original.bytes) continue;

    const temporary = destination + '.assembling';
    const output = await open(temporary, 'w');
    const totalHash = createHash('sha256');
    let totalBytes = 0;
    try {
      for (const part of entry.parts) {
        const hash = createHash('sha256');
        let bytes = 0;
        for await (const buffer of createReadStream(resolve(root, 'media-chunks', part.file))) {
          hash.update(buffer);
          totalHash.update(buffer);
          bytes += buffer.length;
          totalBytes += buffer.length;
          // FileHandle.write may write fewer bytes than requested.
          for (let offset = 0; offset < buffer.length;) {
            const result = await output.write(buffer, offset, buffer.length - offset);
            assert.ok(result.bytesWritten > 0, `Could not write ${entry.name}`);
            offset += result.bytesWritten;
          }
        }
        assert.equal(bytes, part.bytes, `Incomplete media part: ${part.file}`);
        assert.equal(hash.digest('hex'), part.sha256, `Changed media part: ${part.file}`);
      }
      assert.equal(totalBytes, original.bytes, `Incomplete original: ${entry.name}`);
      assert.equal(totalHash.digest('hex'), original.sha256, `Changed original: ${entry.name}`);
      await output.close();
      await rename(temporary, destination);
      console.log(`Restored byte-identical 4K video: ${entry.name}`);
    } catch (error) {
      await output.close();
      await rm(temporary, { force: true });
      throw error;
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await restoreOriginalMedia();
}
