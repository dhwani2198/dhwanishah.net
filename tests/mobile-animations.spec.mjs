import {test,expect} from '@playwright/test';

const sparkPixels=(page,selector)=>page.locator(selector).evaluate(canvas=>{
  const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let painted=0;
  for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)painted++;
  return painted;
});

test('blocked autoplay offers a working trusted-tap control for both 4K videos',async({page,isMobile})=>{
  await page.addInitScript(()=>{
    const play=HTMLMediaElement.prototype.play;
    let unlocked=false;
    document.addEventListener('click',event=>{
      if(event.isTrusted&&event.target.closest('.animation-toggle'))unlocked=true;
    },true);
    HTMLMediaElement.prototype.play=function(){
      // Simulate a browser policy that blocks automatic playback until a tap.
      if(!unlocked)return Promise.reject(new DOMException('Autoplay blocked','NotAllowedError'));
      return play.call(this);
    };
    for(const name of ['play','playing'])document.addEventListener(name,event=>{
      if(!unlocked&&event.target instanceof HTMLMediaElement)event.target.pause();
    },true);
  });
  for(const route of ['/','/about']){
    await page.goto(route);
    const scene=page.locator(route==='/'?'#home-scene':'.about-hero');
    const video=scene.locator('video');
    const button=scene.getByRole('button',{name:'Play animation',exact:true});
    await expect(button).toBeVisible();
    await expect(scene.locator('.scene-poster')).toBeVisible();
    if(isMobile)await button.tap();else await button.click();
    await expect.poll(()=>video.evaluate(v=>!v.paused&&v.currentTime>0&&Math.max(v.videoWidth,v.videoHeight)===3840),{timeout:20000}).toBe(true);
    if(isMobile)await expect(scene.locator('.animation-toggle')).toBeHidden();
    else {
      await scene.getByRole('button',{name:'Pause animation'}).click();
      await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(true);
      await expect(button).toBeVisible();
    }
  }
});

test('Say hello begins when visible and replays automatically on phones',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/about#about-story');
  const hello=page.locator('.hello-text');
  await expect(hello).toHaveText('Say hello');
  // Reveal a small sliver: the animation must wait until the text is readable.
  await hello.evaluate(n=>scrollTo({top:n.getBoundingClientRect().top+scrollY-innerHeight+5,behavior:'instant'}));
  await page.waitForTimeout(300);
  await expect(hello).toHaveText('Say hello');
  await page.locator('.connect').scrollIntoViewIfNeeded();
  await expect.poll(()=>hello.textContent()).not.toBe('Say hello');
  await expect(hello).toHaveText('Say hello',{timeout:4000});
  await expect.poll(()=>hello.textContent(),{timeout:6000}).not.toBe('Say hello');
  await expect(hello).toHaveText('Say hello',{timeout:4000});
});

test('touch taps create brief sparks only on Home and About animation pages',async({page,isMobile})=>{
  test.skip(!isMobile,'Requires a touch screen.');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  await page.touchscreen.tap(170,350);
  await expect.poll(()=>sparkPixels(page,'.home-sparks')).toBeGreaterThan(0);
  await expect.poll(()=>sparkPixels(page,'.home-sparks')).toBe(0);
  // A tap near the footer, outside the artwork, also produces sparks.
  await page.touchscreen.tap(170,await page.evaluate(()=>innerHeight-24));
  await expect.poll(()=>sparkPixels(page,'.home-sparks')).toBeGreaterThan(0);
  await expect.poll(()=>sparkPixels(page,'.home-sparks')).toBe(0);
  await expect(page.locator('#home-scene .animation-toggle')).toBeHidden();
  await page.getByRole('link',{name:'About',exact:true}).tap();
  await page.touchscreen.tap(170,350);
  await expect.poll(()=>sparkPixels(page,'.about-sparks')).toBeGreaterThan(0);
  await expect.poll(()=>sparkPixels(page,'.about-sparks')).toBe(0);
  await page.locator('.about-read').tap();
  await page.touchscreen.tap(170,350);
  expect(await sparkPixels(page,'.about-sparks')).toBe(0);
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Projects',exact:true}).tap();
  await page.touchscreen.tap(170,650);
  expect(await sparkPixels(page,'.home-sparks')).toBe(0);
  expect(await sparkPixels(page,'.about-sparks')).toBe(0);
});

