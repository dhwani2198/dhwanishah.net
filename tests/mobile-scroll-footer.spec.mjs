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
  await expect(footer).toBeHidden();
});

async function swipe(page,direction,selector='.phone-projects'){
  return page.locator(selector).evaluate((surface,direction)=>{
    const start={clientX:160,clientY:direction>0?420:160};
    const end={clientX:160,clientY:direction>0?160:420};
    let intercepted=false;
    for(const [type,finger] of [['touchstart',start],['touchmove',end],['touchend',end]]){
      const event=new Event(type,{bubbles:true,cancelable:true});
      Object.defineProperties(event,{touches:{value:type==='touchend'?[]:[finger]},changedTouches:{value:[finger]}});
      surface.dispatchEvent(event);
      intercepted ||= event.defaultPrevented;
    }
    return intercepted;
  },direction);
}

const currentDot=page=>page.locator('.phone-project-dots [aria-current="true"]');

test('phone homepage paints the whole movie beyond expanded browser controls without revealing projects',async({page,isMobile})=>{
  test.skip(!isMobile,'Phone browser controls.');
  const {readFile}=await import('node:fs/promises');
  const css=await readFile(new URL('../src/styles.css',import.meta.url),'utf8');
  // Model the real distinction that mobile emulation normally omits:
  // a 641px visible viewport inside an 844px large viewport.
  await page.route('**/src/styles.css*',route=>route.fulfill({contentType:'text/css',body:css.replaceAll('100lvh','844px').replaceAll('100svh','641px').replaceAll('100dvh','641px').replaceAll('100vh','844px')}));
  await page.setViewportSize({width:393,height:641});
  await page.goto('/');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  const scene=page.locator('#home-scene'),video=scene.locator('video');
  await expect.poll(()=>video.evaluate(v=>!v.paused&&v.videoHeight===3840),{timeout:20000}).toBe(true);
  const source=await video.evaluate(v=>v.currentSrc);
  for(const scroll of [0,203,0]){
    await page.evaluate(top=>scrollTo({top,behavior:'instant'}),scroll);
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(scroll);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(844);
    const bounds=await video.boundingBox();
    expect(bounds.height).toBe(844);
    expect(bounds.y).toBeCloseTo(-scroll,1);
    expect(bounds.y+bounds.height).toBeGreaterThanOrEqual(641);
    await expect.poll(()=>scene.locator('.project-trigger').evaluate(n=>n.getBoundingClientRect().bottom)).toBeCloseTo(625,1);
    await expect(page.locator('#projects-scene')).toBeHidden();
    await expect(page.locator('.site-footer')).toBeHidden();
    await expect(page).toHaveURL(/\/$/);
  }
  await page.getByRole('link',{name:'View projects',exact:true}).tap();
  await expect(scene).toBeHidden();
  await expect(page.locator('.phone-project-panel:visible')).toHaveCount(1);
  await page.getByRole('link',{name:'Return to the homepage'}).tap();
  await expect(scene).toBeVisible();
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  expect(await video.evaluate(v=>v.currentSrc)).toBe(source);
  await expect.poll(()=>video.evaluate(v=>!v.paused)).toBe(true);
});

test('all project preview cards including TopNotch have matching dimensions',async({page,isMobile})=>{
  await page.goto('/#projects');
  await page.evaluate(()=>document.fonts.ready);
  const sizes=[];
  for(const id of ['topnotch','tally','sprint-x','curalink','architectural-design']){
    const preview=await projectPreview(page,id,{hover:!isMobile});
    await preview.image.evaluate(n=>n.decode());
    const box=await preview.card.boundingBox();
    sizes.push(box);
    const frame=await preview.image.locator('..').boundingBox();
    expect(frame.width/frame.height).toBeCloseTo(4/3,2);
  }
  expect(Math.max(...sizes.map(n=>n.width))-Math.min(...sizes.map(n=>n.width))).toBeLessThan(1);
  expect(Math.max(...sizes.map(n=>n.height))-Math.min(...sizes.map(n=>n.height))).toBeLessThan(1);
});

