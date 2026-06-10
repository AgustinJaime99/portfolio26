import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useLenis } from './hooks/useLenis'
import { LanguageProvider } from './i18n/LanguageContext'
import ScrollProgress from './components/ScrollProgress'
import ScrollToHash from './components/ScrollToHash'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import Blog from './components/Blog'
import BlogPost from './components/BlogPost'

export default function App() {
  useLenis()

  return (
    <BrowserRouter>
      <LanguageProvider>
        <ScrollProgress />
        <ScrollToHash />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </LanguageProvider>
    </BrowserRouter>
  )
}
