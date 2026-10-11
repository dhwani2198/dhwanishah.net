# Dhwani Shah — revamped website

A standalone static portfolio built from the final published website. The content baseline is GitHub Pages publication `b2371357950dc8c4b26cf29f14ae2f46aad85765`. The original website folder is read-only.

Every page retains the original illustrated portrait favicon and Apple touch icon from that publication, using the exact original PNG bytes.

The homepage is one screen. Projects opens a list with static cover images and a case-study viewer. Clicking anywhere on a preview card opens its project. TopNotch appears first as Coming soon, with the original preview image and copy from https://dhwani.framer.ai/; both its card and viewer match Framer’s square cover crop and 65.4% / 65.7% focal position. Its viewer contains a short preview and a link to the source publication. About opens with one animation screen; its biography, artwork, credentials, and contact links appear after clicking About me. Blog and Resume use the published external destinations. The voice/chat guide is omitted.

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

GitHub Pages uses **GitHub Actions** as its publishing source. The workflow restores the two large homepage MP4s, checks every original asset and all six 4K videos, builds all seven pages, and publishes `dist/`. It can also be run manually from the repository's Actions tab. Only the built site is published; local exports, reference snapshots, and review output stay out of Git.

To put the old website back online without deleting the redesign, open **Settings → Pages**, choose **Deploy from a branch**, select **old-website-before-revamp** and **/ (root)**, and save. To publish the redesign again, select **GitHub Actions** and run **Deploy revamped website to GitHub Pages** on `main`. Your original Desktop clone is unchanged.

## Responsive layouts

Phone layouts stack project previews and About artwork without cropping the supplied illustrations. Projects select on tap/click in narrow layouts and on hover in wider layouts; keyboard navigation remains available. Short landscape screens keep previews in a scrollable two-column flow and give the case-study viewer more vertical room. Touch navigation and viewer controls have at least 44px hit areas.

`tests/responsive.spec.mjs` checks every local page and all five projects at phone, tablet, and laptop sizes from 320 × 568 to 1440 × 900, including portrait and landscape, in Chromium and WebKit. It checks reachable previews, case-study scrolling, image proportions, header bounds, 4K posters, and return navigation. Additional portrait and landscape checks exercise phone notch insets so navigation stays clear of the About animation and content.

## Media and content

All six responsive videos retain the supplied 4K dimensions, frame rates, and bytes. They are not downscaled or re-encoded. Only the active scene's video is loaded. Home, About, and Say hello animate automatically even with Reduce Motion enabled, matching the original website's core animation behavior. Videos are muted and play inline on phones. If a browser blocks autoplay or a video fails, a native-resolution poster remains visible with a Play animation or Retry animation button; playback retries directly inside the user's tap. Phone About layouts crop only empty vertical space so the illustration fills the available width. The `finalhomepage/` and `finalabout/` originals are unchanged and excluded from Git.

GitHub blocks individual Git files larger than 100 MiB. The homepage desktop and tablet videos are therefore stored as 48 MiB parts in `media-chunks/`. Local preview, verification, and build automatically reassemble them and verify their SHA-256 hashes against `public/media/manifest.json`. Visitors receive normal, byte-identical MP4s from GitHub Pages. A fresh clone needs only Node.js and `npm ci`; it does not need the local master folders. If you replace these originals and update their manifest, run `npm run pack:media` before committing to regenerate the parts.

`content/published.json` contains the published text and project structure. `content/asset-provenance.json` records the published Git blob hashes of every original image, video, and font used. Public project media retains its original resolution. Tally, Sprint X, and Architectural Design use their exact published homepage covers. CuraLink uses the supplied Frame 1410125354 PNG at its native 2048 × 1544 resolution. `content/preview-overrides.json` preserves this selection when re-importing or preparing previews. All preview assets retain their original bytes. About artwork stays inline on black and does not open at full size when clicked. Only the homepage and About animation screens share a spark overlay: mouse trails pause with the video and respect reduced motion; explicit phone taps anywhere on those screens produce a brief burst, including when the video is paused. Say hello resolves from animated ASCII text when at least 80% visible, then replays after a readable pause. The case-study viewer preserves the original published HTML/CSS layouts, including Tally’s embedded demo.

To restage the supplied original videos and native-resolution posters:

```sh
python3 scripts/prepare-media.py
```

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
