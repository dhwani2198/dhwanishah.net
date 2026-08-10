(() => {
    const resumeUrl = "https://drive.google.com/file/d/1qJUonR6c54pHj2duCbeAAI5cCLDiY3mS/view?usp=sharing"
    const connectText = "LET'S CONNECT"
    const flapAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890.,!?"
    const referenceFlapSounds = [1, 2, 3, 4].map(index => `https://www.chloeyan.me/sounds/sound${index}.mp3`)
    const smoothPaperPlane = "/assets/assets/paper-plane-low-poly-3d-v7-hq.mp4"
    const homePanelNames = ["tally section", "sprint x section", "curalink section", "Arch portfolio section"]
    const observedHomePanels = new WeakSet()
    const homePanelVisibility = new WeakMap()
    const revealedMobileHomePanels = new Set()
    let flapSoundPool
    let lastFlapSoundAt = 0
    let scheduled = false
    let projectHashHandled = false
    let projectScrollTimer

    function isHomePath(pathname = location.pathname) {
        return pathname === "/" || pathname === "/index.html"
    }

    function scrollToProjects(updateHash = true) {
        const projects = document.getElementById("projects")
        if (!projects) return false

        let top = 0
        for (let element = projects; element; element = element.offsetParent) top += element.offsetTop
        top = Math.max(0, top)
        const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
        const root = document.documentElement
        clearTimeout(projectScrollTimer)
        root.classList.toggle("project-scroll-in-flight", behavior === "smooth")
        try {
            window.scrollTo({ top, left: 0, behavior })
        } catch {
            window.scrollTo(0, top)
        }
        if (behavior === "smooth") {
            projectScrollTimer = setTimeout(() => {
                root.classList.remove("project-scroll-in-flight")
                if (Math.abs(window.scrollY - top) > 1) window.scrollTo({ top, left: 0, behavior: "auto" })
            }, 700)
        } else {
            root.classList.remove("project-scroll-in-flight")
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

    const homePanelObserver = new IntersectionObserver(entries => {
        const keepRevealed = matchMedia("(max-width: 809.98px)").matches
        for (const entry of entries) {
            homePanelVisibility.set(entry.target, entry.intersectionRatio)
            const isActive = entry.isIntersecting && entry.intersectionRatio >= .12
            if (keepRevealed) {
                if (isActive) {
                    revealedMobileHomePanels.add(entry.target.id)
                    entry.target.dataset.projectRevealed = "true"
                    entry.target.classList.add("is-active")
                }
            } else {
                entry.target.classList.toggle("is-active", isActive)
            }
        }
        const panels = [...document.querySelectorAll(".project-scroll-panel")]
        if (!panels.length) return
        const activePanel = panels.reduce((best, panel) =>
            (homePanelVisibility.get(panel) || 0) > (homePanelVisibility.get(best) || 0) ? panel : best
        , panels[0])
        const activeIndex = panels.indexOf(activePanel)
        const activeRatio = homePanelVisibility.get(activePanel) || 0
        const progress = document.querySelector(".project-progress")
        progress?.classList.toggle("is-visible", activeRatio >= .12)
        progress?.querySelectorAll("a").forEach((dot, index) => {
            const isActive = activeRatio >= .12 && index === activeIndex
            dot.classList.toggle("is-active", isActive)
            if (isActive) dot.setAttribute("aria-current", "true")
            else dot.removeAttribute("aria-current")
        })
    }, { threshold: [.05, .12, .35, .7], rootMargin: "-4% 0px -4%" })

    function playFlapSound() {
        const now = performance.now()
        if (now - lastFlapSoundAt < 65) return
        lastFlapSoundAt = now
        flapSoundPool ||= referenceFlapSounds.map(source => {
            const audio = new Audio(source)
            audio.preload = "auto"
            audio.volume = .12
            return audio
        })
        const source = flapSoundPool[Math.floor(Math.random() * flapSoundPool.length)]
        const sound = source.cloneNode()
        sound.volume = .12
        sound.playbackRate = .96 + Math.random() * .08
        sound.play().catch(() => {})
    }

    function ensureHomeFlapSound(home) {
        home.querySelectorAll(".framer-14c1xbw-container, .framer-rmunsi-container").forEach(container => {
            if (container.dataset.flapSoundReady) return
            container.dataset.flapSoundReady = "true"
            container.dataset.flapSoundSource = "chloeyan-ferry"
            new MutationObserver(() => {
                if (container.isConnected && getComputedStyle(container).display !== "none") playFlapSound()
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
        const animated = [...flaps.children].filter(flap => !flap.classList.contains("is-space"))
        const timer = setInterval(() => {
            animated.forEach(flap => {
                flap.classList.remove("is-flipping")
                void flap.offsetWidth
                flap.classList.add("is-flipping")
                flap.textContent = flapAlphabet[Math.floor(Math.random() * flapAlphabet.length)]
            })
            playFlapSound()
        }, 50)
        setTimeout(() => {
            clearInterval(timer)
            animated.forEach(flap => {
                flap.textContent = flap.dataset.final
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
            if (revealedMobileHomePanels.has(panel.id)) {
                panel.dataset.projectRevealed = "true"
                panel.classList.add("is-active")
            }
            if (!observedHomePanels.has(panel)) {
                observedHomePanels.add(panel)
                homePanelObserver.observe(panel)
            }
        })

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

    scheduleNormalization()
    document.addEventListener("click", handleProjectLink, true)
    addEventListener("hashchange", () => {
        projectHashHandled = false
        scheduleNormalization()
    })
    addEventListener("DOMContentLoaded", scheduleNormalization, { once: true })
    addEventListener("load", scheduleNormalization, { once: true })
    new MutationObserver(scheduleNormalization).observe(document.getElementById("main"), {
        attributes: true,
        attributeFilter: ["href", "class"],
        childList: true,
        characterData: true,
        subtree: true,
    })
})()
