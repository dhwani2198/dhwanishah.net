import { expect, test } from "@playwright/test"

const routes = ["/", "/about", "/tally", "/sprint-x", "/curalink", "/architectural-design"]
const resumeUrl = "https://drive.google.com/file/d/1qJUonR6c54pHj2duCbeAAI5cCLDiY3mS/view?usp=sharing"

for (const route of routes) {
  test(`${route} renders without missing local resources`, async ({ page }) => {
    const failed = []
    const runtimeErrors = []
    page.on("pageerror", error => runtimeErrors.push(error.message))
    page.on("console", message => {
      if (message.type() === "error") runtimeErrors.push(message.text())
    })
    page.on("response", response => {
      const url = new URL(response.url())
      if (url.hostname === "127.0.0.1" && response.status() >= 400) {
        failed.push(`${response.status()} ${url.pathname}`)
      }
    })

    await page.goto(route, { waitUntil: "domcontentloaded" })
    await expect(page).toHaveTitle("Dhwani Shah")
    await expect(page.locator("body")).toBeVisible()
    if (route === "/architectural-design") {
      await expect(page.locator("img").first()).toBeVisible()
    } else {
      expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(10)
    }
    await page.waitForTimeout(1_000)
    expect(failed).toEqual([])
    expect(runtimeErrors).toEqual([])
  })
}

test("desktop navigation reaches About", async ({ page }) => {
  const paperPlaneRequests = []
  page.on("request", request => {
    const pathname = new URL(request.url()).pathname
    if (pathname.endsWith(".mp4")) paperPlaneRequests.push(pathname)
  })
  await page.goto("/")
  await page.evaluate(() => { window.__homeNavigationMarker = true })
  await page.getByRole("link", { name: "About", exact: true }).first().click()
  await expect(page).toHaveURL(/\/about$/)
  expect(await page.evaluate(() => window.__homeNavigationMarker)).toBe(true)
  await expect(page.getByText("YESTERDAY", { exact: true }).first()).toBeVisible()
  await expect(page.locator(".about-connect")).toHaveCount(1)
  await expect(page.locator(".project-progress")).toHaveCount(0)
  await expect(page.locator(".about-connect-flap")).toHaveCount(13)
  await expect(page.getByRole("link", { name: "Email", exact: true })).toHaveAttribute("href", "mailto:dhwani0321@gmail.com")
  await expect(page.locator(".about-connect-meta time")).toContainText("My local time —")
  await expect(page.locator(".about-connect-meta span")).toHaveText("© 2025 Dhwani Shah")
  expect(paperPlaneRequests).toContain("/assets/assets/paper-plane-low-poly-3d-v7-hq.mp4")
  expect(paperPlaneRequests).not.toContain("/assets/assets/paper-plane-low-poly-3d-v6.mp4")
  expect(paperPlaneRequests).not.toContain("/assets/assets/paper-plane-low-poly-3d-v5.mp4")
  expect(paperPlaneRequests).not.toContain("/assets/assets/paper-plane-low-poly-3d-v4.mp4")
  expect(paperPlaneRequests).not.toContain("/assets/assets/paper-plane-low-poly-3d-v3.mp4")
  expect(paperPlaneRequests).not.toContain("/assets/assets/1OjbNDuyowRWI9iGPvfQ40L1qJY.mp4")
})

test("About header text matches Home placement at every breakpoint", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport)
    const placements = []
    for (const route of ["/", "/about"]) {
      await page.goto(route)
      await page.waitForTimeout(800)
      placements.push(await page.locator(".site-nav-shell a:visible").evaluateAll(links =>
        links.map(link => {
          const box = link.getBoundingClientRect()
          return { text: link.textContent.trim(), x: box.x, y: box.y }
        })
      ))
    }
    expect(placements[1].map(item => item.text)).toEqual(placements[0].map(item => item.text))
    placements[0].forEach((homeItem, index) => {
      const aboutItem = placements[1][index]
      expect(Math.abs(aboutItem.x - homeItem.x)).toBeLessThan(0.1)
      expect(Math.abs(aboutItem.y - homeItem.y)).toBeLessThan(0.1)
    })
  }
})

test("client navigation back to Home fully restores homepage enhancements", async ({ page }) => {
  await page.goto("/about")
  await page.evaluate(() => { window.__aboutNavigationMarker = true })
  await page.getByRole("link", { name: "Dhwani Shah", exact: true }).first().click()
  await expect(page).toHaveURL(/\/$/)
  expect(await page.evaluate(() => window.__aboutNavigationMarker)).toBe(true)
  await expect(page.locator(".project-scroll-panel")).toHaveCount(4)
  await expect(page.locator(".project-progress")).toHaveCount(1)
  await expect(page.locator(".portfolio-meta-footer")).toHaveCount(1)
  await expect(page.locator(".project-scroll-panel").first()).toHaveCSS("scroll-snap-align", "start")
})

test("homepage presents projects as full-screen scroll panels", async ({ page }) => {
  await page.goto("/")
  const panels = page.locator(".project-scroll-panel")

  await expect(panels).toHaveCount(4)
  await expect(page.getByRole("link", { name: "Projects", exact: true }).first()).toHaveAttribute("href", "/#projects")
  await expect(page.getByText("Case Studies", { exact: true })).toHaveCount(0)
  await expect(page.locator(".project-section-label")).toBeHidden()

  const viewportHeight = page.viewportSize().height
  for (const panel of await panels.all()) {
    await expect(panel).toHaveCSS("scroll-snap-align", "start")
    expect(Math.round((await panel.boundingBox()).height)).toBe(viewportHeight)
  }
})

