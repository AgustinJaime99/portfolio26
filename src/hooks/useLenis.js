import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    lenis.on('scroll', ScrollTrigger.update)

    const raf = (time) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    // Anchor links go through Lenis
    const handleClick = (e) => {
      const anchor = e.target.closest('a[href^="#"]')
      if (!anchor) return
      const id = anchor.getAttribute('href')
      if (id && id.length > 1) {
        e.preventDefault()
        const target = document.querySelector(id)
        if (target) lenis.scrollTo(target, { offset: -10 })
      }
    }
    document.addEventListener('click', handleClick)

    return () => {
      gsap.ticker.remove(raf)
      document.removeEventListener('click', handleClick)
      lenis.destroy()
    }
  }, [])
}