test('phone homepage requires the project button and each swipe changes exactly one card',async({page,isMobile})=>{
  test.skip(!isMobile,'Phone project pager.');
  await page.setViewportSize({width:393,height:844});
  await page.goto('/');
  const video=page.locator('#home-scene video');
  await expect.poll(()=>video.evaluate(v=>!v.paused&&v.currentTime>.1&&v.videoHeight===3840),{timeout:20000}).toBe(true);
  await swipe(page,1,'#home-scene');
  await page.evaluate(()=>scrollTo({top:1800,behavior:'instant'}));
  await page.keyboard.press('PageDown');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#projects-scene')).toBeHidden();
  await expect(page.locator('.site-footer')).toBeHidden();
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  await page.getByRole('link',{name:'View projects',exact:true}).tap();
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.locator('#home-scene')).toBeHidden();
  await expect(page.locator('.phone-project-panel:visible')).toHaveCount(1);
  await expect(currentDot(page)).toHaveAttribute('data-phone-project-target','topnotch');
  for(const id of ['tally','sprint-x','curalink','architectural-design']){
    expect(await swipe(page,1)).toBe(true);
    await expect(currentDot(page)).toHaveAttribute('data-phone-project-target',id);
    await expect(page.locator('.phone-project-panel:visible')).toHaveCount(1);
    await expect(page.locator(`.phone-project-panel[data-phone-project="${id}"]`)).toBeVisible();
    expect(await page.evaluate(()=>scrollY)).toBe(0);
  }
  // End boundaries never take the user into another section.
  expect(await swipe(page,1)).toBe(false);
  await expect(currentDot(page)).toHaveAttribute('data-phone-project-target','architectural-design');
  expect(await swipe(page,-1)).toBe(true);
  await expect(currentDot(page)).toHaveAttribute('data-phone-project-target','curalink');
  await page.getByRole('link',{name:'Return to the homepage'}).tap();
  await expect(page.locator('#home-scene')).toBeVisible();
  await expect(page.locator('#projects-scene')).toBeHidden();
  await expect.poll(()=>video.evaluate(v=>!v.paused)).toBe(true);
});

test('a wheel gesture advances one phone project despite momentum events',async({page,isMobile})=>{
  test.skip(!isMobile,'Phone project pager.');
  await page.setViewportSize({width:393,height:844});
  await page.goto('/#projects');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  const wheel=deltaY=>page.locator('#projects-scene').dispatchEvent('wheel',{deltaY,bubbles:true,cancelable:true});
  for(let i=0;i<4;i++)await wheel(600);
  await expect(currentDot(page)).toHaveAttribute('data-phone-project-target','tally');
  await page.waitForTimeout(250);
  await wheel(600);
  await expect(currentDot(page)).toHaveAttribute('data-phone-project-target','sprint-x');
  await page.waitForTimeout(250);
  await wheel(-600);
  await expect(currentDot(page)).toHaveAttribute('data-phone-project-target','tally');
});

test('a tall phone card scrolls fully before a new gesture changes projects',async({page,isMobile})=>{
  test.skip(!isMobile,'Small phone project pager.');
  await page.setViewportSize({width:320,height:540});
  await page.goto('/#projects');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  await page.evaluate(()=>document.fonts.ready);
  const panel=page.locator('.phone-project-panel:visible');
  expect((await panel.boundingBox()).height).toBeGreaterThan(540);
  expect(await swipe(page,1)).toBe(false);
  await expect(currentDot(page)).toHaveAttribute('data-phone-project-target','topnotch');
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  const open=await panel.locator('.phone-card-open').boundingBox();
  expect(open.y+open.height).toBeLessThanOrEqual(541);
  expect(await swipe(page,1)).toBe(true);
  await expect(currentDot(page)).toHaveAttribute('data-phone-project-target','tally');
  expect(await page.evaluate(()=>scrollY)).toBe(0);
});

test('visible phone cards advance without a separate swipe through empty panel padding',async({page,isMobile})=>{
  test.skip(!isMobile,'Phone project pager.');
  await page.setViewportSize({width:320,height:568});
  await page.goto('/#projects');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  await page.evaluate(()=>document.fonts.ready);
  const panel=page.locator('.phone-project-panel:visible');
  expect((await panel.boundingBox()).height).toBeGreaterThan(568);
  const card=await panel.locator('.phone-project-card').boundingBox();
  expect(card.y+card.height).toBeLessThan(568);
  expect(await swipe(page,1)).toBe(true);
  await expect(currentDot(page)).toHaveAttribute('data-phone-project-target','tally');
});

