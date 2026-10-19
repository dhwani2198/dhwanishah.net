import {test,expect} from '@playwright/test';
import {projectPreview,openProject} from './helpers/project-preview.mjs';
const projects=['tally','sprint-x','curalink','architectural-design'];
test.beforeEach(async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});});

test('landing stays isolated until View projects is clicked on phone and desktop',async({page,isMobile,browserName})=>{
  await page.goto('/');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  if(isMobile&&browserName==='webkit')await page.evaluate(()=>scrollTo({top:1800,behavior:'instant'}));
  else await page.mouse.wheel(0,1800);
  await page.keyboard.press('PageDown');
  await page.keyboard.press('End');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#home-scene')).toBeVisible();
  await expect(page.locator('#projects-scene')).toBeHidden();
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(await page.evaluate(()=>innerHeight));
  await page.getByRole('link',{name:'View projects',exact:true}).click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.locator('#home-scene')).toBeHidden();
  await expect(page.locator('#projects-scene')).toBeVisible();
});

test('project arrow opens published previews in the appropriate phone or desktop layout',async({page,isMobile})=>{
  await page.goto('/');
  await page.getByRole('link',{name:'View projects',exact:true}).click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.locator('.project-list a')).toHaveCount(5);
  const preview=await projectPreview(page,'sprint-x',{hover:!isMobile});
  await expect(preview.card).toBeVisible();
  await expect(preview.image).toHaveAttribute('src','/assets/images/2Jvkn49eF0WOnLiSONCsAKZSSRQ.jpg');
  await expect(preview.card.locator('h2')).toHaveText('Sprint X');
  if(!isMobile)await expect(page.locator('.preview-connector path')).toHaveAttribute('d',/ C /);
  else await expect(page.locator('#project-viewer')).not.toBeVisible();
  await expect(page.getByRole('link',{name:'Open Sprint X project'})).toHaveAttribute('href','/sprint-x');
  await preview.copy.locator('p').click();
  await expect(page.locator('#project-viewer')).toBeVisible();
  await expect(page.locator('#case-title')).toHaveText('Sprint X');
});

