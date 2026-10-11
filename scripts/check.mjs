import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { restoreOriginalMedia } from './restore-media.mjs';

const root=resolve(import.meta.dirname,'..');
await restoreOriginalMedia(root);
const data=JSON.parse(await readFile(resolve(root,'content/published.json'),'utf8'));
const provenance=JSON.parse(await readFile(resolve(root,'content/asset-provenance.json'),'utf8'));
assert.equal(data.publication,'b2371357950dc8c4b26cf29f14ae2f46aad85765');
const additions=JSON.parse(await readFile(resolve(root,'content/additional-projects.json'),'utf8'));
const previewOverrides=JSON.parse(await readFile(resolve(root,'content/preview-overrides.json'),'utf8'));
assert.deepEqual(data.projects.filter(p=>p.status==='coming-soon'),additions);
assert.deepEqual(data.projects.filter(p=>p.status!=='coming-soon').map(p=>p.id),['tally','sprint-x','curalink','architectural-design']);
assert.equal(new Set(data.projects.map(p=>p.id)).size,data.projects.length);
for(const entry of Object.values(provenance)) {
  const raw=await readFile(resolve(root,'public',entry.output.slice(1)));
  const hash=createHash('sha1').update(`blob ${raw.length}\0`).update(raw).digest('hex');
  assert.equal(hash,entry.publishedSha,`Published asset changed: ${entry.source}`);
}
const videos=JSON.parse(await readFile(resolve(root,'public/media/manifest.json'),'utf8'));
assert.equal(videos.length,6);
for(const video of videos) {
  const copy=await readFile(resolve(root,'public/media',video.name+'.mp4'));
  const digest=createHash('sha256').update(copy).digest('hex');
  assert.equal(digest,video.sha256,`${video.name} must retain the supplied original bytes`);
  assert.equal(copy.length,video.bytes);
  if(existsSync(resolve(root,video.source))) {
    const original=await readFile(resolve(root,video.source));
    assert.equal(digest,createHash('sha256').update(original).digest('hex'),`${video.name} must remain byte-identical to the supplied 4K original`);
  }
  assert.ok(Math.max(video.width,video.height)>=3840);
}
for(const p of data.projects) {
  assert.ok((await stat(resolve(root,'public',p.preview.slice(1)))).size>0);
  if(previewOverrides[p.id]) {
    for(const [key,value] of Object.entries(previewOverrides[p.id]))assert.deepEqual(p[key],value);
    const image=await readFile(resolve(root,'public',p.preview.slice(1)));
    assert.equal(createHash('sha256').update(image).digest('hex'),p.previewSha256,'Keep the supplied preview bytes unchanged');
    assert.deepEqual([image.readUInt32BE(16),image.readUInt32BE(20)],p.previewDimensions);
  }
  if(p.status==='coming-soon') {
    const image=await readFile(resolve(root,'public',p.preview.slice(1)));
    assert.equal(createHash('sha256').update(image).digest('hex'),p.previewSha256,'The new project preview must retain the original source bytes');
    assert.deepEqual([image.readUInt32BE(16),image.readUInt32BE(20)],p.previewDimensions);
    assert.equal(p.source,'https://dhwani.framer.ai/');
  } else {
    assert.ok(p.blocks.length);
    assert.ok((await stat(resolve(root,'public',p.caseStudy.slice(1)))).size>0);
  }
  assert.ok((await stat(resolve(root,'public',p.illustration.slice(1)))).size>0);
  assert.equal(p.preview,p.illustration,'Use the selected static project cover');
  assert.ok(!p.previewVideo,'Project previews must be static');
}
const phone=JSON.parse(await readFile(resolve(root,'public/media/phone-framing.json'),'utf8'));
const phoneVideo=await readFile(resolve(root,`public/media/${phone.name}.mp4`));
assert.equal(createHash('sha256').update(phoneVideo).digest('hex'),phone.sha256,'Keep the approved full-valley 4K phone render');
assert.equal(phoneVideo.length,phone.bytes);
assert.deepEqual([phone.width,phone.height,phone.fps],[2160,3840,30]);
assert.equal(phone.sourceSha256,videos.find(video=>video.name===phone.source).sha256);
assert.equal(phone.skySourceSha256,videos.find(video=>video.name===phone.skySource).sha256);
const phonePoster=await readFile(resolve(root,`public/media/${phone.name}.webp`));
assert.equal(createHash('sha256').update(phonePoster).digest('hex'),phone.posterSha256);
for(const file of ['src/app.js','src/animations.js','src/ascii.js','src/sparks.js','src/case-study.js','src/render.mjs','scripts/serve.mjs','scripts/build.mjs','scripts/prepare-topnotch.mjs','scripts/restore-media.mjs','scripts/split-media.mjs'])execFileSync(process.execPath,['--check',resolve(root,file)]);
console.log(`Verified ${Object.keys(provenance).length} published assets, 6 original 4K videos, the full-valley 4K phone render, content, previews, and JavaScript.`);