test('compact phone dots select one card and project history restores the same card',async({page,isMobile})=>{
  test.skip(!isMobile,'Phone project pager.');
  await page.goto('/#projects');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  const dots=page.getByRole('navigation',{name:'Project position'});
  await expect(dots.getByRole('button')).toHaveCount(5);
  expect((await dots.boundingBox()).height).toBeLessThanOrEqual(120);
  await dots.getByRole('button',{name:'Show CuraLink, project 4 of 5'}).tap();
  await expect(currentDot(page)).toHaveAttribute('data-phone-project-target','curalink');
  await expect(page.locator('.phone-project-panel:visible')).toHaveCount(1);
  await page.locator('[data-phone-project="curalink"] .phone-card-copy p').tap();
  await expect(page.locator('#project-viewer')).toBeVisible();
  await expect(dots).toBeHidden();
  await page.goBack();
  await expect(page.locator('#project-viewer')).toBeHidden();
  await expect(currentDot(page)).toHaveAttribute('data-phone-project-target','curalink');
  await page.goForward();
  await expect(page.locator('#project-viewer')).toBeVisible();
  await page.getByRole('button',{name:'Close project viewer'}).click();
  await expect(page.locator('#project-viewer')).toBeHidden();
  await expect(currentDot(page)).toHaveAttribute('data-phone-project-target','curalink');
  expect(await page.evaluate(()=>scrollY)).toBe(0);
});

test('phone toolbar changes preserve the selected card and its content scroll',async({page,isMobile})=>{
  test.skip(!isMobile,'Phone browser controls.');
  const {readFile}=await import('node:fs/promises');
  const css=await readFile(new URL('../src/styles.css',import.meta.url),'utf8');
  await page.route('**/src/styles.css*',route=>route.fulfill({contentType:'text/css',body:css.replaceAll('100dvh','var(--test-dynamic-height,100svh)')}));
  await page.setViewportSize({width:320,height:568});
  await page.goto('/#projects');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  await page.evaluate(()=>document.fonts.ready);
  const panel=page.locator('.phone-project-panel:visible');
  const height=(await panel.boundingBox()).height;
  const contentScroll=await page.evaluate(()=>{
    scrollTo({top:37,behavior:'instant'});
    return scrollY;
  });
  expect(contentScroll).toBeGreaterThan(0);
  for(const visibleHeight of [440,500,568,440]){
    await page.evaluate(height=>{
      document.documentElement.style.setProperty('--test-dynamic-height',`${height}px`);
      dispatchEvent(new Event('resize'));
    },visibleHeight);
    expect((await panel.boundingBox()).height).toBe(height);
    expect(await page.evaluate(()=>scrollY)).toBe(contentScroll);
    await expect(currentDot(page)).toHaveAttribute('data-phone-project-target','topnotch');
    await expect(page.locator('.phone-project-panel:visible')).toHaveCount(1);
  }
});

test('phone footer appears only after the last project and About footer only after the biography',async({page,isMobile})=>{
  test.skip(!isMobile,'Phone project footer.');
  await page.goto('/');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  const footer=page.locator('.site-footer');
  await expect(footer).toBeHidden();
  await page.getByRole('link',{name:'View projects',exact:true}).tap();
  await expect(footer).toBeHidden();
  await page.getByRole('button',{name:'Show Architectural Design, project 5 of 5'}).tap();
  await expect(footer).toHaveCSS('position','relative');
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  const lastCard=await page.locator('.phone-project-panel:visible .phone-project-card').boundingBox();
  const bottom=await footer.boundingBox();
  expect(bottom.y).toBeGreaterThan(lastCard.y+lastCard.height+20);
  expect(bottom.y+bottom.height).toBeLessThanOrEqual(await page.evaluate(()=>innerHeight)+1);
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'About',exact:true}).tap();
  await expect(footer).toBeHidden();
  await page.locator('.about-read').tap();
  await expect(footer).toHaveCSS('position','relative');
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  const contact=await page.locator('.contact-links').boundingBox();
  expect((await footer.boundingBox()).y).toBeGreaterThan(contact.y+contact.height+20);
  await page.locator('.about-back').tap();
  await expect(footer).toBeHidden();
});
