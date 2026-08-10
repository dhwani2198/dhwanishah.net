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

test("homepage split-flap animation stays centered at every breakpoint", async ({ page }) => {
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
    expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(1)
    await expect(page.locator('[data-flap-sound-source="chloeyan-ferry"]')).toHaveCount(1)
  }
})

test("first project fades and pulls up with minimal dot navigation", async ({ page }) => {
  await page.goto("/")
  const firstPanel = page.locator(".project-scroll-panel").first()
  const progress = page.locator(".project-progress")

  await expect(progress.locator("a")).toHaveCount(4)
  await expect(progress).not.toHaveClass(/is-visible/)
  await expect(firstPanel).toHaveCSS("opacity", "0")
  expect(await firstPanel.evaluate(element => getComputedStyle(element).transform)).not.toBe("none")

  await firstPanel.scrollIntoViewIfNeeded()
  await expect(firstPanel).toHaveClass(/is-active/)
  await expect(firstPanel).toHaveCSS("opacity", "1")
  await expect(firstPanel).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)")
  await expect(progress).toHaveClass(/is-visible/)
  await expect(progress.locator("a").first()).toHaveClass(/is-active/)
  await expect(progress.locator("a").first()).toHaveCSS("width", "6px")
  await expect(progress.locator("a").first()).toHaveCSS("background-color", "rgb(138, 138, 138)")

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

test("mobile navigation opens and exposes its links", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")
  const mobileHeader = page.locator(".site-nav-shell").first()
  const menuButton = mobileHeader.locator('.framer-9sf85-container')
  const headerBox = await mobileHeader.boundingBox()
  const menuBox = await menuButton.boundingBox()
  expect(Math.abs(menuBox.x + menuBox.width - (headerBox.x + headerBox.width))).toBeLessThan(1)
  await expect(menuButton).toHaveCSS("background-color", "rgba(0, 0, 0, 0)")
  expect(await menuButton.evaluate(element => getComputedStyle(element).webkitBackdropFilter || getComputedStyle(element).backdropFilter)).toBe("none")
  await page.locator('[data-framer-name="open"]').first().click()
  await expect(page.getByRole("link", { name: "About", exact: true }).last()).toBeVisible()
  await expect(page.getByRole("link", { name: "Resume", exact: true }).last()).toBeVisible()
  const openMenu = mobileHeader.locator('[data-framer-name="Phone"]')
  await expect(openMenu).toHaveCSS("background-color", "rgba(0, 0, 0, 0)")
  const menuLinks = openMenu.locator(".framer-1v617ec")
  await expect(menuLinks).toHaveCSS("background-color", "rgba(20, 20, 20, 0.88)")
  expect(await menuLinks.evaluate(element => getComputedStyle(element).webkitBackdropFilter || getComputedStyle(element).backdropFilter)).toContain("blur")
  const openMenuBox = await openMenu.boundingBox()
  const menuLinksBox = await menuLinks.boundingBox()
  const projectLinkBox = await openMenu.getByRole("link", { name: "Projects", exact: true }).boundingBox()
  expect(Math.abs(menuLinksBox.x + menuLinksBox.width - (openMenuBox.x + openMenuBox.width))).toBeLessThan(1)
  expect(menuLinksBox.x + menuLinksBox.width - (projectLinkBox.x + projectLinkBox.width)).toBeLessThanOrEqual(13)
  expect(menuLinksBox.width).toBeGreaterThanOrEqual(140)
  expect(menuLinksBox.width).toBeLessThanOrEqual(142)
  for (const option of await menuLinks.locator('[data-framer-component-type="RichTextContainer"]').all()) {
    expect((await option.boundingBox()).height).toBeGreaterThanOrEqual(43.9)
  }

  await openMenu.getByRole("link", { name: "Projects", exact: true }).click()
  await expect(page).toHaveURL(/\/#projects$/)
  await expect(openMenu).toHaveCount(0)
  await expect.poll(() => page.locator("#projects").evaluate(element => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(2)
})

test("mobile homepage keeps desktop-style panel scrolling and project animation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 })
  await page.goto("/")

  await expect(page.locator('[data-framer-name="section header"]')).toBeHidden()
  await expect(page.locator("html")).toHaveCSS("scroll-snap-type", "y mandatory")
  const footer = page.locator(".portfolio-meta-footer")
  await expect(footer).toHaveCSS("position", "fixed")
  await expect(footer).toBeInViewport()

  const panels = page.locator(".project-scroll-panel")
  const firstProjectContent = panels.first().locator(":scope > *").first()
  await expect(panels.first()).toHaveCSS("transform", "none")
  await expect(firstProjectContent).toHaveCSS("opacity", "0")
  expect(await firstProjectContent.evaluate(element => getComputedStyle(element).transform)).not.toBe("none")
  for (const panel of await panels.all()) {
    await panel.scrollIntoViewIfNeeded()
    await expect(panel).toHaveClass(/is-active/)
    await expect(panel).toHaveCSS("scroll-snap-align", "start")
    const content = panel.locator(":scope > *").first()
    await expect(content).toHaveCSS("opacity", "1")
    await expect(content).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)")
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
  }

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
  for (const image of await page.locator(".project-scroll-panel img").all()) {
    await expect(image).toHaveCSS("object-fit", "contain")
  }
})

test("mobile About connect animation stays on one line", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/about")
  const flaps = page.locator(".about-connect-flaps")
  await flaps.scrollIntoViewIfNeeded()
  const layout = await flaps.evaluate(element => ({
    container: element.getBoundingClientRect().toJSON(),
    children: [...element.children].map(child => child.getBoundingClientRect().toJSON()),
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
  await expect(page.getByRole("link", { name: "LinkedIn", exact: true }).locator("svg.about-external-icon")).toHaveCount(1)
  await expect(page.getByRole("link", { name: "Instagram", exact: true }).locator("svg.about-external-icon")).toHaveCount(1)
})
