import {test,expect} from '@playwright/test';

test('first project opening and later switching use the same filled selection without brackets',async({page})=>{
  await page.goto('/#projects');
  await page.locator('.project-list [data-project="tally"]').focus();
  await page.locator('.preview-panel').click();
  for(const id of ['tally','sprint-x','curalink','tally']){
    if(id!=='tally'||await page.locator('.project-tabs [aria-current="page"]').getAttribute('data-project')!=='tally'){
      await page.locator(`.project-tabs [data-project="${id}"]`).click();
    }
    const selected=page.locator(`.project-tabs [data-project="${id}"]`);
    await expect(selected).toHaveAttribute('aria-current','page');
    await expect(selected).toBeFocused();
    const appearance=await selected.evaluate(n=>{
      const style=getComputedStyle(n);
      return {background:style.backgroundColor,outline:style.outlineStyle,shadow:style.boxShadow,radius:style.borderRadius};
    });
    expect(appearance).toEqual({background:'rgb(255, 255, 255)',outline:'none',shadow:'none',radius:'20px'});
  }
  await page.goto('/sprint-x');
  await expect(page.locator('.project-tabs [data-project="sprint-x"]')).toBeFocused();
});

test('About clock and copyright appear after the contact links at the page bottom',async({page})=>{
  await page.goto('/about#about-story');
  const main=page.locator('#main-content');
  await main.focus();
  await expect(main).toHaveCSS('border-radius','0px');
  await expect(main).toHaveCSS('outline-style','none');
  await expect(main).toHaveCSS('outline-width','0px');
  await expect(main).toHaveCSS('outline-offset','0px');
  const footer=page.locator('.site-footer');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  expect((await footer.boundingBox()).y).toBeGreaterThan(await page.evaluate(()=>innerHeight));
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  const bottom=await footer.boundingBox(),contact=await page.locator('.contact-links').boundingBox();
  expect(bottom.y).toBeGreaterThan(contact.y+contact.height+20);
  expect(bottom.y+bottom.height).toBeLessThanOrEqual(await page.evaluate(()=>innerHeight)+1);
  await expect(footer).toContainText('© 2025 Dhwani Shah');
  await expect(footer).toHaveCSS('position','relative');
  await page.locator('.about-back').click();
  await expect(footer).toHaveCSS('position','fixed');
});

test('phone scrolling keeps the original movie pinned as the browser area grows',async({page,isMobile})=>{
  test.skip(!isMobile,'Native phone layout.');
  await page.setViewportSize({width:393,height:641});
  await page.goto('/');
  const video=page.locator('#home-scene video');
  await expect.poll(()=>video.evaluate(v=>!v.paused&&v.currentTime>.1&&v.videoHeight===3840),{timeout:20000}).toBe(true);
  await video.evaluate(v=>{window.reloads=0;v.addEventListener('loadedmetadata',()=>window.reloads++);});
  await page.evaluate(()=>scrollTo({top:140,behavior:'instant'}));
  expect(await page.evaluate(()=>scrollY)).toBeGreaterThan(0);
  for(const height of [641,740,844]){
    await page.setViewportSize({width:393,height});
    const before=await video.evaluate(v=>v.currentTime);
    for(const media of [video,page.locator('#home-scene .scene-poster')]){
      const box=await media.boundingBox();
      expect(box.y).toBeCloseTo(0,1);
      expect(box.height).toBeCloseTo(height,1);
      expect(box.width).toBe(393);
      expect(await media.evaluate(n=>getComputedStyle(n).objectFit)).toBe('fill');
    }
    await expect.poll(()=>video.evaluate(v=>v.currentTime)).toBeGreaterThan(before+.1);
  }
  expect(await page.evaluate(()=>window.reloads)).toBe(0);
  await page.getByRole('link',{name:'View projects',exact:true}).click();
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  await page.getByRole('link',{name:'Return to the homepage'}).click();
  await expect(page.locator('#home-scene')).toBeVisible();
});
