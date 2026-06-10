import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import About from '../components/About'
import Skills from '../components/Skills'
import Projects from '../components/Projects'
import Contact from '../components/Contact'

// The single-page portfolio. Section anchors (#about, #skills...) still work
// within this route.
export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="relative">
        <Hero />
        <div className="relative bg-ink">
          <About />
          <Skills />
          <Projects />
          <Contact />
        </div>
      </main>
    </>
  )
}