test('viewer switches projects, scrolls internally, expands, closes, and returns home',async({page})=>{
  await page.goto('/tally');
  const viewer=page.locator('#project-viewer');
  await expect(viewer).toBeVisible();
  await viewer.getByRole('link',{name:'CuraLink',exact:true}).click();
  await expect(page).toHaveURL(/\/curalink$/);
  await expect(page.locator('#case-title')).toHaveText('CuraLink');
  await expect(page.frameLocator('.published-case').locator('body')).toContainText('As the solo designer for CuraLink');
  await page.locator('.published-case').evaluate(node=>node.contentWindow.scrollTo(0,800));
  expect(await page.locator('.published-case').evaluate(node=>node.contentWindow.scrollY)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>window.scrollY)).toBe(0);
  const initial=await viewer.boundingBox();
  await page.getByRole('button',{name:'Expand project viewer'}).click();
  const expanded=await viewer.boundingBox();
  expect(expanded.height).toBeGreaterThan(initial.height);
  await expect(page.getByRole('button',{name:'Restore project viewer size'})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Close project viewer'}).click();
  await expect(viewer).not.toBeVisible();
  await expect(page).toHaveURL(/#projects$/);
  await page.getByRole('link',{name:'Return to the homepage'}).click();
  await expect(page.locator('#home-scene')).toBeVisible();
});

test('direct project URLs and browser history preserve viewer state',async({page})=>{
  await page.goto('/#projects');
  const open=async id=>{
    await openProject(page,id);
  };
  await open('tally');
  await page.locator('.project-tabs [data-project="sprint-x"]').click();
  await page.goBack();
  await expect(page.locator('#case-title')).toHaveText('Tally');
  await page.goBack();
  await expect(page.locator('#project-viewer')).not.toBeVisible();
  await page.goForward();
  await expect(page.locator('#case-title')).toHaveText('Tally');
  await page.reload();
  await expect(page.locator('#project-viewer')).toBeVisible();
  for(const id of projects){
    await page.goto('/'+id);
    await expect(page.locator(`[data-article="${id}"]`)).toBeVisible();
  }
});

test('keyboard previews, modal focus, and Escape work',async({page})=>{
  await page.goto('/#projects');
  const preview=await projectPreview(page,'tally');
  const project=preview.link;
  await expect(preview.card).toBeVisible();
  // The full preview card also supports keyboard users on touch devices.
  await preview.card.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#project-viewer')).toBeVisible();
  for(let i=0;i<8;i++){
    await page.keyboard.press('Tab');
    expect(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('#project-viewer')).not.toBeVisible();
  await expect(project).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#project-viewer')).toBeVisible();
});

test('About keeps the published biography, artwork, credentials, and contact links',async({page,isMobile})=>{
  await page.goto('/about');
  await expect(page.locator('#about-scene')).toBeVisible();
  await page.locator('.about-read').click();
  await expect(page.locator('.about-content')).toContainText('I started out as an architect');
  await expect(page.locator('.about-content')).toContainText('Google UX Design Professional');
  await expect(page.locator('.art-grid img')).toHaveCount(2);
  await expect(page.locator('.art-grid a')).toHaveCount(0);
  await expect(page.locator('.art-grid img').last()).toHaveAttribute('src','/assets/images/qCHg2J51RnCOVjeW4OKlRllH0.png');
  expect(await page.locator('.art-grid img').last().evaluate(n=>getComputedStyle(n).backgroundColor)).toBe('rgb(0, 0, 0)');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('.contact-links a').first()).toHaveAttribute('href','mailto:dhwani0321@gmail.com');
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Projects',exact:true}).click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.locator('#projects-scene')).toBeVisible();
  expect(await page.evaluate(()=>window.scrollY)).toBe(0);
});

test('published Blog and Resume links open separately',async({page})=>{
  await page.goto('/');
  const nav=page.getByRole('navigation',{name:'Main navigation'});
  await expect(nav.getByRole('link',{name:/Blog/})).toHaveAttribute('href','https://dhwani0321.substack.com/');
  await expect(nav.getByRole('link',{name:/Resume/})).toHaveAttribute('href','https://flowcv.com/resume/la3q6sc74157');
  await expect(nav.getByRole('link',{name:/Blog/})).toHaveAttribute('target','_blank');
  await expect(nav.getByRole('link',{name:/Resume/})).toHaveAttribute('target','_blank');
});

test('San Francisco clock handles both PST and PDT',async({page})=>{
  await page.goto('/');
  const times=await page.evaluate(async()=>{
    const {formatLocalTime}=await import(document.querySelector('script[type="module"]').src);
    return [formatLocalTime(new Date('2026-01-15T20:10:41Z')),formatLocalTime(new Date('2026-07-15T23:10:41Z'))];
  });
  expect(times).toEqual(['My local time — 12:10:41 PM PST','My local time — 4:10:41 PM PDT']);
});

test('core animations keep playing with Reduce Motion, matching the original website',async({page})=>{
  await page.goto('/');
  await expect.poll(()=>page.locator('#home-scene video').evaluate(video=>!video.paused&&video.currentTime>0&&Math.max(video.videoWidth,video.videoHeight)===3840),{timeout:20000}).toBe(true);
  await page.getByRole('link',{name:'About',exact:true}).click();
  await expect.poll(()=>page.locator('#about-scene video').evaluate(video=>!video.paused&&video.currentTime>0&&Math.max(video.videoWidth,video.videoHeight)===3840),{timeout:20000}).toBe(true);
  await page.locator('.about-read').click();
  await page.locator('.connect').scrollIntoViewIfNeeded();
  await expect.poll(()=>page.locator('.hello-text').textContent()).not.toBe('Say hello');
  await expect(page.locator('.hello-text')).toHaveText('Say hello',{timeout:4000});
});

test('supplied 4K video plays and pauses when Projects opens',async({page,isMobile})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/');
  await expect.poll(()=>page.locator('#home-scene video').evaluate(video=>Math.max(video.videoWidth,video.videoHeight)),{timeout:20000}).toBe(3840);
  await expect.poll(()=>page.locator('#home-scene video').evaluate(video=>video.paused)).toBe(false);
  await expect.poll(()=>page.locator('#home-scene video').evaluate(v=>v.currentSrc)).toContain(`/media/home-${isMobile?'phone':'desktop'}-playback.mp4`);
  await page.getByRole('link',{name:'View projects',exact:true}).click();
  await expect.poll(()=>page.locator('#home-scene video').evaluate(video=>video.paused)).toBe(true);
});

