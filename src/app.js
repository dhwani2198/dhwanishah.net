import { renderArticle, projectStatusLabel, assetVersion } from './render.mjs?v=20261019-topnotch-platforms-35';
import { animateGreeting } from './ascii.js';
import { attachPointerSparks } from './sparks.js';
import { animations, animationIsActive, updateAnimationPlayback } from './animations.js?v=20261019-topnotch-platforms-35';

const phoneLanding = matchMedia('(pointer:coarse) and (max-width:759px), (pointer:coarse) and (max-width:1050px) and (max-height:500px)');
document.documentElement.dataset.phoneLanding=String(phoneLanding.matches&&document.body.dataset.view==='home');
// The router restores the selected card itself; a delayed native history
// restoration must not pull Safari back to an older scroll position.
history.scrollRestoration='manual';

const data = await fetch(`/content/published.json?v=${assetVersion}`).then(response => {
  if (!response.ok) throw new Error('Could not load portfolio content');
  return response.json();
});
const projects = data.projects;
const scenes = Object.fromEntries(['home','projects','about'].map(name=>[name,document.getElementById(`${name}-scene`)]));
const dialog = document.getElementById('project-viewer');
const viewerContent = dialog.querySelector('.viewer-content');
const preview = document.querySelector('.preview-panel');
const stage = document.querySelector('.project-stage');
const connector = document.querySelector('.preview-connector');
const phonePanels=[...document.querySelectorAll('.phone-project-panel')];
const phoneProjectDots=[...document.querySelectorAll('[data-phone-project-target]')];
let phoneProjectIndex=0;
function updatePhoneProjectDots(){
  phoneProjectDots.forEach((dot,index)=>{
    if(index===phoneProjectIndex)dot.setAttribute('aria-current','true');
    else dot.removeAttribute('aria-current');
  });
}
function showPhoneProject(index,{resetScroll=true}={}){
  phoneProjectIndex=Math.max(0,Math.min(projects.length-1,index));
  phonePanels.forEach((panel,i)=>{panel.hidden=i!==phoneProjectIndex;});
  document.body.dataset.phoneProjectLast=String(phoneProjectIndex===projects.length-1);
  updatePhoneProjectDots();
  if(resetScroll)window.scrollTo({top:0,behavior:'instant'});
}
function phoneProjectsActive(){
  return document.documentElement.dataset.phoneLanding==='true'&&currentView==='projects'&&!dialog.open&&Math.abs((visualViewport?.scale||1)-1)<.01;
}
function projectScrollEdges(){
  const visibleBottom=Math.min(innerHeight,(visualViewport?.offsetTop||0)+(visualViewport?.height||innerHeight));
  const panel=phonePanels[phoneProjectIndex];
  const card=panel.querySelector('.phone-project-card');
  const visibleTop=Math.max(visualViewport?.offsetTop||0,document.querySelector('.site-header').getBoundingClientRect().bottom);
  const lastContent=phoneProjectIndex===projects.length-1?document.querySelector('.site-footer'):card;
  // Empty panel padding must not require an extra swipe once the entire card
  // is readable. Use the visible viewport so browser controls cannot hide it.
  return {top:scrollY<=2||card.getBoundingClientRect().top>=visibleTop-2,bottom:lastContent.getBoundingClientRect().bottom<=visibleBottom+2};
}
function canPageProject(direction,edges=projectScrollEdges()){
  return direction>0?edges.bottom&&phoneProjectIndex<projects.length-1:edges.top&&phoneProjectIndex>0;
}
// A swipe pages once. Native scrolling remains available inside a tall card;
// reaching its edge requires a new gesture before changing projects.
let projectSwipe=null;
// The last project's footer is outside .phone-projects. Listen across the
// active project screen so reversing a swipe works there and in blank space.
const phonePager=document.body;
phonePager.addEventListener('touchstart',event=>{
  if(!phoneProjectsActive()||event.touches.length!==1){projectSwipe=null;return;}
  const finger=event.touches[0];
  projectSwipe={x:finger.clientX,y:finger.clientY,edges:projectScrollEdges()};
},{passive:true});
phonePager.addEventListener('touchmove',event=>{
  if(!projectSwipe||!phoneProjectsActive()||event.touches.length!==1){projectSwipe=null;return;}
  const finger=event.touches[0],dy=projectSwipe.y-finger.clientY,dx=projectSwipe.x-finger.clientX;
  if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)*1.25&&canPageProject(Math.sign(dy),projectSwipe.edges))event.preventDefault();
},{passive:false});
phonePager.addEventListener('touchend',event=>{
  const gesture=projectSwipe;
  projectSwipe=null;
  if(!gesture||!phoneProjectsActive()||event.touches.length||event.changedTouches.length!==1)return;
  const finger=event.changedTouches[0],dy=gesture.y-finger.clientY,dx=gesture.x-finger.clientX;
  if(Math.abs(dy)<48||Math.abs(dy)<Math.abs(dx)*1.25||!canPageProject(Math.sign(dy),gesture.edges))return;
  event.preventDefault();
  showPhoneProject(phoneProjectIndex+Math.sign(dy));
},{passive:false});
phonePager.addEventListener('touchcancel',()=>{projectSwipe=null;},{passive:true});
let wheelDistance=0,wheelDirection=0,wheelPaged=false,wheelReset,wheelEdges=null;
phonePager.addEventListener('wheel',event=>{
  if(!phoneProjectsActive()||event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.deltaY)return;
  clearTimeout(wheelReset);
  wheelReset=setTimeout(()=>{wheelDistance=0;wheelDirection=0;wheelPaged=false;wheelEdges=null;},200);
  const direction=Math.sign(event.deltaY);
  if(wheelDirection&&direction!==wheelDirection){
    wheelDistance=0;wheelPaged=false;wheelEdges=null;
  }
  wheelDirection=direction;
  wheelEdges ||= projectScrollEdges();
  if(wheelPaged){event.preventDefault();return;}
  if(!canPageProject(direction,wheelEdges))return;
  event.preventDefault();
  wheelDistance+=Math.abs(event.deltaY)*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
  if(wheelDistance>=40){wheelPaged=true;showPhoneProject(phoneProjectIndex+direction);}
},{passive:false});
addEventListener('keydown',event=>{
  if(!phoneProjectsActive()||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey)return;
  const direction=['ArrowDown','PageDown'].includes(event.key)?1:['ArrowUp','PageUp'].includes(event.key)?-1:0;
  if(!direction||!canPageProject(direction))return;
  event.preventDefault();
  showPhoneProject(phoneProjectIndex+direction);
});
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const touch = matchMedia('(hover: none)');
const sparks=Object.fromEntries(['home','about'].map(name=>[
  name,attachPointerSparks(document.querySelector(`.${name}-sparks`),name==='about'?document.querySelector('.about-hero'):scenes.home,reducedMotion),
]));
animateGreeting(document.querySelector('.hello-text'));
let selectedProject = null;
let currentView = null;
let currentArticle = viewerContent.querySelector('[data-article]')?.dataset.article;
let lineFrame;
let expectedDialogCloses=0;

