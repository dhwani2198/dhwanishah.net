import {chromium,webkit,devices} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
await mkdir('output/review',{recursive:true});
for(const mode of ['desktop','phone']){
 const browser=await (mode==='desktop'?chromium:webkit).launch({headless:true});
 const page=await browser.newPage(mode==='desktop'?{viewport:{width:1440,height:900},reducedMotion:'reduce'}:{...devices['iPhone 13'],reducedMotion:'reduce'});
 const issues=[];page.on('pageerror',e=>issues.push(e.message));page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:4187')&&r.status()>=400)issues.push(r.url());});
 for(const project of ['tally','sprint-x','curalink','architectural-design']){
  await page.goto('http://127.0.0.1:4187/'+project);
  const child=page.frameLocator('.published-case');
  await child.locator('[data-framer-root]').waitFor();
  await child.locator('body').evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(350);
  console.log(mode,project,await page.locator('.published-case').evaluate(n=>{
   const d=n.contentDocument,w=n.contentWindow;
   return {width:w.innerWidth,height:w.innerHeight,scrollHeight:d.documentElement.scrollHeight,overflow:d.documentElement.scrollWidth>w.innerWidth,modules:[...d.querySelector('[data-framer-root]').children].slice(0,7).map(c=>({name:c.dataset.framerName,text:c.textContent.trim().slice(0,40),top:c.getBoundingClientRect().top,height:c.getBoundingClientRect().height,order:w.getComputedStyle(c).order,display:w.getComputedStyle(c).display}))};
  }));
  await page.screenshot({path:`output/review/${project}-${mode}-top.png`});
  const section=child.locator('[data-framer-name="Intro/Overview"]').first();
  if(await section.count())await section.scrollIntoViewIfNeeded();
  await page.screenshot({path:`output/review/${project}-${mode}-overview.png`});
  if(project==='tally') {
    await child.locator('iframe:visible').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await page.screenshot({path:`output/review/tally-${mode}-demo.png`});
  }
 }
 console.log(mode,'issues',issues);
 await browser.close();
}