test('video failure leaves a poster and usable navigation',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.route('**/media/*.mp4',route=>route.abort());
  await page.goto('/');
  await expect(page.locator('#home-scene .scene-poster')).toBeVisible();
  await page.getByRole('link',{name:'View projects',exact:true}).click();
  await expect(page.locator('#projects-scene')).toBeVisible();
});

test('tablet and landscape use the supplied compositions with the correct native flow',async({page,isMobile})=>{
  await page.setViewportSize({width:1024,height:768});
  await page.goto('/');
  await expect(page.locator('#home-scene .scene-poster')).toHaveAttribute('src','/media/home-tablet-playback.webp');
  await page.setViewportSize({width:844,height:390});
  await expect(page.locator('#home-scene .scene-poster')).toHaveAttribute('src','/media/home-desktop-playback.webp');
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
});

test('About plays its 4K animation and pauses when the biography is visible',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/about');
  await expect.poll(()=>page.locator('#about-scene video').evaluate(video=>Math.max(video.videoWidth,video.videoHeight)),{timeout:20000}).toBe(3840);
  await expect.poll(()=>page.locator('#about-scene video').evaluate(video=>video.paused)).toBe(false);
  await page.locator('.about-read').click();
  await expect.poll(()=>page.locator('#about-scene video').evaluate(video=>video.paused)).toBe(true);
});

test('About centers the visible artwork across desktop, tablet, phone, and orientation changes',async({page})=>{
  const layouts=[
    {width:1440,height:900,variant:'desktop',sourceWidth:3840,sourceHeight:2160,bounds:[112,132,3492,1720]},
    {width:1920,height:1080,variant:'desktop',sourceWidth:3840,sourceHeight:2160,bounds:[112,132,3492,1720]},
    {width:1280,height:720,variant:'desktop',sourceWidth:3840,sourceHeight:2160,bounds:[112,132,3492,1720]},
    {width:768,height:1024,variant:'tablet',sourceWidth:3840,sourceHeight:2880,bounds:[120,492,3492,2080]},
    {width:1024,height:768,variant:'tablet',sourceWidth:3840,sourceHeight:2880,bounds:[120,492,3492,2080]},
    {width:393,height:641,variant:'phone',sourceWidth:2160,sourceHeight:3840,bounds:[68,1388,1966,2282]},
    {width:844,height:390,variant:'desktop',sourceWidth:3840,sourceHeight:2160,bounds:[112,132,3492,1720]},
    {width:1440,height:900,variant:'desktop',sourceWidth:3840,sourceHeight:2160,bounds:[112,132,3492,1720]},
  ];
  await page.setViewportSize({width:layouts[0].width,height:layouts[0].height});
  await page.goto('/about');
  const video=page.locator('.about-hero .scene-video');
  for(const layout of layouts){
    await page.setViewportSize({width:layout.width,height:layout.height});
    await expect.poll(()=>video.evaluate(v=>[v.videoWidth,v.videoHeight]),{timeout:20000}).toEqual([layout.sourceWidth,layout.sourceHeight]);
    await expect.poll(()=>video.evaluate(v=>!v.paused&&v.currentTime>.1)).toBe(true);
    await expect.poll(()=>video.evaluate(v=>v.currentSrc)).toContain(`/media/about-${layout.variant}-playback.mp4`);
    const nav=await page.locator('.site-nav').boundingBox();
    for(const media of [video,page.locator('.about-hero .scene-poster')]){
      const artwork=()=>media.evaluate((node,layout)=>{
        const box=node.getBoundingClientRect();
        const scale=Math.min(box.width/layout.sourceWidth,box.height/layout.sourceHeight);
        const x=box.x+(box.width-layout.sourceWidth*scale)/2;
        const y=box.y+(box.height-layout.sourceHeight*scale)/2;
        const [left,top,right,bottom]=layout.bounds;
        return {left:x+left*scale,right:x+right*scale,top:y+top*scale,bottom:y+bottom*scale};
      },layout);
      // A same-source resize can complete before its resize event updates the
      // centering offset. Wait for that layout work before measuring bounds.
      await expect.poll(async()=>{const art=await artwork();return (art.left+art.right)/2;}).toBeCloseTo(layout.width/2,1);
      const art=await artwork();
      expect(art.left).toBeGreaterThanOrEqual(0);
      expect(art.right).toBeLessThanOrEqual(layout.width);
      expect(art.top).toBeGreaterThan(nav.y+nav.height);
      expect(art.bottom).toBeLessThan(layout.height);
    }
  }
});

