import {test,expect} from '@playwright/test';
import {openProject,projectPreview} from './helpers/project-preview.mjs';

test('first project opening and later switching use the same filled selection without brackets',async({page})=>{
  await page.goto('/#projects');
  await openProject(page,'tally');
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

test('phone swipes and the homepage arrow reach Projects in the same native document',async({page,isMobile})=>{
  test.skip(!isMobile,'Native phone layout.');
  await page.setViewportSize({width:393,height:844});
  await page.goto('/');
  const video=page.locator('#home-scene video');
  await expect.poll(()=>video.evaluate(v=>!v.paused&&v.currentTime>.1&&v.videoHeight===3840),{timeout:20000}).toBe(true);
  expect(await page.locator('#projects-scene').evaluate(n=>n.offsetTop)).toBe(844);
  expect(await page.locator('#home-scene .animation-frame').evaluate(n=>getComputedStyle(n).position)).toBe('absolute');
  await expect(page.locator('.phone-project-panel')).toHaveCount(5);
  await expect(page.locator('.project-stage')).not.toBeVisible();
  await page.evaluate(()=>scrollTo({top:844,behavior:'instant'}));
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.locator('#projects-scene')).toHaveCSS('overflow-y','visible');
  await expect(page.locator('body')).toHaveAttribute('data-view','projects');
  await page.getByRole('link',{name:'Return to the homepage'}).click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
  await expect.poll(()=>video.evaluate(v=>!v.paused)).toBe(true);
  await page.getByRole('link',{name:'View projects',exact:true}).click();
  await expect(page).toHaveURL(/#projects$/);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(844);
  const tally=await projectPreview(page,'tally');
  const footer=await page.locator('.site-footer').boundingBox();
  const card=await tally.card.boundingBox();
  expect(footer.y).toBeGreaterThan(card.y+card.height+15);
  // The hero and its spark canvas have left the viewport completely.
  for(const selector of ['#home-scene video','.home-sparks']){
    const bounds=await page.locator(selector).boundingBox();
    expect(bounds.y+bounds.height).toBeLessThanOrEqual(0);
  }
  await tally.image.tap();
  await expect(page.locator('#project-viewer')).toBeVisible();
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  await page.goBack();
  await expect(page.locator('#project-viewer')).not.toBeVisible();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(1688);
  await page.goForward();
  await expect(page.locator('#project-viewer')).toBeVisible();
  await page.getByRole('button',{name:'Close project viewer'}).click();
  await expect(page.locator('#project-viewer')).not.toBeVisible();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(1688);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(()=>video.evaluate(v=>!v.paused)).toBe(true);
});

test('the hero and project screens fill the available area after phone controls collapse',async({page,isMobile})=>{
  test.skip(!isMobile,'Phone browser controls.');
  await page.setViewportSize({width:393,height:641});
  await page.goto('/');
  const hero=page.locator('#home-scene');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  expect((await hero.boundingBox()).height).toBe(641);
  await page.getByRole('link',{name:'View projects',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(641);
  await page.setViewportSize({width:393,height:844});
  // Measure the browser's own resize adjustment without issuing a second scroll.
  const panel=page.locator('.phone-project-panel[data-phone-project="topnotch"]');
  await expect.poll(()=>panel.evaluate(n=>n.getBoundingClientRect().height)).toBeCloseTo(844,1);
  await expect.poll(()=>panel.evaluate(n=>n.getBoundingClientRect().top)).toBeCloseTo(0,0);
  await expect.poll(()=>hero.evaluate(n=>n.getBoundingClientRect().height)).toBeCloseTo(844,1);
  const footer=await page.locator('.site-footer').boundingBox();
  const card=await panel.locator('.phone-project-card').boundingBox();
  expect(footer.y).toBeGreaterThan(card.y+card.height+15);
  expect(footer.y).toBeGreaterThan(844);
  const movie=await hero.locator('video').boundingBox();
  expect(movie.y+movie.height).toBeLessThanOrEqual(0);
  await page.getByRole('link',{name:'Return to the homepage'}).click();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
  const homeVideo=await hero.locator('video').boundingBox();
  expect(homeVideo.y).toBe(0);
  expect(homeVideo.height).toBeCloseTo(844,1);
});

test('the homepage has no overlaid clock and phones show one footer after the last project',async({page,isMobile})=>{
  await page.goto('/');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  const footer=page.locator('.site-footer');
  await expect(page.locator('#home-scene footer,.phone-project-panel footer')).toHaveCount(0);
  await expect(page.locator('footer')).toHaveCount(1);
  if(!isMobile){
    await expect(footer).toBeHidden();
    return;
  }
  const height=await page.evaluate(()=>innerHeight);
  expect((await footer.boundingBox()).y).toBeGreaterThan(height);
  await expect(footer).toHaveCSS('position','relative');
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  await expect.poll(()=>footer.evaluate(n=>n.getBoundingClientRect().bottom)).toBeLessThanOrEqual(height);
  const lastCard=await page.locator('.phone-project-panel').last().locator('.phone-project-card').boundingBox();
  const lastPanel=await page.locator('.phone-project-panel').last().boundingBox();
  const bottom=await footer.boundingBox();
  expect(bottom.y).toBeGreaterThanOrEqual(lastPanel.y+lastPanel.height);
  expect(bottom.y).toBeGreaterThan(lastCard.y+lastCard.height+20);
  await expect(footer).toContainText('© 2025 Dhwani Shah');
  await page.getByRole('link',{name:'Return to the homepage'}).click();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
  expect((await footer.boundingBox()).y).toBeGreaterThan(height);
});