for(const route of ['/','/about'])test(`first visit to ${route} autoplays 4K before content loads, without navigation`,async({page,isMobile})=>{
  let releaseContent;
  const waiting=new Promise(resolve=>{releaseContent=resolve;});
  await page.route('**/content/published.json',async request=>{await waiting;await request.continue();});
  try {
    await page.goto(route,{waitUntil:'domcontentloaded'});
    const scene=page.locator(route==='/'?'#home-scene':'.about-hero');
    const video=scene.locator('video');
    await expect.poll(()=>video.evaluate(v=>!v.paused&&v.currentTime>.1&&Math.max(v.videoWidth,v.videoHeight)===3840),{timeout:20000}).toBe(true);
    await expect(scene.locator('.animation-frame')).toHaveClass(/is-playing/);
    const initial=await video.evaluate(v=>v.currentTime);
    await expect.poll(()=>video.evaluate(v=>v.currentTime)).toBeGreaterThan(initial+.15);
    await expect(page.locator('#local-time')).toHaveText('My local time —');
    if(isMobile)await expect(scene.locator('.animation-toggle')).toBeHidden();
    expect(await video.evaluate(v=>getComputedStyle(v).opacity)).toBe('1');
  } finally {releaseContent();}
  await expect(page.locator('#local-time')).toContainText(/\d/);
});

test('a first-load playback interruption recovers automatically without a tap',async({page,isMobile})=>{
  await page.addInitScript(()=>{
    const play=HTMLMediaElement.prototype.play;
    let attempts=0;
    HTMLMediaElement.prototype.play=function(){
      attempts++;
      if(attempts===1)return Promise.reject(new DOMException('Startup interrupted','AbortError'));
      return play.call(this);
    };
    for(const name of ['play','playing'])document.addEventListener(name,event=>{
      if(attempts<2&&event.target instanceof HTMLMediaElement)event.target.pause();
    },true);
  });
  await page.goto('/');
  const scene=page.locator('#home-scene');
  await expect.poll(()=>scene.locator('video').evaluate(v=>!v.paused&&v.currentTime>.1),{timeout:20000}).toBe(true);
  await expect(scene.locator('.animation-frame')).toHaveClass(/is-playing/);
  if(isMobile)await expect(scene.locator('.animation-toggle')).toBeHidden();
});

test('slow phone buffering never adds Loading or Pause controls during automatic playback',async({page,isMobile})=>{
  test.skip(!isMobile,'Phone presentation.');
  await page.route('**/media/*.mp4',async route=>{await new Promise(resolve=>setTimeout(resolve,1200));await route.continue();});
  for(const path of ['/','/about']){
    await page.goto(path,{waitUntil:'domcontentloaded'});
    const scene=page.locator(path==='/'?'#home-scene':'.about-hero');
    await expect(scene.locator('.animation-toggle')).toBeHidden();
    await expect.poll(()=>scene.locator('video').evaluate(v=>v.currentTime>.1&&!v.paused),{timeout:20000}).toBe(true);
    await expect(scene.locator('.animation-toggle')).toBeHidden();
    await expect(scene).not.toContainText('Loading');
  }
});