test("Projects navigation reaches the first project section", async ({ page }) => {
  await page.goto("/")
  const projectsLink = page.getByRole("link", { name: "Projects", exact: true }).first()
  const firstProject = page.locator("#projects")

  await projectsLink.click()
  await expect(page).toHaveURL(/\/#projects$/)
  await expect.poll(() => firstProject.evaluate(element => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(2)

  await page.goto("/about")
  await page.getByRole("link", { name: "Projects", exact: true }).first().click()
  await expect(page).toHaveURL(/\/#projects$/)
  await expect.poll(() => page.locator("#projects").evaluate(element => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(2)
})

test("homepage split-flap animation stays optically centered at every breakpoint", async ({ page }) => {
  await page.addInitScript(() => {
    window.__landingFlapSoundEvents = []
    HTMLMediaElement.prototype.play = function () {
      if (this.dataset.soundTrigger === "landing-flap") {
        window.__landingFlapSoundEvents.push({
          source: this.currentSrc || this.src,
          volume: this.volume,
          playbackRate: this.playbackRate,
        })
      }
      return Promise.resolve()
    }
  })
  let desktopSound
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto("/")
    const box = await page.locator(".framer-1cf70bh").evaluate(section => {
      const flap = [...section.querySelectorAll(".framer-14c1xbw-container, .framer-rmunsi-container")]
        .find(element => getComputedStyle(element).display !== "none")
      const bounds = flap.getBoundingClientRect()
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
    })
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(1)
    const expectedVerticalCenter = viewport.width < 810 ? viewport.height * .47 : viewport.height / 2
    expect(Math.abs(box.y + box.height / 2 - expectedVerticalCenter)).toBeLessThan(1)
    await expect(page.locator('[data-flap-sound-source="chloeyan-ferry"]')).toHaveCount(1)
    await expect.poll(() => page.evaluate(() => window.__landingFlapSoundEvents.length)).toBeGreaterThan(0)
    const sound = await page.evaluate(() => window.__landingFlapSoundEvents[0])
    expect(sound.source).toContain("/sounds/sound1.mp3")
    expect(sound.volume).toBe(viewport.width < 810 ? .10 : .12)
    expect(sound.playbackRate).toBe(1)
    desktopSound ||= sound
    expect(sound.source).toBe(desktopSound.source)
    expect(sound.playbackRate).toBe(desktopSound.playbackRate)
  }
})

test("first project uses native snap motion with minimal dot navigation", async ({ page }) => {
  await page.goto("/")
  const firstPanel = page.locator(".project-scroll-panel").first()
  const progress = page.locator(".project-progress")

  await expect(progress.locator("a")).toHaveCount(4)
  await expect(progress).not.toHaveClass(/is-visible/)
  await expect(firstPanel).toHaveCSS("opacity", "1")
  await expect(firstPanel).toHaveCSS("transform", "none")
  await expect(firstPanel).toHaveCSS("transition-duration", "0s")

  await firstPanel.scrollIntoViewIfNeeded()
  await expect(firstPanel).toHaveClass(/is-active/)
  await expect(firstPanel).toHaveCSS("opacity", "1")
  await expect(firstPanel).toHaveCSS("transform", "none")
  await expect(progress).toHaveClass(/is-visible/)
  await expect(progress.locator("a").first()).toHaveClass(/is-active/)
  await expect(progress.locator("a").first()).toHaveCSS("width", "6px")
  await expect(progress.locator("a").first()).toHaveCSS("background-color", "rgb(138, 138, 138)")
  const tallyAlignment = await firstPanel.evaluate(element => {
    const title = [...element.querySelectorAll('[data-framer-component-type="RichTextContainer"]')]
      .find(item => item.textContent.trim() === "TALLY" && getComputedStyle(item).display !== "none")
      ?.getBoundingClientRect()
    const pills = [...element.querySelectorAll("div")]
      .filter(item => getComputedStyle(item).backgroundColor === "rgb(31, 31, 31)" && item.getBoundingClientRect().width > 20)
      .map(item => item.getBoundingClientRect())
    return { titleX: title?.x, pillX: Math.min(...pills.map(pill => pill.x)) }
  })
  expect(Math.abs(tallyAlignment.pillX - tallyAlignment.titleX)).toBeLessThanOrEqual(1)

  for (let index = 1; index < 4; index += 1) {
    const panel = page.locator(".project-scroll-panel").nth(index)
    await panel.scrollIntoViewIfNeeded()
    await expect(panel).toHaveClass(/is-active/)
    await expect(panel).toHaveCSS("opacity", "1")
    await expect(progress.locator("a").nth(index)).toHaveClass(/is-active/)
  }
})

test("homepage uses transparent navigation and a live metadata footer", async ({ page }) => {
  await page.goto("/")

  const navigation = page.locator('.framer-14n88so-container [data-framer-name="Desktop"]')
  await expect(navigation).toHaveCSS("background-color", "rgba(0, 0, 0, 0)")
  await expect(page.locator(".portfolio-meta-footer time")).toContainText("My local time")
  await expect(page.locator(".portfolio-meta-footer span")).toHaveText("© 2025 Dhwani Shah")
  await expect(page.locator(".portfolio-meta-footer")).toBeInViewport()
  await expect(page.locator(".portfolio-meta-footer")).toHaveCSS("position", "fixed")
  await expect(page.locator(".portfolio-meta-footer")).toHaveCSS("animation-duration", "0.3s")
  await expect(page.locator(".portfolio-meta-footer")).toHaveCSS("animation-delay", "0.05s")
  await expect(page.locator(".framer-1y7cnzc")).toBeHidden()
  await expect(page.locator('.framer-Rkf84 > [data-framer-name="Footer"]')).toBeHidden()

  const before = await page.locator(".portfolio-meta-footer").boundingBox()
  await page.locator(".project-scroll-panel").nth(2).scrollIntoViewIfNeeded()
  const after = await page.locator(".portfolio-meta-footer").boundingBox()
  expect(Math.abs(before.y - after.y)).toBeLessThan(1)
})

test("homepage corner text shares exact left and right guides", async ({ page }) => {
  await page.goto("/")
  await page.waitForTimeout(400)
  const name = await page.getByRole("link", { name: "Dhwani Shah", exact: true }).first().boundingBox()
  const time = await page.locator(".portfolio-meta-footer time").boundingBox()
  const resume = await page.getByRole("link", { name: "Resume", exact: true }).first().boundingBox()
  const copyright = await page.locator(".portfolio-meta-footer span").boundingBox()
  const viewportHeight = page.viewportSize().height

  expect(Math.abs(name.x - time.x)).toBeLessThan(1)
  expect(Math.abs((resume.x + resume.width) - (copyright.x + copyright.width))).toBeLessThan(1)
  expect(Math.abs(name.y - (viewportHeight - (copyright.y + copyright.height)))).toBeLessThan(3)
})

test("About and project headers scroll normally instead of sticking", async ({ page }) => {
  for (const route of ["/about", "/tally", "/sprint-x", "/curalink"]) {
    await page.goto(route)
    const header = page.locator(".site-nav-shell").first()
    await expect(header).toHaveCSS("position", "absolute")
    const before = await header.boundingBox()
    await page.evaluate(() => scrollTo(0, 900))
    const after = await header.boundingBox()
    expect(after.y).toBeLessThan(before.y - 800)
  }
})

test("Home, About, and case studies use the same main content column", async ({ page }) => {
  const measurements = []
  for (const [route, selector] of [
    ["/", ".project-scroll-panel"],
    ["/about", '[data-framer-name="VR Dashboard"]'],
    ["/tally", '[data-framer-name="VR Dashboard"]'],
    ["/sprint-x", '[data-framer-name="VR Dashboard"]'],
    ["/curalink", ".framer-wm5mbz"],
  ]) {
    await page.goto(route)
    measurements.push(await page.locator(selector).first().boundingBox())
  }
  for (const measurement of measurements) {
    expect(Math.abs(measurement.x - measurements[0].x)).toBeLessThanOrEqual(2)
    expect(Math.abs(measurement.width - measurements[0].width)).toBeLessThanOrEqual(2)
  }
})

test("About ends with the relocated connect section", async ({ page }) => {
  await page.goto("/about")
  const paperPlane = page.locator('video[data-paper-plane-smooth="60fps-low-poly-3d-v7-hq"]')
  await expect(paperPlane).toHaveAttribute("src", "/assets/assets/paper-plane-low-poly-3d-v7-hq.mp4")
  await expect(paperPlane).toHaveAttribute("preload", "auto")
  await expect.poll(() => paperPlane.evaluate(video => video.videoWidth)).toBe(1920)
  await expect.poll(() => paperPlane.evaluate(video => video.videoHeight)).toBe(1440)
  const connect = page.locator(".about-connect")
  await connect.scrollIntoViewIfNeeded()
  await expect(connect).toBeVisible()
  await expect(page.getByRole("link", { name: "Email", exact: true })).toHaveAttribute("href", "mailto:dhwani0321@gmail.com")
  await expect(page.getByRole("link", { name: "LinkedIn", exact: true })).toHaveAttribute("href", "https://www.linkedin.com/in/dhwanishahh")
  await expect(page.getByRole("link", { name: "Instagram", exact: true })).toHaveAttribute("href", "https://www.instagram.com/dhwani.dwg/")
  await expect(connect.getByRole("link", { name: /Resume/ })).toHaveCount(0)
  await expect(connect.locator(".about-connect-meta time")).toContainText("My local time —")
  await expect(connect.locator(".about-connect-meta span")).toHaveText("© 2025 Dhwani Shah")
  await expect(page.locator(".framer-AStPX .framer-1oh7x84")).toBeHidden()
  await expect(page.locator(".framer-AStPX .framer-1ym0sig")).toBeHidden()
  await page.waitForTimeout(350)
  const metaBox = await connect.locator(".about-connect-meta").boundingBox()
  expect(Math.abs(metaBox.x - 52)).toBeLessThan(1)
  expect(Math.abs(metaBox.x + metaBox.width - 1388)).toBeLessThan(1)
  const metaPlacement = await connect.locator(".about-connect-meta").evaluate(element => ({
    bottom: element.getBoundingClientRect().bottom + scrollY,
    pageHeight: document.documentElement.scrollHeight,
  }))
  expect(Math.abs(metaPlacement.pageHeight - metaPlacement.bottom - 44)).toBeLessThan(1)
  await expect(connect).toHaveAttribute("aria-label", "Let's connect")
  await expect(page.getByText("Case Studies", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Projects", exact: true }).first()).toHaveAttribute("href", "/#projects")
  await expect(page.locator('.framer-AStPX > [data-framer-name="Footer"]')).toBeHidden()
  const flaps = connect.locator(".about-connect-flap")
  await page.waitForTimeout(100)
  expect((await flaps.allTextContents()).join("")).not.toBe("LET'S CONNECT")
  await page.waitForTimeout(1_500)
  expect((await flaps.allTextContents()).join("").replace(/\u00a0/g, " ")).toBe("LET'S CONNECT")
  const placement = await connect.evaluate(element => ({
    bottom: element.getBoundingClientRect().bottom + window.scrollY,
    pageHeight: document.documentElement.scrollHeight,
  }))
  expect(placement.pageHeight - placement.bottom).toBeLessThan(40)
})

test("About connect tiles keep one palette and flip the blank tile at every breakpoint", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve()
  })
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 900, height: 900 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto("/about")
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
    const connect = page.locator(".about-connect")
    await expect(connect).toHaveAttribute("data-animated", "true")
    const flaps = connect.locator(".about-connect-flap")
    await expect(connect.locator(".about-connect-flap.is-space")).toHaveCount(1)
    await expect.poll(() => connect.locator(".about-connect-flap.is-space").evaluate(element => element.classList.contains("is-flipping"))).toBe(true)
    const flippingPalette = await flaps.evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element)
      return {
        background: style.backgroundColor,
        color: style.color,
        opacity: style.opacity,
      }
    }))
    expect(new Set(flippingPalette.map(style => style.background)).size).toBe(1)
    expect(new Set(flippingPalette.map(style => style.color)).size).toBe(1)
    expect(flippingPalette.every(style => style.opacity === "1")).toBe(true)
    await page.waitForTimeout(1_550)
    const finalPalette = await flaps.evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element)
      return {
        background: style.backgroundColor,
        color: style.color,
        opacity: style.opacity,
      }
    }))
    expect(finalPalette).toEqual(flippingPalette)
    expect((await flaps.allTextContents()).join("").replace(/\u00a0/g, " ")).toBe("LET'S CONNECT")
  }
})

