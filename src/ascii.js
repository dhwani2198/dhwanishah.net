export function animateGreeting(element,motion) {
  const final=element.dataset.asciiText;
  let visible=false, timer, started=0;
  const chars='<>/\\[]{}*#@%+=:;01';
  function stop(){clearInterval(timer);element.textContent=final;}
  function start() {
    stop();
    if(!visible||motion.matches||document.hidden)return;
    started=performance.now();
    timer=setInterval(()=> {
      const elapsed=performance.now()-started;
      if(elapsed>1500){stop();return;}
      const progress=elapsed/1350;
      element.textContent=[...final].map((char,i)=>char===' '?' ':progress>(i+1)/final.length?char:chars[Math.floor(Math.random()*chars.length)]).join('');
    },85);
  }
  new IntersectionObserver(entries=> {
    const next=entries[0].isIntersecting;
    if(next&&!visible){visible=true;start();}
    else if(!next){visible=false;stop();}
  },{threshold:.8}).observe(element);
  element.closest('a').addEventListener('pointerenter',start);
  element.closest('a').addEventListener('focus',start);
  motion.addEventListener('change',start);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
}