for(const target of ['control','canvas'])test(`browser-required ${target} tap resumes once and keeps the phone movie playing`,async({page,isMobile})=>{
  test.skip(!isMobile,'Trusted phone taps.');
  await page.addInitScript(()=>{
    const play=HTMLMediaElement.prototype.play;
    let unlocked=false;
    for(const name of ['touchend','click'])document.addEventListener(name,event=>{if(event.isTrusted)unlocked=true;},true);
    HTMLMediaElement.prototype.play=function(){
      return unlocked?play.call(this):Promise.reject(new DOMException('Requires gesture','NotAllowedError'));
    };
    for(const name of ['play','playing'])document.addEventListener(name,event=>{
      if(!unlocked&&event.target instanceof HTMLMediaElement)event.target.pause();
    },true);
  });
  await page.goto('/');
  const scene=page.locator('#home-scene');
  await expect(scene.getByRole('button',{name:'Play animation'})).toBeVisible();
  if(target==='control')await scene.getByRole('button',{name:'Play animation'}).tap();
  else await page.touchscreen.tap(160,350);
  await expect.poll(()=>scene.locator('video').evaluate(v=>!v.paused&&v.currentTime>.1),{timeout:20000}).toBe(true);
  await expect(scene.locator('.animation-toggle')).toBeHidden();
  const initial=await scene.locator('video').evaluate(v=>v.currentTime);
  await expect.poll(()=>scene.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(initial+.2);
});

for(const [width,height] of [[320,568],[393,641],[430,932]])test(`phone ${width} × ${height} uses the original 4K portrait composition without added sky`,async({page})=>{
  await page.setViewportSize({width,height});
  await page.goto('/');
  const video=page.locator('#home-scene video');
  await expect.poll(()=>video.evaluate(v=>v.videoHeight),{timeout:20000}).toBe(3840);
  expect(await video.evaluate(v=>v.videoWidth)).toBe(2160);
  await expect.poll(()=>video.evaluate(v=>v.currentSrc)).toContain('/media/home-phone.mp4');
  await expect(page.locator('#home-scene .scene-poster')).toHaveAttribute('src','/media/home-phone.webp');
  expect(await page.locator('#home-scene .animation-frame').evaluate(n=>getComputedStyle(n).backgroundImage)).toBe('none');
  const view=await video.evaluate(v=>{
    const box=v.getBoundingClientRect();
    const scale=(getComputedStyle(v).objectFit==='contain'?Math.min:Math.max)(box.width/v.videoWidth,box.height/v.videoHeight);
    return {left:box.x+(box.width-v.videoWidth*scale)/2,right:box.x+(box.width+v.videoWidth*scale)/2,
      top:box.y+(box.height-v.videoHeight*scale)/2,bottom:box.y+(box.height+v.videoHeight*scale)/2};
  });
  // The supplied portrait movie fills the screen with its own composition.
  expect(view.left).toBeLessThanOrEqual(.01);
  expect(view.right).toBeGreaterThanOrEqual(width-.01);
  expect(view.top).toBeLessThanOrEqual(.01);
  expect(view.bottom).toBeGreaterThanOrEqual(height-.01);
  expect((view.left+view.right)/2).toBeCloseTo(width/2);
  expect((view.top+view.bottom)/2).toBeCloseTo(height/2);
});

for(const [width,height] of [[390,664],[430,932]])test(`portrait phone ${width} × ${height} shows the full About illustration across the available width`,async({page})=>{
  await page.setViewportSize({width,height});
  await page.goto('/about');
  const picture=page.locator('.about-hero .scene-poster');
  await picture.evaluate(n=>n.decode());
  const artwork=await picture.evaluate(n=>{
    const rect=n.getBoundingClientRect(),fit=getComputedStyle(n).objectFit;
    const scale=(fit==='cover'?Math.max:Math.min)(rect.width/n.naturalWidth,rect.height/n.naturalHeight);
    // Measured occupied area in the supplied 4K poster (empty margins excluded).
    const x=rect.x+(rect.width-n.naturalWidth*scale)/2;
    const y=rect.y+(rect.height-n.naturalHeight*scale)/2;
    return {left:x+53*scale,right:x+2073*scale,top:y+1389*scale,bottom:y+2473*scale};
  });
  expect(artwork.right-artwork.left).toBeGreaterThan(width*.93);
  expect(artwork.left).toBeGreaterThanOrEqual(0);
  expect(artwork.right).toBeLessThanOrEqual(width);
  const nav=await page.locator('.site-nav').boundingBox();
  const read=await page.locator('.about-read').boundingBox();
  expect(artwork.top).toBeGreaterThan(nav.y+nav.height);
  expect(artwork.bottom).toBeLessThan(read.y);
});

test('phone toolbar height changes keep the frame filled and playback continuous',async({page})=>{
  await page.setViewportSize({width:393,height:641});
  await page.goto('/');
  const video=page.locator('#home-scene video');
  await expect.poll(()=>video.evaluate(v=>v.currentTime),{timeout:20000}).toBeGreaterThan(.1);
  await video.evaluate(v=>{window.metadataReloads=0;v.addEventListener('loadedmetadata',()=>window.metadataReloads++);});
  for(const height of [740,641]){
    const before=await video.evaluate(v=>v.currentTime);
    await page.setViewportSize({width:393,height});
    await expect.poll(()=>page.locator('#home-scene').evaluate(n=>n.getBoundingClientRect().height)).toBe(height);
    await expect.poll(()=>video.evaluate(v=>v.currentTime)).toBeGreaterThan(before+.1);
    expect(await page.evaluate(()=>window.metadataReloads)).toBe(0);
    expect(await page.evaluate(()=>scrollY)).toBe(0);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(height);
  }
});