test('local pages render without missing assets or script errors',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.url().includes('127.0.0.1:4187')&&response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  for(const route of ['/','/about','/topnotch',...projects.map(id=>'/'+id)]){
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-view',route==='/about'?'about':route==='/'?'home':'projects');
  }
  expect(errors).toEqual([]);
});

test('landing fills the viewport and View projects has a pill',async({page,isMobile})=>{
  await page.goto('/');
  const styles=await page.locator('#home-scene .scene-poster').evaluate(node=>({fit:getComputedStyle(node).objectFit,rect:node.getBoundingClientRect().toJSON()}));
  expect(styles.fit).toBe('fill');
  const scene=await page.locator('#home-scene').boundingBox();
  expect(styles.rect.width).toBe(scene.width);
  expect(styles.rect.height).toBe(scene.height);
  const pill=await page.locator('.project-trigger').evaluate(node=>({radius:getComputedStyle(node).borderRadius,background:getComputedStyle(node).backgroundColor}));
  expect(pill.radius).toBe('28px');
  expect(pill.background).not.toBe('rgba(0, 0, 0, 0)');
});

test('About biography opens only on click, uses black and uniform paragraph sizes, and returns to animation',async({page})=>{
  await page.goto('/about');
  await expect(page.locator('#about-story')).toBeHidden();
  await page.evaluate(()=>scrollTo(0,1400));
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  const frame=await page.locator('.about-hero .animation-frame').boundingBox();
  const nav=await page.locator('.site-nav').boundingBox();
  expect(frame.y).toBeGreaterThan(nav.y+nav.height);
  await page.locator('.about-read').click();
  await expect(page).toHaveURL(/\/about#about-story$/);
  await expect(page.locator('.about-hero')).toBeHidden();
  const styles=await page.locator('.about-chapter').first().locator('p').evaluateAll(nodes=>nodes.map(n=>({size:getComputedStyle(n).fontSize,line:getComputedStyle(n).lineHeight})));
  expect(styles[0]).toEqual(styles[1]);
  expect(await page.locator('#about-story').evaluate(n=>getComputedStyle(n).backgroundColor)).toBe('rgb(0, 0, 0)');
  await page.evaluate(()=>scrollTo(0,1000));
  expect(await page.evaluate(()=>scrollY)).toBeGreaterThan(0);
  await expect(page.locator('.about-back')).toHaveText('Back');
  await page.locator('.about-back').click();
  await expect(page.locator('.about-hero')).toBeVisible();
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  await page.goBack();
  await expect(page.locator('#about-story')).toBeVisible();
});

test('static project cover opens its case study and connector clears the arrow',async({page,isMobile})=>{
  await page.goto('/#projects');
  const preview=await projectPreview(page,'tally',{hover:!isMobile});
  await expect(preview.image).toHaveAttribute('src','/assets/images/krraSyH08fFeIOG9BdqEzE7QuWs.jpg');
  if(!isMobile){
    const gap=await page.evaluate(()=> {
      const box=document.querySelector('.project-stage').getBoundingClientRect();
      const link=document.querySelector('.project-link.is-selected').getBoundingClientRect();
      const start=document.querySelector('.preview-connector path').getAttribute('d').match(/^M ([\d.]+)/)[1];
      return Number(start)+box.left-link.right;
    });
    expect(gap).toBeGreaterThanOrEqual(19);
  }
  await preview.image.click();
  await expect(page.locator('#project-viewer')).toBeVisible();
  await page.getByRole('button',{name:'Close project viewer'}).click();
  await expect(preview.image).toBeVisible();
});

test('Say hello resolves from ASCII and uses a proportionate SVG arrow',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/about#about-story');
  await page.locator('.connect').scrollIntoViewIfNeeded();
  await expect.poll(()=>page.locator('.hello-text').textContent()).not.toBe('Say hello');
  await expect(page.locator('.hello-text')).toHaveText('Say hello',{timeout:4000});
  await expect(page.locator('.hello-arrow')).toBeVisible();
  await expect(page.getByRole('link',{name:'Say hello by email'})).toHaveAttribute('href','mailto:dhwani0321@gmail.com');
});

