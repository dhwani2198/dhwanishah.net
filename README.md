# Dhwani Shah — revamped website

A standalone static portfolio built from the final published website. The content baseline is GitHub Pages publication `b2371357950dc8c4b26cf29f14ae2f46aad85765`. The original website folder is read-only.

Every page retains the original illustrated portrait favicon and Apple touch icon from that publication, using the exact original PNG bytes.

The homepage is a separate animation screen on phones and laptops. View projects or the Projects navigation opens the project browser; swiping the homepage never opens Projects. Phones show one card at a time using the desktop hover preview’s image, title, description, tags, divider, and link styling. Each vertical swipe moves one project forward or backward. Reverse swipes also work from the final project footer and do not require scrolling through empty top padding. A deliberate wheel direction change reverses paging immediately, while momentum in the same direction remains limited to one card. A tall card can scroll fully before another swipe changes projects. Wheel momentum is grouped into one project change. Five compact dots on the right identify and select the current project. Closing a case study restores its card. The original phone animation fills a stable 100lvh frame; its View projects pill stays 16px above the visible bottom browser controls. The animation screens have no clock or copyright. Phones show a footer after the last project, and About shows its footer only after the biography’s contact links. Desktop Projects retains its hover list and case-study viewer. Clicking anywhere on either preview layout opens its project. TopNotch appears first with a Live badge and green dot, with the original preview image and copy from https://dhwani.framer.ai/; all project preview cards share a 4:3 image frame and equal copy rows. TopNotch keeps its original close-up and 65.4% / 65.7% focal position; its detailed view uses the supplied final linkedin.png at its original 2880 × 1800 resolution and full aspect ratio, with the introduction aligned near the top. Its detailed preview announces “Version 1.0 is now live on the App Store for Apple Silicon Macs”. The “Download on the App Store” button opens TopNotch’s live Apple listing in a new tab; the Framer reference is never an outbound project link. About me opens the biography from the About animation. Blog and Resume use the published external destinations.


## Local preview

```sh
npm install
npm start
```

Open http://localhost:4187. To use another port, run `npm start -- --port=4200`.

## Check and build

```sh
npm run check
npm run test:e2e
npm run build
```

The build is in `dist/`, including static entries for every existing case-study URL and `/about`. No backend, credentials, or external fonts are required. Pushes to `main` automatically verify, build, and publish this folder to GitHub Pages using `.github/workflows/deploy.yml`. The custom domain remains **https://dhwanishah.net/**.

## Deployment and the old website

