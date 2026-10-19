export const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function renderArrow(direction = 'up-right', className = '') {
  const paths = {
    'up-right': 'M5 19 19 5M7 5h12v12',
    'up-left': 'M19 19 5 5M5 17V5h12',
    left: 'M20 12H4M12 4l-8 8 8 8',
    down: 'M12 4v16m-8-8 8 8 8-8',
    right: 'M4 12h16m-8-8 8 8-8 8',
  };
  return `<svg class="arrow-icon ${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${paths[direction]}"/></svg>`;
}

export function renderMedia(item, title, index = 0) {
  if (item.type === 'video') return `<figure class="case-media"><video src="${escape(item.src)}" controls playsinline preload="none" aria-label="${escape(title)} product demonstration"></video></figure>`;
  return `<figure class="case-media"><img src="${escape(item.src)}" alt="${escape(title)} — ${escape(item.original?.split('/').pop()?.startsWith('about-portrait') ? 'portrait of Dhwani Shah' : 'published project imagery')}" loading="lazy" decoding="async"></figure>`;
}

export function renderArticle(project) {
  if (!project.caseStudy) return `<article class="case-article project-teaser" data-article="${escape(project.id)}"><div class="teaser-layout"><div class="teaser-intro">${projectStatus(project)}<h1 id="case-title">${escape(project.title)}</h1><p class="teaser-lead">${escape(project.lead)}</p><p class="teaser-description">${escape(project.detailDescription||project.description)}</p><div class="preview-tags">${project.tags.map(tag=>`<span>${escape(tag)}</span>`).join('')}</div></div><figure class="teaser-media"><img src="${escape(project.detailImage||project.preview)}" ${project.detailImageDimensions?`width="${project.detailImageDimensions[0]}" height="${project.detailImageDimensions[1]}"`:''} alt="${escape(project.title)} — app preview" decoding="async"></figure></div><div class="teaser-footer"><p>Version 1.0 is now live on the App Store for Apple Silicon Macs</p>${project.appStoreUrl?`<a class="store-link" href="${escape(project.appStoreUrl)}" target="_blank" rel="noopener">Download on the App Store ${renderArrow()}</a>`:'<span class="store-status">App Store — coming soon</span>'}</div></article>`;
  return `<article class="case-article" data-article="${project.id}"><h1 id="case-title" class="sr-only">${escape(project.title)}</h1><iframe class="published-case" title="${escape(project.title)} published case study" src="${escape(project.caseStudy)}"></iframe></article>`;
}

export function projectStatusLabel(project) {
  return {live:'Live','coming-soon':'Coming soon'}[project.status] || '';
}

function projectStatus(project, className = '') {
  const label = projectStatusLabel(project);
  return label ? `<span class="project-status ${className}" data-status="${escape(project.status)}">${escape(label)}</span>` : '';
}

export function renderAbout(about) {
  return `<div class="about-content"><div class="about-story">${about.sections.map((section,i) => `<section class="about-chapter"><h2 class="section-label"><span class="chapter-index">0${i+1}</span>${escape(section.title)}</h2><div>${i === 1 ? `<figure class="portrait"><img src="${escape(about.portrait)}" alt="Portrait of Dhwani Shah" loading="lazy"></figure>` : ''}${section.paragraphs.map(text=>`<p>${escape(text)}</p>`).join('')}</div></section>`).join('')}</div><section class="everyday"><div class="section-heading"><h2 class="section-label">EVERYDAY</h2><a href="${about.links.instagram}" target="_blank" rel="noopener">View more ${renderArrow()}</a></div><div class="art-grid">${about.artwork.map((src,i)=>`<figure><img src="${escape(src)}" alt="Dhwani Shah's published artwork ${i+1}" loading="lazy"></figure>`).join('')}</div></section><section class="credentials">${[['Awards',about.awards],['Work featured in',about.featured],['Certifications',about.certifications]].map(([title,items])=>`<div><h2 class="section-label">${escape(title)}</h2><ul>${items.map(item=>`<li>${escape(item)}</li>`).join('')}</ul></div>`).join('')}</section><section class="connect"><p class="eyebrow">LET’S CONNECT</p><a class="connect-email" aria-label="Say hello by email" href="${about.links.email}"><span class="hello-text" data-ascii-text="Say hello" aria-hidden="true">Say hello</span>${renderArrow('up-right', 'hello-arrow')}</a><div class="contact-links"><a href="${about.links.email}">Email ${renderArrow()}</a><a href="${about.links.linkedin}" target="_blank" rel="noopener">LinkedIn ${renderArrow()}</a><a href="${about.links.instagram}" target="_blank" rel="noopener">Instagram ${renderArrow()}</a></div></section></div>`;
}