test('case studies preserve published structure, Tally embeds its demo, and Sprint videos retain posters',async({page})=>{
  await page.route('https://tallyautomate.lovable.app/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<p>Tally interactive demo</p>'}));
  await page.goto('/tally');
  const tally=page.frameLocator('.published-case');
  await expect(tally.locator('[data-framer-name="Intro/Overview"]')).toHaveCount(4);
  await expect(tally.locator('iframe:visible')).toHaveAttribute('src','https://tallyautomate.lovable.app');
  await expect(tally.locator('iframe:visible')).toHaveAttribute('title','Tally interactive bookkeeping demo');
  const label=tally.locator('.case-section-label').filter({hasText:'OVERVIEW'}).first();
  const labelStyles=await label.evaluate(n=>({family:getComputedStyle(n).fontFamily,size:getComputedStyle(n).fontSize,spacing:getComputedStyle(n).letterSpacing,weight:getComputedStyle(n).fontWeight}));
  expect(labelStyles.family).toContain('Menlo');
  expect(labelStyles.weight).toBe('400');
  expect(Number.parseFloat(labelStyles.size)).toBeLessThanOrEqual(10);
  expect(Number.parseFloat(labelStyles.spacing)).toBeGreaterThan(1);
  await page.locator('.published-case').evaluate(n=>n.contentWindow.scrollTo(0,400));
  await page.getByRole('button',{name:'Close project viewer'}).click();
  await openProject(page,'tally');
  await expect(page.locator('.published-case')).toBeVisible();
  await page.locator('.project-tabs [data-project="sprint-x"]').click();
  const sprint=page.frameLocator('.published-case');
  await expect(sprint.locator('video[poster]')).not.toHaveCount(0);
  await expect(sprint.locator('.native-carousel')).toHaveCount(1);
  await sprint.locator('.native-carousel').scrollIntoViewIfNeeded();
  await sprint.getByRole('button',{name:'Next',exact:true}).click();
  await expect.poll(()=>sprint.locator('.native-carousel').evaluate(n=>n.scrollLeft)).toBeGreaterThan(0);
  await page.locator('.project-tabs [data-project="curalink"]').click();
  const cura=page.frameLocator('.published-case');
  await expect(cura.locator('[data-framer-name="Role/tools"]')).toContainText('solo designer');
});

