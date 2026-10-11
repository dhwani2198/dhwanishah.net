// A transparent overlay keeps the supplied video and the native pointer intact.
export function attachPointerSparks(canvas, scene, motion) {
  const ctx = canvas.getContext('2d');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let active = false, pointer = null, particles = [], frame = 0;
  let lastEmission = 0, lastMove = 0, bounds;

  function resize() {
    bounds = canvas.getBoundingClientRect();
    const scale = devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(bounds.width * scale));
    canvas.height = Math.max(1, Math.round(bounds.height * scale));
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  function clear() {
    cancelAnimationFrame(frame);
    frame = 0;
    particles = [];
    pointer = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  function allowed() {
    return active && !scene.hidden && !document.hidden && !motion.matches && finePointer.matches;
  }
  function emit(now) {
    if (particles.length >= 26) return;
    const angle = Math.random() * Math.PI * 2;
    const distance = 4 + Math.random() * 9;
    particles.push({
      x: pointer.x + Math.cos(angle) * distance,
      y: pointer.y + Math.sin(angle) * distance,
      vx: (Math.random() - .5) * 10,
      vy: -3 - Math.random() * 9,
      born: now, life: 550 + Math.random() * 300,
      size: 1.3 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      star: Math.random() > .35,
    });
    lastEmission = now;
  }
  function draw(now) {
    frame = 0;
    if (!allowed()) { clear(); return; }
    // A quiet twinkle remains near a stationary pointer; movement leaves a short trail.
    if (pointer && now - lastEmission > 240) emit(now);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => now - p.born < p.life);
    for (const p of particles) {
      const age = Math.max(0, now - p.born);
      const shimmer = .75 + .25 * Math.sin(age / 65 + p.phase) ** 2;
      const fade = Math.sin(Math.PI * age / p.life) * .98 * shimmer;
      const size = p.size * (1 + .2 * shimmer);
      const x = p.x + p.vx * age / 1000, y = p.y + p.vy * age / 1000;
      const radius = size * 3;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, `rgba(255,249,222,${fade * .2})`);
      glow.addColorStop(.3, `rgba(255,236,178,${fade * .055})`);
      glow.addColorStop(1, 'rgba(255,236,178,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      ctx.strokeStyle = `rgba(255,252,239,${fade})`;
      if (p.star) {
        ctx.lineWidth = .85;
        ctx.beginPath();
        ctx.moveTo(x - size, y); ctx.lineTo(x + size, y);
        ctx.moveTo(x, y - size * 1.25); ctx.lineTo(x, y + size * 1.25);
        ctx.stroke();
      }
      // A white center and warm halo give each spark a polished glint.
      ctx.fillStyle = `rgba(255,255,255,${fade})`;
      ctx.beginPath(); ctx.arc(x, y, p.star ? .8 : 1, 0, Math.PI * 2); ctx.fill();
    }
    if (pointer || particles.length) frame = requestAnimationFrame(draw);
  }
  scene.addEventListener('pointermove', event => {
    if (!allowed() || event.pointerType === 'touch') return;
    if (event.target.closest('a,button')) { pointer = null; return; }
    pointer = {clientX: event.clientX, clientY: event.clientY,
      x: event.clientX - bounds.left, y: event.clientY - bounds.top};
    const now = performance.now();
    if (now - lastMove > 35) { emit(now); lastMove = now; }
    if (!frame) frame = requestAnimationFrame(draw);
  });
  scene.addEventListener('pointerleave', () => { pointer = null; });
  for (const query of [motion, finePointer]) query.addEventListener('change', () => {
    if (!allowed()) clear();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  addEventListener('blur', clear);
  new ResizeObserver(() => {
    // Keep a hovering pointer when the scene becomes visible again, even if
    // its first pointer event arrives before the resize notification.
    const position = pointer;
    clear(); resize();
    if (position && allowed()) {
      pointer = {...position, x: position.clientX - bounds.left, y: position.clientY - bounds.top};
      frame = requestAnimationFrame(draw);
    }
  }).observe(canvas);
  resize();
  return {setActive(value) { active = value; if (!allowed()) clear(); }};
}
