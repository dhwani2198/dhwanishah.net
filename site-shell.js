(() => {
    const resumeUrl = "https://drive.google.com/file/d/1qJUonR6c54pHj2duCbeAAI5cCLDiY3mS/view?usp=sharing"
    const blogUrl = "https://dhwani0321.substack.com/"
    const connectText = "LET'S CONNECT"
    const flapAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890.,!?"
    const referenceFlapSounds = [1, 2, 3, 4].map(index => `https://www.chloeyan.me/sounds/sound${index}.mp3`)
    const smoothPaperPlane = "/assets/assets/paper-plane-low-poly-3d-v7-hq.mp4"
    const homePanelNames = ["tally section", "sprint x section", "curalink section", "Arch portfolio section"]
    const observedHomePanels = new WeakSet()
    let flapSoundPool
    let projectTransitionSound
    let projectTransitionSoundUnlocked = false
    let projectTransitionSoundPriming = false
    let pendingProjectTransitionIndex = -1
    let homePanelSyncScheduled = false
    let lastFlapSoundAt = 0
    let scheduled = false
    let projectHashHandled = false
    let completingMobileMenuClose = false
    let lastActiveHomePanelIndex = -1
    const viewportContent = "width=device-width, initial-scale=1.0, viewport-fit=cover"

    function isHomePath(pathname = location.pathname) {
        return pathname === "/" || pathname === "/index.html"
    }

    function normalizeViewport() {
        const viewport = document.querySelector('meta[name="viewport"]')
        if (viewport && viewport.content !== viewportContent) viewport.content = viewportContent
    }

    function scrollToProjects(updateHash = true) {
        const projects = document.getElementById("projects")
        if (!projects) return false

        const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
        try {
            projects.scrollIntoView({ behavior, block: "start" })
        } catch {
            projects.scrollIntoView()
        }
        if (updateHash && location.hash !== "#projects") history.replaceState(history.state, "", "/#projects")
        return true
    }

    function handleProjectLink(event) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        const target = event.target instanceof Element ? event.target : event.target?.parentElement
        const link = target?.closest('a[href*="#projects"]')
        if (!link) return

        const destination = new URL(link.href, location.href)
        if (destination.origin !== location.origin || destination.hash !== "#projects" || !isHomePath(destination.pathname)) return
        event.preventDefault()
        event.stopImmediatePropagation()
        if (!isHomePath()) {
            location.assign("/#projects")
            return
        }
        const closeMenu = document.querySelector('.site-nav-shell [data-framer-name="close"]')
        if (closeMenu) {
            for (const type of ["pointerdown", "pointerup", "click"]) {
                closeMenu.dispatchEvent(new PointerEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    pointerId: 1,
                    pointerType: "touch",
                    isPrimary: true,
                    button: 0,
                }))
            }
            requestAnimationFrame(() => requestAnimationFrame(() => scrollToProjects()))
        } else {
            scrollToProjects()
        }
    }

    function handleMobileMenuClose(event) {
        if (completingMobileMenuClose || !matchMedia("(max-width: 809.98px)").matches) return
        const target = event.target instanceof Element ? event.target : event.target?.parentElement
        const close = target?.closest('[data-framer-name="close"]')
        const menu = close?.closest('.framer-7EQCV[data-framer-name="Phone"]')
        const shell = menu?.closest(".site-nav-shell")
        if (!close || !menu || !shell) return

        event.preventDefault()
        event.stopImmediatePropagation()
        if (menu.classList.contains("mobile-menu-closing")) return
        const name = [...menu.querySelectorAll("a")].find(link => link.textContent.trim() === "Dhwani Shah")
        const nameContainer = name?.closest('[data-framer-component-type="RichTextContainer"]')
        const guard = nameContainer?.cloneNode(true)
        if (guard instanceof HTMLElement && nameContainer) {
            const box = nameContainer.getBoundingClientRect()
            guard.classList.add("mobile-header-name-guard")
            guard.setAttribute("aria-hidden", "true")
            guard.querySelectorAll("[id]").forEach(element => element.removeAttribute("id"))
            guard.style.top = `${box.top}px`
            guard.style.left = `${box.left}px`
            guard.style.width = `${box.width}px`
            guard.style.height = `${box.height}px`
            document.body.appendChild(guard)
        }
        shell.classList.add("mobile-menu-settling")
        menu.classList.add("mobile-menu-closing")
        const finishClose = () => {
            shell.classList.remove("mobile-menu-commit-close", "mobile-menu-settling")
            menu.classList.remove("mobile-menu-closing")
            guard?.remove()
        }
        setTimeout(() => {
            if (!close.isConnected || !shell.isConnected) {
                finishClose()
                return
            }
            shell.classList.add("mobile-menu-commit-close")
            completingMobileMenuClose = true
            for (const type of ["pointerdown", "pointerup", "click"]) {
                close.dispatchEvent(new PointerEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    pointerId: 1,
                    pointerType: "touch",
                    isPrimary: true,
                    button: 0,
                }))
            }
            completingMobileMenuClose = false
            requestAnimationFrame(() => requestAnimationFrame(() => {
                shell.classList.remove("mobile-menu-commit-close")
            }))
            setTimeout(finishClose, 360)
        }, 260)
    }

    function syncHomePanelState() {
        homePanelSyncScheduled = false
        const panels = [...document.querySelectorAll(".project-scroll-panel")]
        if (!panels.length) return
        const viewportCenter = innerHeight / 2
        const activePanel = panels.reduce((best, panel) => {
            const panelBox = panel.getBoundingClientRect()
            const bestBox = best.getBoundingClientRect()
            const panelDistance = Math.abs(panelBox.top + panelBox.height / 2 - viewportCenter)
            const bestDistance = Math.abs(bestBox.top + bestBox.height / 2 - viewportCenter)
            return panelDistance < bestDistance ? panel : best
        }, panels[0])
        const activeIndex = panels.indexOf(activePanel)
        const activeBox = activePanel.getBoundingClientRect()
        const visibleHeight = Math.max(0, Math.min(activeBox.bottom, innerHeight) - Math.max(activeBox.top, 0))
        const activeRatio = visibleHeight / Math.min(activeBox.height, innerHeight)
        panels.forEach(panel => panel.classList.toggle("is-active", panel === activePanel && activeRatio >= .12))
        if (activeRatio >= .5 && activeIndex !== lastActiveHomePanelIndex) {
            playFlapSound("project-transition", activeIndex)
            lastActiveHomePanelIndex = activeIndex
        }
        const progress = document.querySelector(".project-progress")
        progress?.classList.toggle("is-visible", activeRatio >= .12)
        progress?.querySelectorAll("a").forEach((dot, index) => {
            const isActive = activeRatio >= .12 && index === activeIndex
            dot.classList.toggle("is-active", isActive)
            if (isActive) dot.setAttribute("aria-current", "true")
            else dot.removeAttribute("aria-current")
        })
    }

    function scheduleHomePanelSync() {
        if (homePanelSyncScheduled) return
        homePanelSyncScheduled = true
        requestAnimationFrame(syncHomePanelState)
    }

    const homePanelObserver = new IntersectionObserver(scheduleHomePanelSync, {
        threshold: [0, .12, .5, 1],
    })

    function ensureFlapSoundPool() {
        flapSoundPool ||= referenceFlapSounds.map(source => {
            const audio = new Audio(source)
            audio.preload = "auto"
            audio.volume = .12
            return audio
        })
        return flapSoundPool
    }

    function primeProjectTransitionSound() {
        if (projectTransitionSoundUnlocked || projectTransitionSoundPriming) return
        const sound = ensureFlapSoundPool()[0]
        projectTransitionSoundPriming = true
        sound.dataset.soundTrigger = "project-transition-prime"
        sound.volume = .001
        sound.currentTime = 0

        const finish = () => {
            sound.pause()
            sound.currentTime = 0
            sound.volume = .18
            sound.dataset.soundTrigger = "project-transition"
            projectTransitionSound = sound
            projectTransitionSoundPriming = false
            projectTransitionSoundUnlocked = true
            if (pendingProjectTransitionIndex >= 0) {
                const projectIndex = pendingProjectTransitionIndex
                pendingProjectTransitionIndex = -1
                playFlapSound("project-transition", projectIndex)
            }
        }
        const retry = () => {
            projectTransitionSoundPriming = false
            sound.volume = .18
        }
        try {
            const playback = sound.play()
            if (playback?.then) playback.then(finish).catch(retry)
            else finish()
        } catch {
            retry()
        }
    }

    function playFlapSound(trigger = "split-flap", projectIndex = -1) {
        const now = performance.now()
        if (trigger !== "project-transition") {
            if (now - lastFlapSoundAt < 65) return
            lastFlapSoundAt = now
        }
        const sounds = ensureFlapSoundPool()
        const isProjectTransition = trigger === "project-transition"
        const isLandingFlap = trigger === "landing-flap"
        const source = isProjectTransition || isLandingFlap
            ? sounds[0]
            : sounds[Math.floor(Math.random() * sounds.length)]
        if (isProjectTransition && projectTransitionSoundPriming) {
            pendingProjectTransitionIndex = projectIndex
            return
        }
        const sound = isProjectTransition ? source : source.cloneNode()
        sound.dataset.soundTrigger = trigger
        if (isProjectTransition) sound.dataset.projectIndex = String(projectIndex)
        sound.volume = isProjectTransition
            ? .18
            : isLandingFlap && matchMedia("(max-width: 809.98px)").matches ? .10 : .12
        sound.playbackRate = isProjectTransition || isLandingFlap ? 1 : .96 + Math.random() * .08
        if (isProjectTransition) {
            projectTransitionSound?.pause()
            sound.currentTime = 0
            projectTransitionSound = sound
        }
        const playback = sound.play()
        if (isProjectTransition && playback?.then) {
            playback.then(() => {
                projectTransitionSoundUnlocked = true
                if (pendingProjectTransitionIndex === projectIndex) pendingProjectTransitionIndex = -1
            }).catch(() => {
                pendingProjectTransitionIndex = projectIndex
            })
        } else {
            playback?.catch(() => {})
        }
    }

    function ensureHomeFlapSound(home) {
        home.querySelectorAll(".framer-14c1xbw-container, .framer-rmunsi-container").forEach(container => {
            if (container.dataset.flapSoundReady) return
            container.dataset.flapSoundReady = "true"
            container.dataset.flapSoundSource = "chloeyan-ferry"
            new MutationObserver(() => {
                if (container.isConnected && getComputedStyle(container).display !== "none") playFlapSound("landing-flap")
            }).observe(container, { childList: true, characterData: true, subtree: true })
        })
    }

    function startLocalClock(clock) {
        const update = () => {
            if (!clock.isConnected) return
            clock.textContent = `My local time — ${new Intl.DateTimeFormat("en-US", {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                timeZoneName: "short",
            }).format(new Date())}`
            setTimeout(update, 1000)
        }
        update()
    }

    function revealConnectSection(section, flaps) {
        if (section.dataset.animated) return
        section.dataset.animated = "true"
        section.classList.add("is-visible")
        const animated = [...flaps.children]
        const timer = setInterval(() => {
            animated.forEach(flap => {
                flap.classList.remove("is-flipping")
                void flap.offsetWidth
                flap.classList.add("is-flipping")
                flap.textContent = flap.classList.contains("is-space")
                    ? "\u00a0"
                    : flapAlphabet[Math.floor(Math.random() * flapAlphabet.length)]
            })
            playFlapSound()
        }, 50)
        setTimeout(() => {
            clearInterval(timer)
            animated.forEach(flap => {
                flap.textContent = flap.classList.contains("is-space") ? "\u00a0" : flap.dataset.final
                flap.classList.remove("is-flipping")
            })
        }, 1500)
    }

    function ensureAboutConnect() {
        if (!document.querySelector("#main .framer-AStPX")) return
        if (document.querySelector(".about-connect")) return
        const footer = document.querySelector('#main [data-framer-name="Footer"]')
        if (!footer?.parentElement) return

        const section = document.createElement("section")
        section.className = "about-connect"
        section.setAttribute("aria-label", "Let's connect")
        const flaps = document.createElement("div")
        flaps.className = "about-connect-flaps"
        flaps.setAttribute("aria-label", connectText)
        for (const character of connectText) {
            const flap = document.createElement("span")
            flap.className = `about-connect-flap${character === " " ? " is-space" : ""}`
            flap.dataset.final = character
            flap.setAttribute("aria-hidden", "true")
            flap.textContent = character === " " ? "\u00a0" : " "
            flaps.appendChild(flap)
        }

        const actions = document.createElement("div")
        actions.className = "about-connect-actions"
        const links = [
            ["Email", "mailto:dhwani0321@gmail.com", "about-connect-email", false],
            ["LinkedIn", "https://www.linkedin.com/in/dhwanishahh", "", true],
            ["Instagram", "https://www.instagram.com/dhwani.dwg/", "", true],
        ]
        for (const [label, href, className, external] of links) {
            const link = document.createElement("a")
            link.href = href
            if (className) link.className = className
            if (!href.startsWith("mailto:")) {
                link.target = "_blank"
                link.rel = "noopener noreferrer"
            }
            link.textContent = label
            if (external) {
                const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg")
                icon.classList.add("about-external-icon")
                icon.setAttribute("viewBox", "0 0 10 10")
                icon.setAttribute("aria-hidden", "true")
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
                path.setAttribute("d", "M2 8 8 2M3 2h5v5")
                icon.appendChild(path)
                link.appendChild(icon)
            }
            actions.appendChild(link)
        }
        const meta = document.createElement("div")
        meta.className = "about-connect-meta"
        meta.setAttribute("aria-label", "Site information")
        const clock = document.createElement("time")
        clock.setAttribute("aria-label", "Dhwani Shah local time")
        const copyright = document.createElement("span")
        copyright.textContent = "© 2025 Dhwani Shah"
        meta.append(clock, copyright)
        section.append(flaps, actions, meta)
        footer.parentElement.insertBefore(section, footer)
        startLocalClock(clock)

        const mobileViewport = matchMedia("(max-width: 809.98px)")
        if (!mobileViewport.matches) {
            new IntersectionObserver((entries, observer) => {
                if (!entries.some(entry => entry.isIntersecting)) return
                observer.disconnect()
                revealConnectSection(section, flaps)
            }, { threshold: .5 }).observe(section)
            return
        }

        let sectionVisible = false
        const reachedPageBottom = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
        const revealAtPageBottom = () => {
            if (!sectionVisible || !reachedPageBottom()) return
            connectObserver.disconnect()
            removeEventListener("scroll", revealAtPageBottom)
            removeEventListener("resize", revealAtPageBottom)
            section.dataset.revealTrigger = "page-bottom"
            revealConnectSection(section, flaps)
        }
        const connectObserver = new IntersectionObserver(entries => {
            sectionVisible = entries.some(entry => entry.isIntersecting)
            revealAtPageBottom()
        }, { threshold: .1 })
        connectObserver.observe(section)
        addEventListener("scroll", revealAtPageBottom, { passive: true })
        addEventListener("resize", revealAtPageBottom)
    }

    function ensureHomeEnhancements() {
        const home = document.querySelector("#main .framer-Rkf84")
        if (!home) {
            document.querySelector(".project-progress")?.remove()
            return
        }

        ensureHomeFlapSound(home)

        const panels = homePanelNames.map(name => home.querySelector(`[data-framer-name="${name}"]`)).filter(Boolean)
        panels.forEach((panel, index) => {
            panel.classList.add("project-scroll-panel")
            panel.id = index === 0 ? "projects" : `project-${index + 1}`
            if (!observedHomePanels.has(panel)) {
                observedHomePanels.add(panel)
                homePanelObserver.observe(panel)
            }
        })
        scheduleHomePanelSync()

        if (location.hash === "#projects" && !projectHashHandled && panels.length) {
            projectHashHandled = true
            requestAnimationFrame(() => requestAnimationFrame(() => scrollToProjects(false)))
        }

        home.querySelectorAll('a[href*="#case-studies"]').forEach(link => { link.href = "/#projects" })
        home.querySelectorAll("h1, h2, h3, h4, h5, h6, p").forEach(node => {
            const label = node.textContent.trim().toLowerCase()
            if ((label === "case studies" || label === "projects") && !node.querySelector("a")) {
                ;(node.closest('[data-framer-component-type="RichTextContainer"]') || node).classList.add("project-section-label")
            }
        })

        let progress = document.querySelector(".project-progress")
        if (panels.length && !progress) {
            progress = document.createElement("nav")
            progress.className = "project-progress"
            progress.setAttribute("aria-label", "Project navigation")
            panels.forEach((panel, index) => {
                const dot = document.createElement("a")
                dot.href = `#${panel.id}`
                dot.setAttribute("aria-label", `View project ${index + 1}`)
                progress.appendChild(dot)
            })
            document.body.appendChild(progress)
        }

        if (panels.length && !home.querySelector(".portfolio-meta-footer")) {
            const meta = document.createElement("div")
            meta.className = "portfolio-meta-footer"
            meta.setAttribute("aria-label", "Site information")
            const clock = document.createElement("time")
            clock.setAttribute("aria-label", "Dhwani Shah local time")
            const copyright = document.createElement("span")
            copyright.textContent = "© 2025 Dhwani Shah"
            meta.append(clock, copyright)
            panels[0].parentElement.appendChild(meta)
            startLocalClock(clock)
        }
    }

    function normalizeSiteShell() {
        scheduled = false
        normalizeViewport()

        document.body.classList.toggle("site-home", isHomePath())
        document.documentElement.classList.toggle("site-home", isHomePath())

        const page = [...document.querySelectorAll("#main > div")].find(element => element.id !== "overlay")
        page?.classList.add("site-shell-page")

        document.querySelectorAll(".framer-7EQCV").forEach(navigation => {
            let shell = navigation.parentElement
            while (shell && shell.id !== "main" && getComputedStyle(shell).position !== "fixed") {
                shell = shell.parentElement
            }
            if (shell && shell.id !== "main") shell.classList.add("site-nav-shell")
        })
        ensureBlogLinks()

        document.querySelectorAll("a").forEach(link => {
            const label = link.textContent.trim().toLowerCase()
            if (label === "resume") {
                if (link.href !== resumeUrl) link.href = resumeUrl
                link.target = "_blank"
                link.rel = "noopener noreferrer"
            }
            if (label === "case studies" || label === "project" || label === "projects") {
                link.textContent = "Projects"
                link.href = "/#projects"
            }
        })

        const paperPlane = document.querySelector('video[src*="paper-plane-low-poly-3d-v7-hq.mp4"], video[src*="paper-plane-low-poly-3d-v6.mp4"], video[src*="paper-plane-low-poly-3d-v5.mp4"], video[src*="paper-plane-low-poly-3d-v4.mp4"], video[src*="paper-plane-low-poly-3d-v3.mp4"], video[src*="1OjbNDuyowRWI9iGPvfQ40L1qJY.mp4"], video[data-paper-plane-smooth]')
        if (paperPlane) {
            if (paperPlane.getAttribute("src") !== smoothPaperPlane) paperPlane.setAttribute("src", smoothPaperPlane)
            paperPlane.preload = "auto"
            paperPlane.dataset.paperPlaneSmooth = "60fps-low-poly-3d-v7-hq"
        }

        ensureAboutConnect()
        ensureHomeEnhancements()
    }

    function scheduleNormalization() {
        if (scheduled) return
        scheduled = true
        requestAnimationFrame(normalizeSiteShell)
    }

    function ensureBlogLinks() {
        document.querySelectorAll(".framer-7EQCV").forEach(navigation => {
            const links = [...navigation.querySelectorAll("a")]
            const about = links.find(link => link.textContent.trim().toLowerCase() === "about")
            if (!about) return

            const existing = links.find(link => link.textContent.trim().toLowerCase() === "blog")
            if (existing) {
                existing.href = blogUrl
                existing.target = "_blank"
                existing.rel = "noopener noreferrer"
                return
            }

            const aboutContainer = about.closest('[data-framer-component-type="RichTextContainer"]')
            if (!aboutContainer?.parentElement) return
            const blogContainer = aboutContainer.cloneNode(true)
            blogContainer.classList.add("site-blog-link")
            blogContainer.querySelectorAll("[id]").forEach(element => element.removeAttribute("id"))
            const blog = blogContainer.querySelector("a")
            if (!blog) return
            blog.textContent = "Blog"
            blog.href = blogUrl
            blog.target = "_blank"
            blog.rel = "noopener noreferrer"
            blog.removeAttribute("data-framer-page-link-current")
            aboutContainer.before(blogContainer)
        })
    }

    scheduleNormalization()
    document.addEventListener("pointerdown", primeProjectTransitionSound, { capture: true, passive: true })
    document.addEventListener("touchstart", primeProjectTransitionSound, { capture: true, passive: true })
    document.addEventListener("keydown", primeProjectTransitionSound, { capture: true, passive: true })
    document.addEventListener("wheel", primeProjectTransitionSound, { capture: true, passive: true })
    document.addEventListener("pointerdown", handleMobileMenuClose, true)
    document.addEventListener("pointerup", handleMobileMenuClose, true)
    document.addEventListener("click", handleMobileMenuClose, true)
    document.addEventListener("click", handleProjectLink, true)
    addEventListener("scroll", scheduleHomePanelSync, { passive: true })
    addEventListener("resize", scheduleHomePanelSync)
    addEventListener("hashchange", () => {
        projectHashHandled = false
        scheduleNormalization()
    })
    addEventListener("DOMContentLoaded", scheduleNormalization, { once: true })
    addEventListener("load", scheduleNormalization, { once: true })
    const viewport = document.querySelector('meta[name="viewport"]')
    if (viewport) new MutationObserver(normalizeViewport).observe(viewport, { attributes: true, attributeFilter: ["content"] })
    new MutationObserver(scheduleNormalization).observe(document.getElementById("main"), {
        attributes: true,
        attributeFilter: ["href", "class"],
        childList: true,
        characterData: true,
        subtree: true,
    })
})()