// Reserve the published cover dimensions before lazy images load, so later
// cards never move during a swipe. Custom cover dimensions live with the data.
const publishedPreviewSizes={tally:[4032,3024],'sprint-x':[7395,5550],'architectural-design':[2698,1888]};
function renderPhoneProjects(projects, initiallyVisible) {
  return `<div class="phone-projects" aria-label="Scroll through projects">${projects.map((p,i)=>{
    const [width,height]=p.previewDimensions||publishedPreviewSizes[p.id];
    return `<section class="phone-project-panel" data-phone-project="${p.id}" aria-label="${escape(p.title)}, project ${i+1} of ${projects.length}"><a class="phone-project-card" href="/${p.id}" data-project="${p.id}" aria-label="${p.caseStudy?'Open':'Preview'} ${escape(p.title)} project"><div class="phone-card-media"><img src="${escape(p.preview)}" width="${width}" height="${height}" alt="${escape(p.title)} — published project preview" loading="${i===0&&initiallyVisible?'eager':'lazy'}" decoding="async"></div><div class="phone-card-copy"><div class="phone-card-title"><h2>${escape(p.title)}</h2>${projectStatus(p,'preview-status')}</div><p>${escape(p.description)}</p><div class="preview-tags">${p.tags.map(tag=>`<span>${escape(tag)}</span>`).join('')}</div><span class="phone-card-open">${p.caseStudy?'Open project':'View preview'} ${renderArrow()}</span></div></a></section>`;
  }).join('')}</div>`;
}
function renderProjectDots(projects) {
  return `<nav class="phone-project-dots" aria-label="Project position">${projects.map((p,i)=>`<button type="button" data-phone-project-target="${p.id}" aria-label="Show ${escape(p.title)}, project ${i+1} of ${projects.length}" ${i===0?'aria-current="true"':''}><span aria-hidden="true"></span></button>`).join('')}</nav>`;
}

export const assetVersion='20261019-topnotch-platforms-34';
function renderAnimation(name,initiallyActive) {
  const variants=[['phone','(max-width:759px) and (orientation:portrait)'],['tablet','(max-aspect-ratio:3/2)'],['desktop','']];
  const file=variant=>`${name}-${variant}-playback`;
  const sources=initiallyActive?variants.map(([variant,media])=>`<source src="/media/${file(variant)}.mp4" type="video/mp4" ${media?`media="${media}"`:''}>`).join(''):'';
  const description=name==='home'?'An animated ASCII valley under a starry sky':'An ASCII landscape tracing Dhwani Shah’s journey';
  return `<div class="animation-frame" data-animation="${name}"><video class="scene-video" autoplay muted loop playsinline webkit-playsinline preload="${initiallyActive?'auto':'none'}" aria-label="${description}">${sources}</video><picture>${variants.filter(([,media])=>media).map(([variant,media])=>`<source srcset="/media/${file(variant)}.webp" media="${media}">`).join('')}<img class="scene-poster" src="/media/${file('desktop')}.webp" alt="" aria-hidden="true" loading="${initiallyActive?'eager':'lazy'}" fetchpriority="low"></picture><button class="animation-toggle" type="button" aria-label="Pause animation" hidden>Ⅱ</button></div>${initiallyActive?`<script>{const frame=document.currentScript.previousElementSibling;const video=frame.querySelector('video');video.muted=true;video.defaultMuted=true;video.playsInline=true;video.addEventListener('playing',()=>{if(!video.paused)frame.classList.add('is-playing');});video.addEventListener('error',()=>frame.classList.remove('is-playing'));video.play().catch(()=>{});}</script>`:''}`;
}