The October 11, 2026 redesign is identified by the commit **Revamp website: launch redesigned Dhwani Shah portfolio**. The previous website and its complete history are preserved on [`old-website-before-revamp`](https://github.com/dhwani2198/dhwanishah.net/tree/old-website-before-revamp), pointing to `b2371357950dc8c4b26cf29f14ae2f46aad85765`.

GitHub Pages uses **GitHub Actions** as its publishing source. The workflow restores the two large homepage MP4s and checks every original asset and all six supplied 4K videos, builds all seven pages, and publishes `dist/`. It can also be run manually from the repository's Actions tab. Only the built site is published; local exports, reference snapshots, and review output stay out of Git.

To put the old website back online without deleting the redesign, open **Settings → Pages**, choose **Deploy from a branch**, select **old-website-before-revamp** and **/ (root)**, and save. To publish the redesign again, select **GitHub Actions** and run **Deploy revamped website to GitHub Pages** on `main`. Your original Desktop clone is unchanged.

## Responsive layouts

Phone layouts show project previews one at a time and stack About artwork without cropping the supplied illustrations. Projects select on tap/click in narrow layouts and on hover in wider layouts; keyboard navigation remains available. Short landscape screens keep previews in a scrollable two-column flow and give the case-study viewer more vertical room. Main touch navigation and viewer controls have at least 44px hit areas.

`tests/responsive.spec.mjs` checks every local page and all five projects at phone, tablet, and laptop sizes from 320 × 568 to 1440 × 900, including portrait and landscape, in Chromium and WebKit. It checks reachable previews, case-study scrolling, image proportions, header bounds, 4K posters, and return navigation. Additional portrait and landscape checks exercise phone notch insets so navigation stays clear of the About animation and content.

## Media and content

The phone homepage uses the supplied 2160 × 3840, 30 fps portrait animation. Its untouched master, home-phone.mp4, is copied byte-for-byte from finalhomepage/valley-living-ascii-36s-4k-phone.mp4; the browser receives home-phone-playback.mp4, a smaller H.264 delivery encode with the same canvas, 1,080 frames, and 36-second timeline. The homepage fits each original video to the viewport width and height, so the entire original canvas fills the screen. On phones, the video, poster, and section use CSS large viewport height (100lvh, with 100vh as a fallback). Floating browser controls do not shorten or stretch the animation during scrolling. visualViewport resize/scroll events and page restoration adjust the playback retry control and keep the View projects pill 16px above the visible bottom browser controls. The homepage stays in native document flow at 100lvh, allowing its actual video to paint beneath Safari and Chrome controls. Scrolling stays within that animation; only a navigation button opens Projects. The View projects pill follows the visible bottom edge as the browser controls and document scroll change. Only the selected phone project card is displayed, so a long swipe cannot pass through several projects or reveal the homepage. Native scrolling is available for content taller than the phone screen. Browser controls can expand or collapse without reloading or re-encoding the movie. Deliberate pinch zoom remains available. Selected project tabs have a white fill from their first opening, with no external focus outline. The About biography footer is in normal document flow after the contact links, so its clock and copyright appear at the bottom without overlapping the text. The supplied movie files are unchanged. The display proportions follow the viewport. About uses the main illustration bounds in each original export to center the artwork on desktop, tablet, and phone. Video and poster share the same placement, which updates when the viewport changes. The phone illustration retains its full available width.

All six master videos retain the supplied 4K dimensions, frame rates, and bytes. Home and About play separate *-playback.mp4 delivery copies encoded with libx264 slow / CRF 24 and metadata at the beginning. These are lossy compression exports at the exact original 4K dimensions, retaining Home’s 30 fps / 1,080 frames / 36-second timeline and About’s 60 fps / 827 frames / 13.783333-second timeline, with no cropping, scaling, artwork, timing, or layout changes. Smaller 4K WebP poster copies also reduce startup contention. public/media/playback-manifest.json records the source hashes, delivery hashes, frame counts, dimensions, and encoding settings; verification checks these alongside all untouched originals. The initial animation has responsive native video sources in the HTML. A small inline bootstrap requests muted inline playback as soon as the video is parsed, independently of the app module graph or portfolio content. Its playing event reveals the video immediately, with no poster fade. Posters have low fetch priority and hidden project covers load lazily so they do not compete with the first video frames. Readiness, first-load interruptions, and page restoration are handled by src/animations.js. Original video transfer and device buffering still depend on the connection and browser; no artificial startup delay is added. Home, About, and Say hello animate automatically even with Reduce Motion enabled, matching the original website's core animation behavior. Videos are muted and play inline on phones. Normal phone playback shows no Loading label or Pause overlay. If a browser blocks autoplay or a video fails, a native-resolution poster remains visible with a Play animation or Retry animation button; playback retries directly inside the user's tap. Tapping elsewhere on an animation screen can also resume a browser-blocked movie. Phone About layouts crop only empty vertical space so the illustration fills the available width. The `finalhomepage/` and `finalabout/` originals are unchanged and excluded from Git.

GitHub blocks individual Git files larger than 100 MiB. The homepage desktop and tablet videos are therefore stored as 48 MiB parts in `media-chunks/`. Local preview, verification, and build automatically reassemble them and verify their SHA-256 hashes against `public/media/manifest.json`. The exact originals stay archived and verified in the repository. The build excludes the large master bytes to stay within GitHub Pages’ size limit; visitors receive the smaller 4K playback copies. The previous MP4 URLs also serve those delivery copies so cached pages and already-open tabs keep working. A fresh clone needs only Node.js and `npm ci`; it does not need the local master folders. If you replace an export and update its manifest, run `npm run pack:media` before committing to regenerate the parts.

`content/published.json` contains the published text and project structure. `content/asset-provenance.json` records the published Git blob hashes of every original image, video, and font used. Public project media retains its original resolution. Tally, Sprint X, and Architectural Design use their exact published homepage covers. CuraLink uses the supplied Frame 1410125354 PNG at its native 2048 × 1544 resolution. `content/preview-overrides.json` preserves this selection when re-importing or preparing previews. All preview assets retain their original bytes. About artwork stays inline on black and does not open at full size when clicked. Only the homepage and About animation screens share a spark overlay: mouse trails pause with the video and respect reduced motion; explicit phone taps anywhere on those screens produce a brief burst, including when the video is paused. Say hello resolves from animated ASCII text when at least 80% visible, then replays after a readable pause. The case-study viewer preserves the original published HTML/CSS layouts, including Tally’s embedded demo.

To restage the supplied original videos and native-resolution posters:

```sh
python3 scripts/prepare-media.py
```

To regenerate delivery files after deliberately replacing a master, delete the corresponding `public/media/*-playback.mp4` files and run:

```sh
python3 scripts/prepare-playback.py
```

This asset preparation requires ffmpeg, ffprobe, and Pillow; normal builds use the committed delivery files and do not re-encode media.

Content import, case-study preparation, and preview restoration require Python with Pillow. They read the source publication snapshots in `.reference/` and the reference website folder. They never modify the reference folder.

To restore the case-study layout snapshots after importing content:

```sh
python3 scripts/prepare-case-studies.py
```

To restore published static project previews while retaining the supplied CuraLink replacement:

```sh
python3 scripts/prepare-previews.py
```

To refresh TopNotch’s original preview image and its separate additional-project record:

```sh
node scripts/prepare-topnotch.mjs
```
