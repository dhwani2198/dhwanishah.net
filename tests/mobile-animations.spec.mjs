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
    await scene.getByRole('button',{name:'Pause animation'}).click();
    await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(true);
    await expect(button).toBeVisible();
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
  await page.locator('#home-scene .animation-toggle').tap();
  await page.touchscreen.tap(170,350);
  await expect.poll(()=>sparkPixels(page,'.home-sparks')).toBeGreaterThan(0);
  await expect.poll(()=>sparkPixels(page,'.home-sparks')).toBe(0);
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