export function renderPage(data, route = '/') {
  const project = data.projects.find(p=>route.replaceAll('/','')===p.id);
  const isAbout = route.replaceAll('/','')==='about';
  const title = project ? `${project.title} — Dhwani Shah` : isAbout ? 'About — Dhwani Shah' : 'Dhwani Shah';
  const description = project?.description ?? 'Dhwani Shah — product design, AI workflows, and architectural design.';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#08080c"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="https://dhwanishah.net${route}"><link rel="icon" href="${escape(data.favicon)}" type="image/png"><link rel="apple-touch-icon" href="${escape(data.favicon)}"><link rel="stylesheet" href="/src/styles.css?v=${assetVersion}"><link rel="preload" href="${data.font}" as="font" type="font/woff2" crossorigin></head>
<body data-view="${isAbout?'about':project?'projects':'home'}">
<a class="skip-link" href="#main-content">Skip to content</a>
<header class="site-header"><a class="home-link" href="/" data-route aria-label="Return to the homepage" ${!isAbout&&!project?'hidden':''}>${renderArrow('up-left')} Home</a><nav class="site-nav" aria-label="Main navigation"><a href="/#projects" data-route data-nav="projects">Projects</a><a href="${data.about.links.blog}" target="_blank" rel="noopener">Blog ${renderArrow('up-right', 'external-mark')}</a><a href="/about" data-route data-nav="about">About</a><a href="${data.about.links.resume}" target="_blank" rel="noopener">Resume ${renderArrow('up-right', 'external-mark')}</a></nav></header>
<main id="main-content" tabindex="-1">
<section id="home-scene" class="scene home-scene" aria-label="Dhwani Shah’s animated landing page" ${isAbout||project?'hidden':''}>${renderAnimation('home',!isAbout&&!project)}<canvas class="pointer-sparks home-sparks" aria-hidden="true"></canvas><a class="project-trigger" href="/#projects" data-route>${renderArrow('down', 'trigger-arrow')}<span>View projects</span></a></section>
<section id="projects-scene" class="scene projects-scene" aria-labelledby="projects-heading" ${isAbout||!project?'hidden':''}><div class="projects-intro"><h1 class="eyebrow" id="projects-heading">SELECTED PROJECTS</h1><span class="project-count">01 — ${String(data.projects.length).padStart(2,'0')}</span></div><div class="project-stage"><ol class="project-list">${data.projects.map((p,i)=>`<li><a class="project-link" href="/${p.id}" data-project="${p.id}"><span class="project-number">0${i+1}</span><span class="project-name">${escape(p.title)}</span>${projectStatus(p)}${renderArrow('up-right', 'project-arrow')}</a></li>`).join('')}</ol><svg class="preview-connector" aria-hidden="true"><path/><circle r="2.5"/></svg><a class="preview-panel" href="/#projects" data-route aria-label="Open project" hidden><div class="preview-image"><img class="preview-original" alt="" decoding="async"></div><div class="preview-details"><div class="preview-heading"><h2></h2><span class="project-status preview-status" hidden></span></div><p class="preview-description"></p><div class="preview-tags"></div><span class="preview-open" aria-hidden="true"><span class="preview-open-label">Open project</span>${renderArrow()}</span></div></a></div>${renderPhoneProjects(data.projects,Boolean(project))}</section>
<section id="about-scene" class="about-scene" aria-label="About Dhwani Shah" ${isAbout?'':'hidden'}><div class="about-hero">${renderAnimation('about',isAbout)}<canvas class="pointer-sparks about-sparks" aria-hidden="true"></canvas><a class="about-read" href="/about#about-story" data-route>About me ${renderArrow('down')}</a></div><div id="about-story" hidden><a class="about-back" href="/about" data-route>${renderArrow('left')} Back</a>${renderAbout(data.about)}</div></section>
</main>
${renderProjectDots(data.projects)}
<footer class="site-footer"><time id="local-time" aria-label="Dhwani Shah’s local time in San Francisco">My local time —</time><span>© 2025 Dhwani Shah</span></footer>
<dialog id="project-viewer" aria-labelledby="case-title"><div class="viewer-toolbar"><nav class="project-tabs" aria-label="Switch project">${data.projects.map(p=>`<a href="/${p.id}" data-project="${p.id}">${escape(p.title)}${projectStatus(p,'tab-status')}</a>`).join('')}</nav><div class="viewer-controls"><button type="button" class="expand-viewer" aria-label="Expand project viewer" aria-pressed="false"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4"/></svg></button><button type="button" class="close-viewer" aria-label="Close project viewer"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg></button></div></div><div class="viewer-content" tabindex="0">${project?renderArticle(project):''}</div></dialog>
<noscript><style>.project-trigger,.home-link{display:none}.scene.home-scene{display:none}#projects-scene{display:block!important}.project-list a{font-size:36px}</style><div class="noscript-note">Enable JavaScript to view the animation and project browser.</div>${project?`<div class="noscript-article">${renderArticle(project)}</div>`:''}</noscript>
<script type="module" src="/src/app.js?v=${assetVersion}"></script></body></html>`;
}
