// Each project viewer owns its timer; leaving the project disposes it.
export function attachCarousel(carousel) {
  if(!carousel)return ()=>{};
  const track=carousel.querySelector('.teaser-carousel-track');
  const slides=[...carousel.querySelectorAll('.teaser-slide')];
  const dots=[...carousel.querySelectorAll('[data-carousel-slide]')];
  const toggle=carousel.querySelector('.teaser-carousel-toggle');
  let index=0,timer,paused=false,disposed=false;

  function schedule() {
    clearTimeout(timer);
    if(!disposed&&!paused&&!document.hidden)timer=setTimeout(()=>show((index+1)%slides.length),5000);
  }
  async function show(next) {
    // Keep the current image visible until the next original has decoded.
    try {await slides[next].querySelector('img').decode();}
    catch {schedule();return;}
    if(disposed)return;
    index=next;
    track.style.transform=`translateX(-${index*100}%)`;
    slides.forEach((slide,i)=>slide.setAttribute('aria-hidden',String(i!==index)));
    dots.forEach((dot,i)=>{
      if(i===index)dot.setAttribute('aria-current','true');
      else dot.removeAttribute('aria-current');
    });
    schedule();
  }
  function onClick(event) {
    const dot=event.target.closest('[data-carousel-slide]');
    if(dot){clearTimeout(timer);show(Number(dot.dataset.carouselSlide));}
    else if(event.target.closest('.teaser-carousel-toggle')) {
      paused=!paused;
      toggle.setAttribute('aria-label',`${paused?'Resume':'Pause'} image rotation`);
      toggle.firstElementChild.textContent=paused?'▶':'Ⅱ';
      schedule();
    }
  }
  carousel.addEventListener('click',onClick);
  document.addEventListener('visibilitychange',schedule);
  schedule();
  return ()=>{
    disposed=true;
    clearTimeout(timer);
    carousel.removeEventListener('click',onClick);
    document.removeEventListener('visibilitychange',schedule);
  };
}
