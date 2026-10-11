// Stage the exact TopNotch preview from the user-supplied Framer publication.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const previewSource='https://framerusercontent.com/images/P1TsvBUS6FZmXAmd8JkmQQ9Et5k.png?width=2880&height=1800';
const response=await fetch(previewSource);
if(!response.ok)throw new Error(`Could not retrieve TopNotch preview: ${response.status}`);
const image=Buffer.from(await response.arrayBuffer());
if(!image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Expected the original PNG preview');
const preview='/assets/images/P1TsvBUS6FZmXAmd8JkmQQ9Et5k.png';
await mkdir(resolve(root,'public/assets/images'),{recursive:true});
await writeFile(resolve(root,'public',preview.slice(1)),image);
const project={
  id:'topnotch',title:'TopNotch',status:'coming-soon',
  lead:'Less clutter. More focus.',
  description:'TopNotch turns the space around your MacBook notch or iPhone dynamic island into a focused home for your day.',
  tags:['Calendar','Flexible integrations','Meeting prep'],
  preview,illustration:preview,source:'https://dhwani.framer.ai/',previewSource,
  previewSha256:createHash('sha256').update(image).digest('hex'),
  previewDimensions:[image.readUInt32BE(16),image.readUInt32BE(20)],
};
await writeFile(resolve(root,'content/additional-projects.json'),JSON.stringify([project],null,2)+'\n');
const data=JSON.parse(await readFile(resolve(root,'content/published.json'),'utf8'));
data.projects=[project,...data.projects.filter(p=>p.id!==project.id)];
await writeFile(resolve(root,'content/published.json'),JSON.stringify(data,null,2)+'\n');
console.log(`Staged TopNotch's original ${project.previewDimensions.join(' × ')} preview from ${project.source}`);
