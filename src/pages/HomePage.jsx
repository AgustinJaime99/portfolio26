import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import About from '../components/About'
import Skills from '../components/Skills'
import Experience from '../components/Experience'
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
          <Experience />
          <Projects />
          <Contact />
        </div>
      </main>
    </>
  )
}
