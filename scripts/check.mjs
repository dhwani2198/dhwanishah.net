import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const siteRoot = fileURLToPath(new URL("../", import.meta.url))
const routes = ["/", "/about", "/tally", "/sprint-x", "/curalink", "/architectural-design"]
const manifest = JSON.parse(await readFile(`${siteRoot}/mirror-manifest.json`, "utf8"))

for (const route of routes) {
  const file = route === "/" ? `${siteRoot}/index.html` : `${siteRoot}${route}/index.html`
  const html = await readFile(file, "utf8")
  if (!html.includes("Dhwani Shah")) throw new Error(`${route}: missing page title/content`)
  if (html.includes("https://framerusercontent.com")) throw new Error(`${route}: contains a remote Framer asset`)
  if (html.includes("https://fonts.gstatic.com")) throw new Error(`${route}: contains a remote Google font`)
}

const aboutHtml = await readFile(`${siteRoot}/about/index.html`, "utf8")
if (!aboutHtml.includes('src="/assets/assets/paper-plane-low-poly-3d-v7-hq.mp4"')) {
  throw new Error("/about: initial HTML does not use the current paper-plane animation")
}
if (aboutHtml.includes('src="/assets/assets/1OjbNDuyowRWI9iGPvfQ40L1qJY.mp4"')) {
  throw new Error("/about: initial HTML still loads the legacy paper-plane animation")
}

const aboutBundle = await readFile(`${siteRoot}/assets/sites/1O6HJjFgTJMJ8aISDQc9XC/6vIF-Ykiodl71zXR0dqgTH0n5VpjaZV4CIbidXfcs_4.0vQvg7Qz.mjs`, "utf8")
if (!aboutBundle.includes("/assets/assets/paper-plane-low-poly-3d-v7-hq.mp4")) {
  throw new Error("/about: client-navigation bundle does not use the current paper-plane animation")
}
if (aboutBundle.includes("/assets/assets/1OjbNDuyowRWI9iGPvfQ40L1qJY.mp4")) {
  throw new Error("/about: client-navigation bundle still loads the legacy paper-plane animation")
}

if (manifest.failures.length) throw new Error(`${manifest.failures.length} asset downloads failed`)
console.log(`Validated ${routes.length} routes and ${manifest.assetCount} localized assets.`)