export function formatLocalTime(date = new Date()) {
  return `My local time — ${new Intl.DateTimeFormat('en-US', {timeZone:'America/Los_Angeles', hour:'numeric', minute:'2-digit', second:'2-digit', hour12:true, timeZoneName:'short'}).format(date)}`;
}
function tick() {
  const now = new Date();
  const clock = document.getElementById('local-time');
  clock.textContent = formatLocalTime(now);
  clock.dateTime = now.toISOString();
}
tick();
setInterval(tick,1000);

function drawConnector() {
  cancelAnimationFrame(lineFrame);
  lineFrame = requestAnimationFrame(()=> {
    if (!selectedProject || preview.hidden || currentView !== 'projects' || innerWidth < 760) {
      connector.style.opacity = '0'; return;
    }
    const box = stage.getBoundingClientRect();
    const link = document.querySelector(`.project-list [data-project="${selectedProject.id}"]`).getBoundingClientRect();
    const card = preview.getBoundingClientRect();
    const startX = link.right-box.left+20, startY = link.top+link.height/2-box.top;
    const endX = card.left-box.left-18, endY = card.top+card.height*.42-box.top;
    connector.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const bend = Math.max(18,(endX-startX)*.38);
    connector.querySelector('path').setAttribute('d',`M ${startX} ${startY} C ${startX+bend} ${startY+28}, ${endX-bend} ${endY+28}, ${endX} ${endY}`);
    connector.querySelector('circle').setAttribute('cx',endX);
    connector.querySelector('circle').setAttribute('cy',endY);
    connector.style.opacity = endX > startX ? '1' : '0';
  });
}

