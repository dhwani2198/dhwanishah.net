// Runs before the portfolio content fetch, so the landing movie can start on
// the first visit. Native sources in the HTML also start loading immediately.
const touch = matchMedia('(hover: none)');
const dialog = document.getElementById('project-viewer');

export function animationVariant() {
  if (innerWidth < 760 && innerHeight > innerWidth) return 'phone';
  return innerWidth / innerHeight <= 1.5 ? 'tablet' : 'desktop';
}
function mediaName(name, variant) {
  return `${name}-${variant}`;
}
export function animationIsActive(animation) {
  const name = animation.frame.dataset.animation;
  return document.body.dataset.view === name && !(name === 'about' &&
    (document.body.dataset.aboutStory === 'true' || location.hash === '#about-story'));
}
function shouldPlay(animation) {
  return animationIsActive(animation) && !document.hidden && !dialog.open &&
    !animation.userPaused && !animation.failed;
}
function paintControl(animation) {
  const {video, button} = animation;
  const needsTap = animation.blocked || animation.failed || animation.userPaused;
  // Normal phone playback has no loading message or player controls.
  button.hidden = !animationIsActive(animation) || (!needsTap && (touch.matches || video.paused));
  button.classList.toggle('has-label', needsTap);
  button.textContent = needsTap ? (animation.failed ? 'Retry animation' : 'Play animation') : 'Ⅱ';
  button.setAttribute('aria-label', needsTap ? (animation.failed ? 'Retry animation' : 'Play animation') : 'Pause animation');
}
function notifyState(animation) {
  paintControl(animation);
  document.dispatchEvent(new Event('animationstatechange'));
}
function requestPlayback(animation) {
  if (!shouldPlay(animation) || animation.playRequest) return;
  const {video, frame} = animation;
  animation.playRequest = true;
  const generation = animation.generation;
  video.play().then(() => {
    if (generation !== animation.generation || !shouldPlay(animation)) return;
    animation.blocked = false;
    frame.classList.add('is-playing');
    notifyState(animation);
  }).catch(error => {
    if (generation !== animation.generation || !shouldPlay(animation)) return;
    if (error.name === 'NotAllowedError') animation.blocked = true;
    else if (error.name === 'NotSupportedError') animation.failed = true;
    // A load/visibility interruption is transient. Retry after the layout has
    // settled; readiness events below also retry without changing the source.
    else if (error.name === 'AbortError') {
      clearTimeout(animation.retry);
      animation.retry = setTimeout(() => requestPlayback(animation), 100);
    }
    notifyState(animation);
  }).finally(() => {
    if (generation === animation.generation) animation.playRequest = false;
  });
}

export const animations = [...document.querySelectorAll('[data-animation]')].map(frame => {
  const video = frame.querySelector('video');
  const animation = {frame, video, poster:frame.querySelector('.scene-poster'),
    button:frame.querySelector('.animation-toggle'), variant:null, generation:0,
    playRequest:false, userPaused:false, blocked:false, failed:false, reload:false, retry:null};
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.addEventListener('playing', () => {
    if (!shouldPlay(animation)) {video.pause();return;}
    animation.blocked = false;
    frame.classList.add('is-playing');
    notifyState(animation);
  });
  video.addEventListener('error', () => {
    animation.failed = true;
    frame.classList.remove('is-playing');
    notifyState(animation);
  });
  for (const name of ['loadedmetadata', 'loadeddata', 'canplay']) {
    video.addEventListener(name, () => {
      if (shouldPlay(animation)) requestPlayback(animation);
    });
  }
  video.addEventListener('pause', () => {
    notifyState(animation);
    if (shouldPlay(animation) && !animation.blocked) {
      clearTimeout(animation.retry);
      animation.retry = setTimeout(() => requestPlayback(animation), 100);
    }
  });
  animation.button.addEventListener('click', () => {
    if (!video.paused && !animation.blocked && !animation.failed) {
      animation.userPaused = true;
    } else {
      animation.userPaused = false;
      animation.blocked = false;
      if (animation.failed) {
        animation.failed = false;
        animation.variant = null;
        animation.reload = true;
      }
    }
    // A browser-required retry must call play directly inside the trusted tap.
    updateAnimationPlayback();
    notifyState(animation);
  });
  return animation;
});

export function updateAnimationPlayback() {
  for (const animation of animations) {
    const {video, frame, poster} = animation;
    if (animationIsActive(animation)) {
      const variant = animationVariant();
      const name = mediaName(frame.dataset.animation, variant);
      const source = `/media/${name}.mp4`;
      if (animation.variant !== variant) {
        const nativeSource = [...video.querySelectorAll('source')].find(element =>
          !element.media || matchMedia(element.media).matches);
        const alreadySelected = video.currentSrc || nativeSource?.src;
        const canKeepSource = alreadySelected === new URL(source, location.href).href &&
          !video.hasAttribute('src') && !animation.reload;
        animation.variant = variant;
        animation.failed = false;
        animation.blocked = false;
        animation.reload = false;
        poster.src = `/media/${name}.webp`;
        video.poster = poster.src;
        if (!canKeepSource) {
          animation.generation++;
          animation.playRequest = false;
          frame.classList.remove('is-playing');
          video.preload = 'auto';
          video.src = source;
          video.load();
        }
      }
    }
    if (shouldPlay(animation)) requestPlayback(animation);
    else {clearTimeout(animation.retry);video.pause();}
    paintControl(animation);
  }
}

// Any tap can resume a movie when the device requires an initial gesture.
document.addEventListener('touchend', event => {
  if(event.target.closest('.animation-toggle'))return;
  for (const animation of animations) {
    if (animation.blocked && shouldPlay(animation)) {
      animation.blocked = false;
      requestPlayback(animation);
    }
  }
}, {passive:true});
document.addEventListener('visibilitychange', updateAnimationPlayback);
for (const name of ['pageshow', 'load', 'resize']) addEventListener(name, updateAnimationPlayback);
touch.addEventListener('change', () => animations.forEach(paintControl));
updateAnimationPlayback();
requestAnimationFrame(updateAnimationPlayback);
