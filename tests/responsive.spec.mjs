import {test,expect} from '@playwright/test';

const viewports=[
  ['small phone',320,568],
  ['phone',390,844],
  ['small phone landscape',667,375],
  ['phone landscape',844,390],
  ['tablet portrait',768,1024],
  ['tablet landscape',1024,768],
  ['laptop',1280,720],
  ['large laptop',1440,900],
];
const projects=['topnotch','tally','sprint-x','curalink','architectural-design'];

async function fitsWidth(page){
  const dimensions=await page.evaluate(()=>({viewport:innerWidth,page:document.documentElement.scrollWidth}));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport+1);
  for(const link of await page.locator('.site-header a:visible').all()){
    const bounds=await link.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x+bounds.width).toBeLessThanOrEqual(dimensions.viewport+1);
  }
}

async function loadedImage(image){
  await expect.poll(()=>image.evaluate(n=>n.complete&&n.naturalWidth>0)).toBe(true);
  await image.evaluate(n=>n.decode());
}

for(const [name,width,height] of viewports)test(`${name}: every page and project remains usable`,async({page,isMobile})=>{
  await page.setViewportSize({width,height});
  await page.emulateMedia({reducedMotion:'reduce'});
  // Test the portfolio's embed layout independently of the external demo service.
  await page.route('https://tallyautomate.lovable.app/**',route=>route.fulfill({contentType:'text/html',body:'<p>Tally demo</p>'}));
  await page.goto('/');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  await page.evaluate(()=>document.fonts.ready);
  await fitsWidth(page);
  expect(Math.abs((await page.locator('#home-scene').boundingBox()).height-height)).toBeLessThan(1);
  const touch=await page.evaluate(()=>matchMedia('(pointer:coarse)').matches);
  if(touch&&width<=1050)expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeGreaterThan(height);
  else expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(height);
  if(touch)for(const link of await page.locator('.site-nav>a').all())expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await loadedImage(page.locator('#home-scene .scene-poster'));
  expect(await page.locator('#home-scene .scene-poster').evaluate(n=>Math.max(n.naturalWidth,n.naturalHeight))).toBe(3840);

  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'About',exact:true}).click();
  await expect(page.locator('.about-hero')).toBeVisible();
  expect(Math.abs((await page.locator('.about-hero').boundingBox()).height-height)).toBeLessThan(1);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(height);
  await fitsWidth(page);
  await page.locator('.about-read').click();
  await expect(page.locator('#about-story')).toBeVisible();
  await fitsWidth(page);
  for(const img of await page.locator('.art-grid img').all()){
    await img.scrollIntoViewIfNeeded();
    await loadedImage(img);
    const image=await img.evaluate(n=>({ratio:n.getBoundingClientRect().width/n.getBoundingClientRect().height,native:n.naturalWidth/n.naturalHeight,right:n.getBoundingClientRect().right}));
    expect(Math.abs(image.ratio-image.native)).toBeLessThan(.01);
    expect(image.right).toBeLessThanOrEqual(width);
  }
  await page.locator('.connect-email').scrollIntoViewIfNeeded();
  const hello=await page.locator('.connect-email').boundingBox();
  expect(hello.x+hello.width).toBeLessThanOrEqual(width);
  await page.locator('.about-back').click();
  await expect(page.locator('.about-hero')).toBeVisible();

  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Projects',exact:true}).click();
  await expect(page.locator('.project-list a')).toHaveCount(5);
  for(const id of projects){
    const project=page.locator(`.project-list [data-project="${id}"]`);
    if(isMobile)await project.tap();else await project.focus();
    await expect(page.locator('.preview-panel')).toHaveAttribute('data-preview-project',id);
    await loadedImage(page.locator('.preview-original'));
    await fitsWidth(page);
    const bounds=await page.locator('.preview-panel').boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x+bounds.width).toBeLessThanOrEqual(width);
    const reachableTop=await page.locator('.preview-panel').evaluate(n=>n.getBoundingClientRect().top+document.querySelector('#projects-scene').scrollTop);
    expect(reachableTop).toBeGreaterThanOrEqual(80);
    // A tall card can scroll, but its CTA must remain reachable and clickable.
    await page.locator('.preview-open').scrollIntoViewIfNeeded();
    await page.locator('.preview-open').click();
    await expect(page).toHaveURL(new RegExp(`/${id}$`));
    await expect(page.locator('#project-viewer')).toBeVisible();
    const viewer=await page.locator('#project-viewer').boundingBox();
    expect(viewer.y).toBeGreaterThanOrEqual(0);
    expect(viewer.y+viewer.height).toBeLessThanOrEqual(height);
    if(touch)expect((await page.locator('.close-viewer').boundingBox()).height).toBeGreaterThanOrEqual(44);
    if(id==='topnotch'){
      const source=page.getByRole('link',{name:'View published preview'});
      await source.scrollIntoViewIfNeeded();
      await expect(source).toBeVisible();
      const reach=await source.boundingBox();
      expect(reach.y+reach.height).toBeLessThanOrEqual(viewer.y+viewer.height);
    }else{
      const body=page.frameLocator('.published-case').locator('body');
      await expect(body.locator('[data-framer-root]')).toBeVisible();
      const layout=await body.evaluate(n=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,root:n.querySelector('[data-framer-root]').getBoundingClientRect().width}));
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width+1);
      expect(layout.root).toBeLessThanOrEqual(layout.width+1);
      await body.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
      expect(await body.evaluate(()=>scrollY)).toBeGreaterThan(0);
    }
    await page.getByRole('button',{name:'Close project viewer'}).click();
    await expect(page.locator('#project-viewer')).not.toBeVisible();
  }
  await page.getByRole('link',{name:'Return to the homepage'}).click();
  await expect(page.locator('#home-scene')).toBeVisible();
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  await fitsWidth(page);
});

for(const [name,width,height,insets] of [
 ['phone notch portrait',390,844,{top:47,right:0,bottom:34,left:0}],
 ['phone notch landscape',844,390,{top:0,right:59,bottom:21,left:59}],
])test(`${name}: navigation and About animation clear the safe areas`,async({page})=>{
  const {readFile}=await import('node:fs/promises');
  const css=await readFile(new URL('../src/styles.css',import.meta.url),'utf8');
  // Desktop engines report zero device insets; exercise realistic notch values.
  await page.route('**/src/styles.css*',route=>route.fulfill({contentType:'text/css',body:css.replace(/env\(safe-area-inset-(top|right|bottom|left)\)/g,(_,edge)=>`${insets[edge]}px`)}));
  await page.setViewportSize({width,height});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/about');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  const nav=await page.locator('.site-nav').boundingBox();
  const frame=await page.locator('.about-hero .animation-frame').boundingBox();
  expect(frame.y).toBeGreaterThan(nav.y+nav.height);
  for(const link of await page.locator('.site-header a:visible').all()){
    const bounds=await link.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(insets.left);
    expect(bounds.x+bounds.width).toBeLessThanOrEqual(width-insets.right+1);
  }
  await page.locator('.about-read').click();
  const back=await page.locator('.about-back').boundingBox();
  expect(back.y).toBeGreaterThan(nav.y+nav.height);
  await page.locator('.about-back').click();
  await expect(page.locator('.about-hero')).toBeVisible();
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Projects',exact:true}).click();
  const intro=await page.locator('.projects-intro').boundingBox();
  expect(intro.y).toBeGreaterThan(nav.y+nav.height);
  expect(intro.x).toBeGreaterThanOrEqual(insets.left);
  await fitsWidth(page);
});