const coverSources={tally:'krraSyH08fFeIOG9BdqEzE7QuWs.jpg','sprint-x':'2Jvkn49eF0WOnLiSONCsAKZSSRQ.jpg',curalink:'curalink-frame-1410125354.png','architectural-design':'U8yVw1u3PrsBCjqWiDGsj6Lzrc8.png'};
const coverDimensions={tally:[4032,3024],'sprint-x':[7395,5550],curalink:[2048,1544],'architectural-design':[2698,1888]};
for(const id of projects)test(`${id} uses its selected full-resolution static cover`,async({page})=> {
  await page.emulateMedia({reducedMotion:'no-preference'});
  const previewMovies=[];
  page.on('request',request=>{if(/\/previews\/.*\.mp4/.test(request.url()))previewMovies.push(request.url());});
  await page.goto('/#projects');
  const preview=await projectPreview(page,id);
  const image=preview.image;
  await expect(image).toHaveAttribute('src',`/assets/images/${coverSources[id]}`);
  await image.evaluate(n=>n.decode());
  expect(await image.evaluate(n=>[n.naturalWidth,n.naturalHeight])).toEqual(coverDimensions[id]);
  await expect(page.locator('.preview-panel video')).toHaveCount(0);
  expect(previewMovies).toEqual([]);
});

const sparkPixels=page=>page.locator('.home-sparks').evaluate(canvas=> {
  const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let painted=0;
  for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)painted++;
  return painted;
});

