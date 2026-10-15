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

test('phone toolbar changes do not shift cards or interrupt a partial scroll',async({page,isMobile})=>{
  test.skip(!isMobile,'Phone browser controls.');
  const {readFile}=await import('node:fs/promises');
  const css=await readFile(new URL('../src/styles.css',import.meta.url),'utf8');
  // Keep the large/small viewport fixed while only the dynamic viewport changes,
  // as happens when Safari or Chrome hides its floating controls.
  await page.route('**/src/styles.css*',route=>route.fulfill({contentType:'text/css',body:css.replaceAll('100dvh','var(--test-dynamic-height,100svh)')}));
  await page.setViewportSize({width:393,height:844});
  await page.goto('/#projects');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  const offsets=()=>page.locator('.phone-project-panel').evaluateAll(panels=>panels.map(n=>n.offsetTop));
  const before=await offsets();
  const partial=await page.locator('.phone-project-panel').nth(1).evaluate(n=>n.getBoundingClientRect().top+scrollY+137);
  await page.evaluate(top=>scrollTo({top,behavior:'instant'}),partial);
  const settled=await page.evaluate(()=>scrollY);
  for(const height of [641,740,844,641]){
    await page.evaluate(height=>{
      document.documentElement.style.setProperty('--test-dynamic-height',`${height}px`);
      dispatchEvent(new Event('resize'));
    },height);
    await expect.poll(offsets).toEqual(before);
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(settled);
    expect(await page.locator('#home-scene').evaluate(n=>n.getBoundingClientRect().height)).toBeCloseTo(844,1);
  }
});

test('phone dots follow unequal card heights and jump to the selected project',async({page,isMobile})=>{
  test.skip(!isMobile,'Sequential phone project cards.');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:320,height:568});
  await page.goto('/#projects');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  const dots=page.getByRole('navigation',{name:'Project position'});
  await expect(dots.getByRole('button')).toHaveCount(5);
  const heights=await page.locator('.phone-project-panel').evaluateAll(p=>p.map(n=>n.offsetHeight));
  expect(new Set(heights).size).toBeGreaterThan(1);
  for(const id of ['tally','sprint-x','curalink','architectural-design']){
    const preview=await projectPreview(page,id);
    const active=dots.locator('[aria-current="true"]');
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute('data-phone-project-target',id);
    // A partial swipe stays where the user leaves it, without forced snapping.
    await page.evaluate(()=>scrollBy({top:37,behavior:'instant'}));
    const top=await page.evaluate(()=>scrollY);
    await page.waitForTimeout(150);
    expect(await page.evaluate(()=>scrollY)).toBe(top);
    await expect(active).toHaveAttribute('data-phone-project-target',id);
    expect((await preview.panel.boundingBox()).y).toBeCloseTo(-37,0);
  }
  await dots.getByRole('button',{name:'Show CuraLink, project 4 of 5'}).tap();
  const curalink=page.locator('.phone-project-panel[data-phone-project="curalink"]');
  await expect.poll(()=>curalink.evaluate(n=>n.getBoundingClientRect().top)).toBeCloseTo(0,0);
  await expect(dots.locator('[aria-current="true"]')).toHaveAttribute('data-phone-project-target','curalink');
  await curalink.locator('.phone-card-copy p').tap();
  await expect(page.locator('#project-viewer')).toBeVisible();
  await expect(dots).toBeHidden();
  await page.getByRole('button',{name:'Close project viewer'}).click();
  await expect.poll(()=>curalink.evaluate(n=>n.getBoundingClientRect().top)).toBeCloseTo(0,0);
  await expect(dots.locator('[aria-current="true"]')).toHaveAttribute('data-phone-project-target','curalink');
  await page.getByRole('link',{name:'Return to the homepage'}).click();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
  await expect(dots).toBeHidden();
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
  await expect.poll(()=>footer.evaluate(n=>n.getBoundingClientRect().bottom)).toBeLessThanOrEqual(height+1);
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
