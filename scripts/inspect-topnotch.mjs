import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const reference=resolve(import.meta.dirname,'../.reference/topnotch');
await mkdir(reference,{recursive:true});
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await page.goto('https://dhwani.framer.ai/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(1800);
  await writeFile(resolve(reference,'index.html'),await page.content());
  const details=await page.evaluate(()=>({
    title:document.title,
    description:document.querySelector('meta[name="description"]')?.content,
    ogImage:document.querySelector('meta[property="og:image"]')?.content,
    text:document.body.innerText,
    images:[...document.images].map(n=>({src:n.src,currentSrc:n.currentSrc,srcset:n.srcset,alt:n.alt,width:n.naturalWidth,height:n.naturalHeight,bounds:{x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height}})),
    videos:[...document.querySelectorAll('video')].map(n=>({src:n.currentSrc,poster:n.poster})),
    links:[...document.querySelectorAll('a[href]')].map(n=>({text:n.textContent.trim(),href:n.href})),
  }));
  await writeFile(resolve(reference,'details.json'),JSON.stringify(details,null,2)+'\n');
  await page.screenshot({path:resolve(reference,'landing.png'),fullPage:true});
  console.log(JSON.stringify(details,null,2));
} finally { await browser.close(); }
