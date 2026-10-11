import {chromium,webkit,devices} from '@playwright/test';
for(const mode of ['desktop','phone']){
 const browser=await (mode==='desktop'?chromium:webkit).launch({headless:true});
 const page=await browser.newPage(mode==='desktop'?{viewport:{width:1440,height:900},reducedMotion:'reduce'}:{...devices['iPhone 13'],reducedMotion:'reduce'});
 for(const id of ['tally','sprint-x','curalink','architectural-design']){
  await page.goto('http://127.0.0.1:4187/'+id);
  const frame=page.frameLocator('.published-case');await frame.locator('[data-framer-root]').waitFor();
  const section=frame.locator('[data-framer-name="Intro/Overview"]').filter({hasText:'OVERVIEW'}).first();
  if(await section.count()){
   await section.scrollIntoViewIfNeeded();
   const imgs=section.locator('img:visible');
   for(const img of await imgs.all())await img.evaluate(async n=>{n.loading='eager';await n.decode();});
   await page.screenshot({path:`output/review/${id}-${mode}-overview.png`});
   console.log(mode,id,'overview images',await imgs.evaluateAll(nodes=>nodes.map(n=>({src:n.src.split('/').at(-1),w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height,loaded:n.naturalWidth}))));
  }
  if(id==='sprint-x'){
   const carousel=frame.locator('.native-carousel');await carousel.scrollIntoViewIfNeeded();
   console.log(mode,'sprint carousel',await carousel.evaluate(n=>({width:n.clientWidth,scrollWidth:n.scrollWidth,count:n.children.length})));
   await page.screenshot({path:`output/review/sprint-carousel-${mode}.png`});
  }
 }
 await page.goto('http://127.0.0.1:4187/about#about-story');
 await page.locator('.connect').scrollIntoViewIfNeeded();
 await page.screenshot({path:`output/review/hello-${mode}.png`});
 for(const id of ['tally','curalink','architectural-design']){
  await page.goto('http://127.0.0.1:4187/#projects');
  await page.locator(`.project-list [data-project="${id}"]`).focus();
  await page.locator('.preview-original').evaluate(n=>n.decode());
  await page.screenshot({path:`output/review/preview-${id}-${mode}.png`});
 }
 await browser.close();
}