function selectProject(id) {
  const project = projects.find(project=>project.id===id);
  if (!project) return;
  selectedProject = project;
  document.querySelectorAll('.project-list [data-project]').forEach(link=> {
    const selected = link.dataset.project===id;
    link.classList.toggle('is-selected',selected);
    if (selected) link.setAttribute('aria-current','true'); else link.removeAttribute('aria-current');
  });
  preview.hidden=false;
  preview.dataset.previewProject=id;
  preview.href=`/${id}`;
  preview.setAttribute('aria-label',project.caseStudy?`Open ${project.title} project`:`Preview ${project.title}`);
  const image=preview.querySelector('.preview-original');
  image.src=project.preview;
  image.alt=`${project.title} — project preview`;
  preview.querySelector('h2').textContent=project.title;
  preview.querySelector('.preview-status').textContent=projectStatusLabel(project);
  preview.querySelector('.preview-status').dataset.status=project.status||'';
  preview.querySelector('.preview-status').hidden=!projectStatusLabel(project);
  preview.querySelector('.preview-open-label').textContent=project.caseStudy?'Open project':'View preview';
  preview.querySelector('.preview-description').textContent=project.description;
  preview.querySelector('.preview-tags').replaceChildren(...project.tags.map(tag=> {
    const span=document.createElement('span');span.textContent=tag;return span;
  }));
  image.addEventListener('load',drawConnector,{once:true});
  drawConnector();
}

document.querySelectorAll('.project-list [data-project]').forEach(link=> {
  link.addEventListener('pointerenter',event=> {if(innerWidth>=760 && event.pointerType!=='touch')selectProject(link.dataset.project);});
  link.addEventListener('focus',()=>selectProject(link.dataset.project));
});
stage.addEventListener('pointerleave',()=> {
  if (touch.matches || dialog.open || stage.contains(document.activeElement)) return;
  selectedProject=null;
  preview.hidden=true;
  document.querySelectorAll('.project-link').forEach(link=>{link.classList.remove('is-selected');link.removeAttribute('aria-current');});
  drawConnector();
});

function updateSparkState() {
  for(const animation of animations) {
    sparks[animation.frame.dataset.animation].setActive(animationIsActive(animation)&&!dialog.open,!animation.userPaused);
  }
}
function updatePlayback() {
  updateAnimationPlayback();
  updateSparkState();
}
document.addEventListener("animationstatechange",updateSparkState);