test('homepage cursor sparks fade, pause, and leave navigation clickable',async({page,isMobile})=> {
  test.skip(isMobile,'Sparks apply to a mouse pointer; touch navigation is covered separately.');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  await page.mouse.move(720,390);
  await expect.poll(()=>sparkPixels(page)).toBeGreaterThan(0);
  // Hovering an interactive pill stops emission and lets existing sparks fade.
  await page.locator('.project-trigger').hover();
  await expect.poll(()=>sparkPixels(page)).toBe(0);
  await page.mouse.move(800,390);
  await expect.poll(()=>sparkPixels(page)).toBeGreaterThan(0);
  await page.locator('[data-animation="home"] .animation-toggle').click();
  await expect.poll(()=>sparkPixels(page)).toBe(0);
  await page.locator('[data-animation="home"] .animation-toggle').click();
  await page.mouse.move(730,390);
  await expect.poll(()=>sparkPixels(page)).toBeGreaterThan(0);
  await page.getByRole('link',{name:'View projects',exact:true}).click();
  await expect(page).toHaveURL(/#projects$/);
  await expect.poll(()=>sparkPixels(page)).toBe(0);
  await page.getByRole('link',{name:'Return to the homepage'}).click();
  await page.mouse.move(740,390);
  await expect.poll(()=>sparkPixels(page)).toBeGreaterThan(0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(()=>sparkPixels(page)).toBe(0);
});

test('reduced motion suppresses automatic cursor trails',async({page})=> {
  await page.goto('/');
  await expect(page.locator('#local-time')).toContainText(/\d/);
  await page.mouse.move(160,350);
  expect(await sparkPixels(page)).toBe(0);
  await page.getByRole('link',{name:'View projects',exact:true}).click();
  await expect(page.locator('#projects-scene')).toBeVisible();
});


test('TopNotch is Live with its published preview, App Store link, and project switching',async({page,isMobile,browserName})=>{
  await page.goto('/#projects');
  const preview=await projectPreview(page,'topnotch',{hover:!isMobile});
  const link=preview.link;
  await expect(page.locator('.project-count')).toHaveText('01 — 05');
  await expect(link.locator('.project-status')).toHaveText('Live');
  await expect(preview.card.locator('.project-status')).toHaveText('Live');
  await expect(preview.card.locator('h2')).toHaveText('TopNotch');
  await expect(preview.card.locator(preview.phone?'.phone-card-open':'.preview-open-label')).toHaveText('View preview');
  const image=preview.image;
  await expect(image).toHaveAttribute('src','/assets/images/P1TsvBUS6FZmXAmd8JkmQQ9Et5k.png');
  await image.evaluate(n=>n.decode());
  expect(await image.evaluate(n=>[n.naturalWidth,n.naturalHeight])).toEqual([2880,1800]);
  expect(await image.evaluate(n=>getComputedStyle(n).objectPosition.split(' ').map(value=>Math.round(parseFloat(value)*10)/10))).toEqual([65.4,65.7]);
  const coverBounds=await image.boundingBox();
  expect(Math.abs(coverBounds.width-coverBounds.height)).toBeLessThan(1);
  const coverFrame=await image.locator('..').boundingBox();
  expect(coverFrame.width/coverFrame.height).toBeCloseTo(4/3,2);
  await image.click();
  await expect(page).toHaveURL(/\/topnotch$/);
  await expect(page.locator('#project-viewer')).toBeVisible();
  await expect(page.locator('#case-title')).toHaveText('TopNotch');
  await expect(page.locator('.project-teaser .project-status')).toHaveText('Live');
  await expect(page.locator('.project-tabs [data-project="topnotch"] .project-status')).toHaveText('Live');
  await expect(page.locator('.project-teaser')).not.toContainText(/case study coming soon/i);
  await expect(page.locator('.project-teaser')).toContainText('Less clutter. More focus.');
  const teaserImage=page.locator('.teaser-media img');
  await expect(teaserImage).toHaveAttribute('src','/assets/images/topnotch-final-linkedin.png');
  await teaserImage.evaluate(n=>n.decode());
  expect(await teaserImage.evaluate(n=>[n.naturalWidth,n.naturalHeight])).toEqual([2880,1800]);
  const teaserBounds=await teaserImage.boundingBox();
  expect(teaserBounds.width/teaserBounds.height).toBeCloseTo(2880/1800,2);
  const storeUrl='https://apps.apple.com/us/app/topnotch-meetings-focus/id6814712914?mt=12';
  const storeLink=page.getByRole('link',{name:'Download on the App Store'});
  await expect(storeLink).toBeVisible();
  await expect(storeLink).toHaveAttribute('href',storeUrl);
  await expect(storeLink).toHaveAttribute('target','_blank');
  await expect(storeLink).toHaveAttribute('rel','noopener');
  await expect(page.locator('.project-teaser a[href*="dhwani.framer.ai"]')).toHaveCount(0);
  if(browserName==='webkit'){
    // WebKit hands apps.apple.com links to the OS without creating a browser tab.
    await storeLink.click();
  }else{
    await page.context().route(storeUrl,route=>route.fulfill({contentType:'text/html',body:'<title>TopNotch App Store destination</title>'}));
    const [storePage]=await Promise.all([page.waitForEvent('popup'),storeLink.click()]);
    await expect(storePage).toHaveURL(storeUrl);
    await storePage.close();
    await page.context().unroute(storeUrl);
  }
  await expect(page).toHaveURL(/\/topnotch$/);
  expect(page.context().pages()).toHaveLength(1);
  await page.locator('.project-tabs [data-project="tally"]').click();
  await expect(page.locator('.published-case')).toBeVisible();
  await page.locator('.project-tabs [data-project="topnotch"]').click();
  await expect(page.locator('.project-teaser')).toBeVisible();
  await page.getByRole('button',{name:'Close project viewer'}).click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(preview.card.locator('.project-status')).toBeVisible();
  await page.goto('/topnotch');
  await page.reload();
  await expect(page.locator('#case-title')).toHaveText('TopNotch');
  await expect(page.locator('.project-teaser')).toBeVisible();
  await expect(storeLink).toHaveAttribute('href',storeUrl);
});