for (const route of routes) {
  test(`${route} uses the shared shell, resume URL, and no legacy footer`, async ({ page }) => {
    await page.goto(route)
    await expect(page.locator("#main > .site-shell-page")).toHaveCount(1)

    const footers = page.locator('[data-framer-name="Footer"]')
    for (const footer of await footers.all()) await expect(footer).toBeHidden()

    const resumes = page.getByRole("link", { name: "Resume", exact: true })
    for (const resume of await resumes.all()) await expect(resume).toHaveAttribute("href", resumeUrl)
  })
}

test("mobile navigation opens as a compact top menu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")
  const mobileHeader = page.locator(".site-nav-shell").first()
  await expect.poll(() => mobileHeader.evaluate(element => getComputedStyle(element).transform)).toBe("none")
  const menuButton = mobileHeader.locator('.framer-9sf85-container')
  const headerBox = await mobileHeader.boundingBox()
  const menuBox = await menuButton.boundingBox()
  const closedNameBox = await mobileHeader.getByRole("link", { name: "Dhwani Shah", exact: true }).boundingBox()
  expect(Math.abs(menuBox.x + menuBox.width - (headerBox.x + headerBox.width))).toBeLessThan(1)
  await expect(menuButton).toHaveCSS("background-color", "rgba(0, 0, 0, 0)")
  expect(await menuButton.evaluate(element => getComputedStyle(element).webkitBackdropFilter || getComputedStyle(element).backdropFilter)).toBe("none")
  await page.locator('[data-framer-name="open"]').first().click()
  await expect(page.getByRole("link", { name: "About", exact: true }).last()).toBeVisible()
  await expect(page.getByRole("link", { name: "Resume", exact: true }).last()).toBeVisible()
  const openMenu = mobileHeader.locator('[data-framer-name="Phone"]')
  await expect(openMenu).toHaveCSS("position", "fixed")
  await expect(openMenu).toHaveCSS("background-color", "rgb(0, 0, 0)")
  const menuLinks = openMenu.locator(".framer-1v617ec")
  const openName = openMenu.getByRole("link", { name: "Dhwani Shah", exact: true })
  const openMenuBox = await openMenu.boundingBox()
  const menuLinksBox = await menuLinks.boundingBox()
  const projectLinkBox = await openMenu.getByRole("link", { name: "Projects", exact: true }).boundingBox()
  expect(Math.abs(openMenuBox.x)).toBeLessThan(1)
  expect(Math.abs(openMenuBox.y)).toBeLessThan(1)
  expect(Math.abs(openMenuBox.width - 390)).toBeLessThan(1)
  expect(Math.abs(openMenuBox.height - 243)).toBeLessThan(1)
  const openNameBox = await openName.boundingBox()
  expect(Math.abs(openNameBox.x - closedNameBox.x)).toBeLessThan(1)
  expect(Math.abs(openNameBox.y - closedNameBox.y)).toBeLessThan(1)
  expect(Math.abs(openNameBox.height - closedNameBox.height)).toBeLessThan(1)
  await expect(openName).toHaveCSS("font-size", "17px")
  await expect(openMenu).toHaveCSS("animation-name", "mobile-menu-open")
  await expect(menuLinks).toHaveCSS("animation-name", "mobile-menu-links-in")
  expect(Math.abs(menuLinksBox.x - 20)).toBeLessThan(1)
  expect(projectLinkBox.width).toBeGreaterThanOrEqual(350)
  await expect(openMenu.getByRole("link", { name: "Projects", exact: true })).toHaveCSS("font-size", "15px")
  for (const option of await menuLinks.locator('[data-framer-component-type="RichTextContainer"]').all()) {
    expect((await option.boundingBox()).height).toBeGreaterThanOrEqual(39.9)
  }

  await openMenu.getByRole("link", { name: "Projects", exact: true }).click()
  await expect(page).toHaveURL(/\/#projects$/)
  await expect(openMenu).toHaveCount(0)
  await expect(page.locator("html")).not.toHaveClass(/project-scroll-in-flight/)
  await expect.poll(() => page.locator("#projects").evaluate(element => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(2)
  await expect(page.locator("html")).toHaveCSS("scroll-snap-type", "y mandatory")
})

test("mobile About menu keeps the header fixed in place above page animation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/about")

  const header = page.locator(".site-nav-shell").first()
  const closedName = header.getByRole("link", { name: "Dhwani Shah", exact: true })
  await expect(closedName).toBeVisible()
  const closedNameBox = await closedName.boundingBox()
  await page.evaluate(() => {
    window.__aboutHeaderTransitionPositions = []
    const deadline = performance.now() + 500
    const sample = () => {
      const menu = document.querySelector('.framer-7EQCV[data-framer-name="Phone"]')
      const name = [...(menu?.querySelectorAll("a") || [])].find(link => link.textContent.trim() === "Dhwani Shah")
      if (name) {
        const box = name.getBoundingClientRect()
        window.__aboutHeaderTransitionPositions.push({ x: box.x, width: box.width, height: box.height })
      }
      if (performance.now() < deadline) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await header.locator('[data-framer-name="open"]').click()
  await page.waitForTimeout(500)
  const transitionNamePositions = await page.evaluate(() => window.__aboutHeaderTransitionPositions)

  const menu = header.locator('[data-framer-name="Phone"]')
  const openName = menu.getByRole("link", { name: "Dhwani Shah", exact: true })
  const projects = menu.getByRole("link", { name: "Projects", exact: true })
  await expect(menu).toBeVisible()
  const menuBox = await menu.boundingBox()
  const openNameBox = await openName.boundingBox()
  expect(Math.abs(menuBox.x)).toBeLessThan(1)
  expect(Math.abs(menuBox.y)).toBeLessThan(1)
  expect(Math.abs(menuBox.width - 390)).toBeLessThan(1)
  expect(Math.abs(openNameBox.x - closedNameBox.x)).toBeLessThan(1)
  expect(Math.abs(openNameBox.y - closedNameBox.y)).toBeLessThan(1)
  expect(Math.abs(openNameBox.width - closedNameBox.width)).toBeLessThan(1)
  expect(Math.abs(openNameBox.height - closedNameBox.height)).toBeLessThan(1)
  expect(transitionNamePositions.length).toBeGreaterThan(3)
  for (const position of transitionNamePositions) {
    expect(Math.abs(position.x - closedNameBox.x)).toBeLessThan(1)
    expect(Math.abs(position.width - closedNameBox.width)).toBeLessThan(1)
    expect(Math.abs(position.height - closedNameBox.height)).toBeLessThan(1)
  }
  expect(Number(await header.evaluate(element => getComputedStyle(element).zIndex))).toBeGreaterThanOrEqual(1000)
  expect(await projects.evaluate(element => {
    const box = element.getBoundingClientRect()
    const topmost = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
    return element === topmost || element.contains(topmost)
  })).toBe(true)

  await page.evaluate(() => {
    window.__aboutHeaderClosePositions = []
    const deadline = performance.now() + 500
    const sample = () => {
      const names = [...document.querySelectorAll('.site-nav-shell a, .mobile-header-name-guard a')]
        .filter(link => link.textContent.trim() === "Dhwani Shah")
        .filter(link => {
          const box = link.getBoundingClientRect()
          const style = getComputedStyle(link)
          return box.width > 0 && box.height > 0 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0
        })
      for (const name of names) {
        const box = name.getBoundingClientRect()
        window.__aboutHeaderClosePositions.push({ x: box.x, y: box.y, width: box.width, height: box.height })
      }
      if (performance.now() < deadline) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await menu.locator('[data-framer-name="close"]').click()
  await page.waitForTimeout(700)
  await expect(menu).toHaveCount(0)
  const closedAgainBox = await header.getByRole("link", { name: "Dhwani Shah", exact: true }).boundingBox()
  const closePositions = await page.evaluate(() => window.__aboutHeaderClosePositions)
  expect(Math.abs(closedAgainBox.x - closedNameBox.x)).toBeLessThan(1)
  expect(Math.abs(closedAgainBox.y - closedNameBox.y)).toBeLessThan(1)
  expect(Math.abs(closedAgainBox.width - closedNameBox.width)).toBeLessThan(1)
  expect(Math.abs(closedAgainBox.height - closedNameBox.height)).toBeLessThan(1)
  expect(closePositions.length).toBeGreaterThan(3)
  for (const position of closePositions) {
    expect(Math.abs(position.x - closedNameBox.x)).toBeLessThan(1)
    expect(Math.abs(position.y - closedNameBox.y)).toBeLessThan(1)
    expect(Math.abs(position.width - closedNameBox.width)).toBeLessThan(1)
    expect(Math.abs(position.height - closedNameBox.height)).toBeLessThan(1)
  }
})

test("project transitions use one consistent split flap sound across mobile tablet and desktop", async ({ page }) => {
  await page.addInitScript(() => {
    window.__projectTransitionSoundEvents = []
    window.__projectTransitionPrimeEvents = []
    HTMLMediaElement.prototype.play = function () {
      if (this.dataset.soundTrigger === "project-transition") {
        window.__projectTransitionSoundEvents.push({
          source: this.currentSrc || this.src,
          volume: this.volume,
          playbackRate: this.playbackRate,
          projectIndex: Number(this.dataset.projectIndex),
        })
      }
      if (this.dataset.soundTrigger === "project-transition-prime") {
        window.__projectTransitionPrimeEvents.push({ volume: this.volume })
      }
      return Promise.resolve()
    }
  })
  for (const viewport of [
    { width: 390, height: 667 },
    { width: 900, height: 900 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto("/")
    await page.locator("body").dispatchEvent("pointerdown", { pointerType: viewport.width < 810 ? "touch" : "mouse" })
    await expect.poll(() => page.evaluate(() => window.__projectTransitionPrimeEvents.length)).toBe(1)
    await expect.poll(() => page.evaluate(() => window.__projectTransitionPrimeEvents[0]?.volume)).toBe(.001)

    const panels = page.locator(".project-scroll-panel")
    for (let index = 0; index < 4; index += 1) {
      await panels.nth(index).evaluate(element => element.scrollIntoView({ block: "start", behavior: "instant" }))
      await expect(panels.nth(index)).toHaveClass(/is-active/)
      await expect.poll(() => page.evaluate(() => window.__projectTransitionSoundEvents.length)).toBe(index + 1)
    }
    for (let index = 2; index >= 0; index -= 1) {
      await panels.nth(index).evaluate(element => element.scrollIntoView({ block: "start", behavior: "instant" }))
      await expect(panels.nth(index)).toHaveClass(/is-active/)
      await expect.poll(() => page.evaluate(() => window.__projectTransitionSoundEvents.length)).toBe(7 - index)
    }
    const events = await page.evaluate(() => window.__projectTransitionSoundEvents)
    expect(events).toHaveLength(7)
    expect(events.map(event => event.projectIndex)).toEqual([0, 1, 2, 3, 2, 1, 0])
    expect(new Set(events.map(event => event.source)).size).toBe(1)
    for (const event of events) {
      expect(event.volume).toBe(.18)
      expect(event.playbackRate).toBe(1)
    }

    if (viewport.width === 390) {
      const emptyTallyParagraph = panels.first().locator(".framer-12hj3tg > p.framer-text").filter({ has: page.locator("br.trailing-break") })
      await expect(emptyTallyParagraph).toBeHidden()
      const tallyGap = await panels.first().evaluate(element => {
        const description = [...element.querySelectorAll(".framer-12hj3tg > p")]
          .find(paragraph => paragraph.textContent.trim())?.getBoundingClientRect()
        const tags = [...element.lastElementChild.querySelectorAll("div")]
          .filter(tag => getComputedStyle(tag).backgroundColor === "rgb(31, 31, 31)" && tag.getBoundingClientRect().width > 20)
          .map(tag => tag.getBoundingClientRect())
        return description && tags.length ? Math.min(...tags.map(tag => tag.top)) - description.bottom : Number.POSITIVE_INFINITY
      })
      expect(tallyGap).toBeCloseTo(12, 0)
    }
  }
})

test("mobile homepage uses reference-style native viewport snapping", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 })
  await page.goto("/")

  await expect(page.locator('[data-framer-name="section header"]')).toBeHidden()
  await expect(page.locator("html")).toHaveCSS("scroll-snap-type", "y mandatory")
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto")
  await expect(page.locator("body")).toHaveCSS("overscroll-behavior-y", "auto")
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", "width=device-width, initial-scale=1.0, viewport-fit=cover")
  const landing = page.locator(".framer-1cf70bh")
  await expect.poll(() => landing.evaluate(element => {
    const visibleAnimation = [...element.querySelectorAll(".framer-14c1xbw-container, .framer-rmunsi-container")]
      .filter(child => getComputedStyle(child).display !== "none")
      .map(child => child.getBoundingClientRect())
    const top = Math.min(...visibleAnimation.map(box => box.top))
    const bottom = Math.max(...visibleAnimation.map(box => box.bottom))
    return Math.abs((top + bottom) / 2 - innerHeight * .47)
  })).toBeLessThanOrEqual(2)
  await expect.poll(() => landing.evaluate(element => Math.abs(element.getBoundingClientRect().height - innerHeight))).toBeLessThan(1)
  const footer = page.locator(".portfolio-meta-footer")
  await expect(footer).toHaveCSS("position", "fixed")
  await expect(footer).toBeInViewport()
  const expectFooterAtViewportBottom = async () => {
    await expect.poll(() => footer.evaluate(element => {
      const box = element.getBoundingClientRect()
      return Math.abs(window.innerHeight - box.bottom - 12)
    })).toBeLessThanOrEqual(1)
  }
  await expectFooterAtViewportBottom()

  const panels = page.locator(".project-scroll-panel")
  const firstProjectContent = panels.first().locator(":scope > *").first()
  await expect(panels.first()).toHaveCSS("opacity", "1")
  await expect(panels.first()).toHaveCSS("transform", "none")
  await expect(panels.first()).toHaveCSS("scroll-snap-stop", "normal")
  await expect(firstProjectContent).toHaveCSS("opacity", "1")
  for (const panel of await panels.all()) {
    await panel.scrollIntoViewIfNeeded()
    await expect(panel).toHaveClass(/is-active/)
    await expect(panel).toHaveCSS("opacity", "1")
    await expect.poll(() => panel.evaluate(element => {
      const transform = getComputedStyle(element).transform
      return transform === "none" ? 0 : Math.abs(new DOMMatrixReadOnly(transform).m42)
    })).toBeLessThan(.5)
    await expect(panel).toHaveCSS("scroll-snap-align", "start")
    const content = panel.locator(":scope > *").first()
    await expect(content).toHaveCSS("opacity", "1")
    const layout = await panel.evaluate(element => {
      const children = [...element.children].filter(child => getComputedStyle(child).display !== "none")
      const boxes = children.map(child => child.getBoundingClientRect())
      return {
        panel: element.getBoundingClientRect().toJSON(),
        children: boxes.map(box => box.toJSON()),
      }
    })
    layout.children.slice(1).forEach((box, index) => {
      expect(box.top).toBeGreaterThanOrEqual(layout.children[index].bottom - 1)
    })
    expect(layout.children.at(-1).bottom).toBeLessThanOrEqual(layout.panel.bottom + 1)
    await expectFooterAtViewportBottom()
  }

  for (let index = 0; index < 3; index += 1) await expect(panels.nth(index)).not.toHaveClass(/is-active/)
  await expect(panels.last()).toHaveClass(/is-active/)

  const homePanelBox = await panels.first().boundingBox()
  const homeMediaBox = await panels.first().locator(":scope > *").first().boundingBox()
  const homeTitleBox = await panels.first().getByText("TALLY", { exact: true }).first().boundingBox()
  await page.goto("/about")
  const aboutBox = await page.locator(".framer-1vz9cvd").boundingBox()
  await page.goto("/tally")
  const caseStudyBox = await page.locator('[data-framer-name="VR Dashboard"]').first().boundingBox()
  for (const box of [homePanelBox, homeMediaBox, aboutBox, caseStudyBox]) {
    expect(Math.abs(box.x - 20)).toBeLessThanOrEqual(2)
    expect(Math.abs(box.x + box.width - 370)).toBeLessThanOrEqual(2)
  }
  expect(Math.abs(homeTitleBox.x - 20)).toBeLessThanOrEqual(2)

  await page.goto("/")
  const descriptionSelectors = [".framer-12hj3tg", ".framer-19gs733", ".framer-1866ev0", ".framer-1jizzz6"]
  let projectIndex = 0
  for (const panel of await page.locator(".project-scroll-panel").all()) {
    await panel.scrollIntoViewIfNeeded()
    await expect(panel).toHaveClass(/is-active/)
    const image = panel.locator("img").first()
    const media = panel.locator(":scope > *").first()
    await expect(image).toHaveCSS("object-fit", "contain")
    await expect.poll(() => panel.evaluate(element => {
      const imageBox = element.querySelector("img")?.getBoundingClientRect()
      const mediaBox = element.firstElementChild?.getBoundingClientRect()
      if (!imageBox || !mediaBox) return Number.POSITIVE_INFINITY
      return Math.max(
        mediaBox.left - imageBox.left,
        mediaBox.top - imageBox.top,
        imageBox.right - mediaBox.right,
        imageBox.bottom - mediaBox.bottom,
      )
    })).toBeLessThanOrEqual(2)
    const imageBox = await image.boundingBox()
    const mediaBox = await media.boundingBox()
    expect(imageBox.x).toBeGreaterThanOrEqual(mediaBox.x - 2)
    expect(imageBox.y).toBeGreaterThanOrEqual(mediaBox.y - 2)
    expect(imageBox.x + imageBox.width).toBeLessThanOrEqual(mediaBox.x + mediaBox.width + 2)
    expect(imageBox.y + imageBox.height).toBeLessThanOrEqual(mediaBox.y + mediaBox.height + 2)
    const ratioDelta = await image.evaluate((element, frame) =>
      Math.abs(element.naturalWidth / element.naturalHeight - frame.width / frame.height)
    , mediaBox)
    expect(ratioDelta).toBeLessThan(0.01)

    const content = panel.locator(":scope > :last-child")
    const textBox = await content.locator(":scope > :first-child").boundingBox()
    const tagBoxes = await content.locator(":scope > :not(:first-child)").evaluateAll(tags =>
      tags.map(tag => tag.getBoundingClientRect().toJSON())
    )
    if (tagBoxes.length) {
      expect(Math.abs(Math.min(...tagBoxes.map(box => box.x)) - textBox.x)).toBeLessThan(1)
    }
    const greyTags = await content.evaluate(element => [...element.querySelectorAll("div")]
      .filter(tag => {
        const box = tag.getBoundingClientRect()
        return getComputedStyle(tag).backgroundColor === "rgb(31, 31, 31)" && box.width > 20
      })
      .map(tag => tag.getBoundingClientRect().toJSON())
    )
    if (greyTags.length) {
      expect(Math.abs(Math.min(...greyTags.map(box => box.x)) - textBox.x)).toBeLessThan(1)
      const descriptionSelector = descriptionSelectors[projectIndex]
      await expect.poll(() => panel.evaluate((element, selector) => {
        const description = element.querySelector(selector)?.getBoundingClientRect()
        const tags = [...element.lastElementChild.querySelectorAll("div")]
          .filter(tag => getComputedStyle(tag).backgroundColor === "rgb(31, 31, 31)" && tag.getBoundingClientRect().width > 20)
          .map(tag => tag.getBoundingClientRect())
        if (!description || !tags.length) return Number.POSITIVE_INFINITY
        return Math.abs(Math.min(...tags.map(tag => tag.top)) - description.bottom - 12)
      }, descriptionSelector)).toBeLessThanOrEqual(1.5)
    }
    await expect.poll(() => panel.evaluate(element => {
      const image = element.querySelector("img")?.getBoundingClientRect()
      const text = [...element.querySelectorAll("h1, h2, h3, h4, h5, h6, p")]
        .filter(node => node.textContent.trim() && getComputedStyle(node).display !== "none")
        .map(node => node.getBoundingClientRect())
      const boxes = [image, ...text].filter(Boolean)
      const top = Math.min(...boxes.map(box => box.top))
      const bottom = Math.max(...boxes.map(box => box.bottom))
      return Math.abs((top + bottom) / 2 - innerHeight / 2)
    })).toBeLessThanOrEqual(6)
    projectIndex += 1
  }

  for (const panel of (await page.locator(".project-scroll-panel").all()).reverse()) {
    await panel.evaluate(element => element.scrollIntoView({ block: "start", behavior: "instant" }))
    await expect.poll(() => panel.evaluate(element => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(2)
    await expect(panel).toHaveClass(/is-active/)
    await expect.poll(() => panel.evaluate(element => {
      const panelBox = element.getBoundingClientRect()
      const children = [...element.children]
        .filter(child => getComputedStyle(child).display !== "none")
        .map(child => child.getBoundingClientRect())
      const topSpace = Math.min(...children.map(box => box.top)) - panelBox.top
      const bottomSpace = panelBox.bottom - Math.max(...children.map(box => box.bottom))
      return Math.abs(topSpace - bottomSpace)
    })).toBeLessThanOrEqual(2)
    const content = panel.locator(":scope > *")
    for (const child of await content.all()) {
      await expect(child).toHaveCSS("opacity", "1")
    }
    const alignment = await panel.evaluate(element => ({
      panel: element.getBoundingClientRect().toJSON(),
      children: [...element.children].map(child => child.getBoundingClientRect().toJSON()),
    }))
    expect(Math.abs(alignment.panel.x - 20)).toBeLessThanOrEqual(2)
    for (const child of alignment.children) expect(Math.abs(child.x - alignment.panel.x)).toBeLessThanOrEqual(2)
    const topSpace = Math.min(...alignment.children.map(box => box.top)) - alignment.panel.top
    const bottomSpace = alignment.panel.bottom - Math.max(...alignment.children.map(box => box.bottom))
    expect(Math.abs(topSpace - bottomSpace)).toBeLessThanOrEqual(2)
  }


  const tallyContent = page.locator('[data-framer-name="tally section"] > :last-child')
  const tallyLayout = await tallyContent.evaluate(element => {
    const text = element.firstElementChild.getBoundingClientRect()
    const pills = [...element.children].slice(1).map(child => child.getBoundingClientRect().toJSON())
    return { text: text.toJSON(), pills }
  })
  const firstPillRow = tallyLayout.pills.filter(pill => Math.abs(pill.top - Math.min(...tallyLayout.pills.map(item => item.top))) < 1)
  firstPillRow.sort((a, b) => a.left - b.left)
  expect(firstPillRow[0].top - tallyLayout.text.bottom).toBeCloseTo(12, 0)
  expect(firstPillRow[1].left - firstPillRow[0].right).toBeCloseTo(8, 0)
  const secondRow = tallyLayout.pills.find(pill => pill.top > firstPillRow[0].top + 1)
  expect(secondRow.top - firstPillRow[0].bottom).toBeCloseTo(8, 0)

  const activeMediaBox = await page.locator(".project-scroll-panel").last().locator(":scope > *").first().boundingBox()
  const progressBox = await page.locator(".project-progress").boundingBox()
  expect(progressBox.x).toBeGreaterThanOrEqual(activeMediaBox.x + activeMediaBox.width)
  for (const dot of await page.locator(".project-progress a").all()) {
    const dotBox = await dot.boundingBox()
    expect(dotBox.x).toBeGreaterThan(activeMediaBox.x + activeMediaBox.width)
  }

  const lastPanel = page.locator(".project-scroll-panel").last()
  await lastPanel.scrollIntoViewIfNeeded()
  await expect(page.locator(".site-nav-shell").first()).toBeInViewport()
  await expect(page.locator(".portfolio-meta-footer")).toBeInViewport()
  expect(Number(await page.locator(".site-nav-shell").first().evaluate(element => getComputedStyle(element).zIndex))).toBeGreaterThan(2)
  expect(Number(await page.locator(".portfolio-meta-footer").evaluate(element => getComputedStyle(element).zIndex))).toBeGreaterThan(2)
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(await lastPanel.evaluate(panel => panel.offsetTop))
  const boundary = await lastPanel.evaluate(panel => ({
    panelBottom: panel.getBoundingClientRect().bottom + scrollY,
    pageBottom: document.documentElement.scrollHeight,
    maxScroll: document.documentElement.scrollHeight - innerHeight,
    panelTop: panel.getBoundingClientRect().top + scrollY,
  }))
  expect(Math.abs(boundary.panelBottom - boundary.pageBottom)).toBeLessThan(1)
  expect(Math.abs(boundary.panelTop - boundary.maxScroll)).toBeLessThan(1)

  await page.setViewportSize({ width: 390, height: 740 })
  await expectFooterAtViewportBottom()
  await expect.poll(() => lastPanel.evaluate(panel => Math.abs(panel.getBoundingClientRect().height - innerHeight))).toBeLessThan(1)
  await lastPanel.evaluate(panel => panel.scrollIntoView({ block: "start", behavior: "instant" }))
  await expect.poll(() => lastPanel.evaluate(panel => Math.abs(panel.getBoundingClientRect().top))).toBeLessThan(2)
  await expectFooterAtViewportBottom()
  const firstPanel = page.locator(".project-scroll-panel").first()
  await firstPanel.evaluate(panel => panel.scrollIntoView({ block: "start", behavior: "instant" }))
  await expect.poll(() => firstPanel.evaluate(panel => Math.abs(panel.getBoundingClientRect().top))).toBeLessThan(2)
  await expectFooterAtViewportBottom()

  await page.setViewportSize({ width: 390, height: 667 })
  await page.goto("/")
  const reversePanels = page.locator(".project-scroll-panel")
  await reversePanels.last().evaluate(panel => panel.scrollIntoView({ block: "start", behavior: "instant" }))
  for (let index = 2; index >= 0; index -= 1) {
    await page.mouse.wheel(0, -700)
    const panel = reversePanels.nth(index)
    await expect.poll(() => panel.evaluate(element => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(2)
    await expect(panel).toHaveClass(/is-active/)
    await expect.poll(() => panel.evaluate(element => {
      const transform = getComputedStyle(element).transform
      return transform === "none" ? 0 : Math.abs(new DOMMatrixReadOnly(transform).m42)
    })).toBeLessThan(.5)
  }
})

test("mobile About connect animation stays on one line", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    window.__flapSoundPlayCount = 0
    HTMLMediaElement.prototype.play = function () {
      if ((this.currentSrc || this.src).includes("/sounds/sound")) window.__flapSoundPlayCount += 1
      return Promise.resolve()
    }
  })
  await page.goto("/about")
  const connect = page.locator(".about-connect")
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight - innerHeight - 40))
  await expect(connect).not.toHaveAttribute("data-animated")
  expect(await page.evaluate(() => window.__flapSoundPlayCount)).toBe(0)
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
  await expect(connect).toHaveAttribute("data-reveal-trigger", "page-bottom")
  await expect(connect).toHaveAttribute("data-animated", "true")
  await expect.poll(() => page.evaluate(() => window.__flapSoundPlayCount)).toBeGreaterThan(0)
  const flaps = page.locator(".about-connect-flaps")
  await flaps.scrollIntoViewIfNeeded()
  const layout = await flaps.evaluate(element => ({
    container: element.getBoundingClientRect().toJSON(),
    children: [...element.children].map(child => ({
      top: child.offsetTop,
      right: child.getBoundingClientRect().right,
    })),
  }))
  expect(new Set(layout.children.map(box => Math.round(box.top))).size).toBe(1)
  expect(layout.children.at(-1).right).toBeLessThanOrEqual(layout.container.right + 1)
  const certification = page.locator(".framer-1d1zcd5:visible")
  await expect(certification).toBeVisible()
  await expect.poll(() => page.evaluate(() => {
    const certification = [...document.querySelectorAll(".framer-1d1zcd5")]
      .find(element => getComputedStyle(element).display !== "none")
    const flaps = document.querySelector(".about-connect-flaps")
    const actions = document.querySelector(".about-connect-actions")
    const footer = document.querySelector(".about-connect-meta")
    if (!certification || !flaps || !actions || !footer) return false
    const gapAbove = flaps.getBoundingClientRect().top - certification.getBoundingClientRect().bottom
    const gapBelow = footer.getBoundingClientRect().top - actions.getBoundingClientRect().bottom
    return Math.abs(gapAbove - gapBelow) <= 20
  })).toBe(true)
  await expect.poll(() => page.evaluate(() => {
    const hero = document.querySelector('[data-framer-name="VR Dashboard"]')?.getBoundingClientRect()
    const yesterday = [...document.querySelectorAll("h6")]
      .find(element => element.textContent.trim() === "YESTERDAY" && getComputedStyle(element).display !== "none")
      ?.getBoundingClientRect()
    return hero && yesterday ? yesterday.top - hero.bottom : null
  })).toBeGreaterThanOrEqual(15)
  await expect.poll(() => page.evaluate(() => {
    const hero = document.querySelector('[data-framer-name="VR Dashboard"]')?.getBoundingClientRect()
    const yesterday = [...document.querySelectorAll("h6")]
      .find(element => element.textContent.trim() === "YESTERDAY" && getComputedStyle(element).display !== "none")
      ?.getBoundingClientRect()
    return hero && yesterday ? yesterday.top - hero.bottom : null
  })).toBeLessThanOrEqual(25)
  const aboutSpacing = await page.evaluate(() => {
    const visibleText = label => [...document.querySelectorAll('[data-framer-component-type="RichTextContainer"]')]
      .find(element => element.textContent.trim() === label && getComputedStyle(element).display !== "none")
    const tomorrowParagraph = visibleText("TOMORROW")?.nextElementSibling?.getBoundingClientRect()
    const everyday = visibleText("EVERYDAY")?.getBoundingClientRect()
    const viewMore = visibleText("View more")?.getBoundingClientRect()
    const awards = visibleText("AWARDS")?.getBoundingClientRect()
    const today = visibleText("TODAY")?.getBoundingClientRect()
    const portrait = [...document.querySelectorAll("img")]
      .map(image => image.getBoundingClientRect())
      .filter(box => box.right > 0 && box.left < innerWidth && box.bottom <= today.top)
      .sort((a, b) => b.bottom - a.bottom)[0]
    return {
      referenceGap: today.top - portrait.bottom,
      tomorrowToEveryday: everyday.top - tomorrowParagraph.bottom,
      viewMoreToAwards: awards.top - viewMore.bottom,
    }
  })
  expect(Math.abs(aboutSpacing.tomorrowToEveryday - aboutSpacing.referenceGap)).toBeLessThanOrEqual(2)
  expect(Math.abs(aboutSpacing.viewMoreToAwards - aboutSpacing.referenceGap)).toBeLessThanOrEqual(2)
  await expect(page.getByRole("link", { name: "LinkedIn", exact: true }).locator("svg.about-external-icon")).toHaveCount(1)
  await expect(page.getByRole("link", { name: "Instagram", exact: true }).locator("svg.about-external-icon")).toHaveCount(1)
})

test("mobile pages share the reduced header top inset", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const route of ["/", "/about", "/tally", "/sprint-x", "/curalink"]) {
    await page.goto(route)
    const header = page.locator(".site-nav-shell").first()
    await expect(header).toBeVisible()
    await expect.poll(() => header.evaluate(element => Math.abs(element.getBoundingClientRect().y - 8))).toBeLessThanOrEqual(1)
  }
})
