import { renderArrow } from './render.mjs';

// A small runtime for the preserved publication, without the original site shell.
const send = (type,extra={}) => parent.postMessage({type,...extra},location.origin);
const visible = node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
document.addEventListener('keydown',event=> {
  if(event.key==='Escape'){event.preventDefault();send('case-close');}
  if(event.key!=='Tab')return;
  const items=[...document.querySelectorAll('a[href],button,video[controls],iframe,[tabindex="0"]')].filter(node=>node.getAttribute('tabindex')!=='-1'&&visible(node));
  const first=items[0], last=items.at(-1);
  if(event.shiftKey && (document.activeElement===first || document.activeElement===document.body)){
    event.preventDefault();send('case-focus-toolbar');
  }else if(!event.shiftKey && document.activeElement===last){
    event.preventDefault();send('case-focus-tabs');
  }
});
document.addEventListener('focusin',()=>send('case-focused'));

// Published slideshow frames keep their dimensions; use native swipe/scroll
// and the published arrow/dot controls in place of Framer hydration.
for(const section of document.querySelectorAll('section')) {
  if(!section.style.listStyleType || !section.querySelector('ul'))continue;
  const list=section.querySelector('ul');
  list.classList.add('native-carousel');
  list.style.transform='none';
  list.style.gap=section.querySelector('fieldset')?'0px':'24px';
  list.querySelectorAll('li[aria-hidden="true"]').forEach(node=>node.remove());
  const slides=[...list.children];
  slides.forEach(node=> {
    if(section.querySelector('fieldset')) {
      node.style.display='block';node.style.flex='0 0 100%';node.style.height='100%';
    }else node.style.flexShrink='0';
  });
  const controls=section.querySelector('fieldset');
  if(controls) {
    const arrows=controls.firstElementChild;
    Object.assign(arrows.style,{top:'12px',right:'12px',left:'auto',bottom:'auto',pointerEvents:'auto'});
    controls.querySelectorAll('button').forEach(button=> {
      const direction=button.getAttribute('aria-label');
      if(direction==='Next'||direction==='Previous') {
        button.innerHTML=renderArrow(direction==='Next'?'right':'left');
        Object.assign(button.firstElementChild.style,{width:'20px',height:'20px',fill:'none',stroke:'currentColor',strokeWidth:'1.5',strokeLinecap:'square',strokeLinejoin:'miter'});
      }
      button.addEventListener('click',()=> {
        const label=button.getAttribute('aria-label');
        let index=Math.round(list.scrollLeft/list.clientWidth);
        if(label==='Next')index++;else if(label==='Previous')index--;
        else index=Number(label.match(/\d+/)?.[0]||1)-1;
        list.scrollTo({left:Math.max(0,Math.min(slides.length-1,index))*list.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
      });
    });
  }
}

// Offer the published demo destination to keyboard users as well as the embed.
const demo=document.querySelector('iframe[title="Tally interactive bookkeeping demo"]');
if(demo)for(const text of document.querySelectorAll('p')) {
  if(text.textContent.trim()!=='Interact with prototype'||text.closest('a'))continue;
  const link=document.createElement('a');
  link.href=demo.src;link.target='_blank';link.rel='noopener';
  link.setAttribute('aria-label','Open Tally interactive demo in a new tab');
  text.replaceWith(link);link.append(text);
}
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const observer=new IntersectionObserver(entries=> {
  for(const entry of entries){
    if(entry.isIntersecting&&!motion.matches)entry.target.play().catch(()=>{});
    else entry.target.pause();
  }
},{threshold:.3});
document.querySelectorAll('video').forEach(video=>{video.muted=true;observer.observe(video);});