function routeState() {
  const path=location.pathname.replace(/\/$/,'')||'/';
  const project=projects.find(project=>`/${project.id}`===path);
  return {project,story:path==='/about'&&location.hash==='#about-story',view:project?'projects':path==='/about'?'about':location.hash==='#projects'?'projects':'home'};
}
function renderLocation({focus=false}={}) {
  const {view,project,story}=routeState();
  const changedView=currentView!==view;
  const changedStory=document.body.dataset.aboutStory!==String(story);
  const leavingProject=dialog.open&&!project;
  const phoneFlow=phoneLanding.matches&&!project&&(view==='home'||view==='projects');
  document.documentElement.dataset.phoneLanding=String(phoneFlow);
  currentView=view;
  document.body.dataset.view=view;
  document.body.dataset.aboutStory=String(story);
  document.querySelector('.about-hero').hidden=story;
  document.getElementById('about-story').hidden=!story;
  for(const [name,scene] of Object.entries(scenes))scene.hidden=name!==view;
  showPhoneProject(project?projects.indexOf(project):phoneProjectIndex,{resetScroll:false});
  document.querySelector('.home-link').hidden=view==='home';
  document.querySelectorAll('[data-nav]').forEach(link=> {
    if(link.dataset.nav===view)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  });
  document.title=project?`${project.title} — Dhwani Shah`:view==='about'?'About — Dhwani Shah':'Dhwani Shah';
  const canonical=project?`/${project.id}`:view==='about'?'/about':'/';
  document.querySelector('link[rel="canonical"]').href=`https://dhwanishah.net${canonical}`;
  document.querySelector('meta[name="description"]').content=project?.description||'Dhwani Shah — product design, AI workflows, and architectural design.';
  if(changedView||changedStory||leavingProject||focus){
    window.scrollTo({top:0,behavior:'instant'});
  }
  if(project) {
    phoneProjectIndex=projects.indexOf(project);
    selectProject(project.id);
    if(currentArticle!==project.id) {
      viewerContent.querySelectorAll('video').forEach(video=>video.pause());
      viewerContent.innerHTML=renderArticle(project);
      viewerContent.scrollTop=0;
      currentArticle=project.id;
    }
    document.querySelectorAll('.project-tabs [data-project]').forEach(link=> {
      if(link.dataset.project===project.id)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    });
    if(!dialog.open){
      const selectedTab=dialog.querySelector(`.project-tabs [data-project="${project.id}"]`);
      selectedTab.autofocus=true;
      dialog.showModal();
      selectedTab.autofocus=false;
    }
    if(focus)dialog.querySelector(`[data-project="${project.id}"]`).focus({preventScroll:true});
  } else {
    const wasOpen=dialog.open;
    if(wasOpen) {
      viewerContent.querySelectorAll('video').forEach(video=>video.pause());
      viewerContent.querySelectorAll('iframe').forEach(frame=>frame.remove());
      currentArticle=null;
      expectedDialogCloses++;
      dialog.close();
      dialog.classList.remove('is-expanded');
      dialog.querySelector('.expand-viewer').setAttribute('aria-pressed','false');
      dialog.querySelector('.expand-viewer').setAttribute('aria-label','Expand project viewer');
    }
    if(focus && wasOpen && view==='projects' && selectedProject)(phoneFlow?phonePanels[phoneProjectIndex].querySelector('a'):document.querySelector(`.project-list [data-project="${selectedProject.id}"]`)).focus({preventScroll:true});
    else if(focus) document.getElementById('main-content').focus({preventScroll:true});
  }
  updatePhoneProjectDots();
  updatePlayback();
  drawConnector();
}
function navigate(href) {
  const url=new URL(href,location.href);
  if(url.pathname==='/'&&url.hash==='#projects'&&!dialog.open)phoneProjectIndex=0;
  if(url.pathname===location.pathname && url.hash===location.hash) {
    renderLocation({focus:true});return;
  }
  history.pushState(null,'',url.pathname+url.hash);
  renderLocation({focus:true});
}
document.addEventListener('click',event=> {
  if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
  const dot=event.target.closest('[data-phone-project-target]');
  if(dot&&document.documentElement.dataset.phoneLanding==='true'){
    showPhoneProject(projects.findIndex(project=>project.id===dot.dataset.phoneProjectTarget));
    return;
  }
  const link=event.target.closest('a[data-route],a[data-project]');
  if(!link)return;
  event.preventDefault();
  if((touch.matches||innerWidth<760) && event.detail!==0 && link.matches('.project-list [data-project]')) {
    selectProject(link.dataset.project);
    if(innerWidth<760)preview.scrollIntoView({block:'nearest',behavior:reducedMotion.matches?'instant':'smooth'});
    return;
  }
  navigate(link.href);
});
addEventListener('popstate',()=>renderLocation());
addEventListener('hashchange',()=>renderLocation());
phoneLanding.addEventListener('change',()=>renderLocation({focus:true}));
addEventListener('resize',()=>{drawConnector();updatePlayback();});
document.fonts.ready.then(drawConnector);

dialog.querySelector('.close-viewer').addEventListener('click',()=>navigate('/#projects'));
dialog.addEventListener('keydown',event=> {
  if(event.key!=='Tab')return;
  const focusable=[...dialog.querySelectorAll('a[href],button:not([disabled]),video[controls],iframe,[tabindex="0"]')].filter(element=>element.getClientRects().length && getComputedStyle(element).visibility!=='hidden');
  if(!focusable.length)return;
  const index=focusable.indexOf(document.activeElement);
  const next=(index+(event.shiftKey?-1:1)+focusable.length)%focusable.length;
  event.preventDefault();
  focusable[next].focus();
});
dialog.addEventListener('cancel',event=> {event.preventDefault();navigate('/#projects');});
dialog.addEventListener('close',()=> {
  if(expectedDialogCloses>0){expectedDialogCloses--;return;}
  if(routeState().project)navigate('/#projects');
});
dialog.addEventListener('click',event=> {
  if(event.target!==dialog)return;
  const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)navigate('/#projects');
});
dialog.querySelector('.expand-viewer').addEventListener('click',event=> {
  const expanded=dialog.classList.toggle('is-expanded');
  event.currentTarget.setAttribute('aria-pressed',String(expanded));
  event.currentTarget.setAttribute('aria-label',expanded?'Restore project viewer size':'Expand project viewer');
});
addEventListener('message',event=> {
  const frame=viewerContent.querySelector('.published-case');
  if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;
  if(event.data?.type==='case-close')navigate('/#projects');
  if(event.data?.type==='case-focus-toolbar')dialog.querySelector('.close-viewer').focus();
  if(event.data?.type==='case-focus-tabs')dialog.querySelector('.project-tabs a').focus();
});

renderLocation();
