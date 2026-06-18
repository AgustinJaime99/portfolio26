export const profile = {
  name: 'Agustín Diego Jaime',
  handle: 'AgustinJaime99',
  role: 'Full Stack Developer',
  tagline: 'Software Engineer · AI Enthusiast',
  avatar: 'https://avatars.githubusercontent.com/u/71357291?v=4',
  github: 'https://github.com/AgustinJaime99',
  linkedin: 'https://www.linkedin.com/in/agustin-diego-jaime-4033041b7/',
  intro:
    'Construyo aplicaciones web de extremo a extremo con foco en arquitecturas limpias, sistemas escalables y experiencias de usuario modernas. Transformo diseños de Figma en productos listos para producción.',
  stats: [
    { label: 'Repositorios', value: '21+' },
    { label: 'Años programando', value: '5+' },
    { label: 'Proyectos full stack', value: '15+' },
  ],
  whatIDo: [
    'Aplicaciones web end-to-end',
    'APIs y servicios backend escalables',
    'Arquitecturas de base de datos eficientes',
    'Aplicaciones en tiempo real con WebSockets',
    'Diseños de Figma a producción',
    'Integración de IA en productos',
  ],
}

export const skills = [
  {
    category: 'Frontend',
    items: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Shadcn/UI', 'Framer Motion'],
  },
  {
    category: 'Backend',
    items: ['Node.js', 'NestJS', 'Express', 'REST APIs', 'WebSockets', 'Kafka'],
  },
  {
    category: 'Databases & ORMs',
    items: ['PostgreSQL', 'MySQL', 'MongoDB', 'Prisma', 'TypeORM'],
  },
  {
    category: 'DevOps & Tools',
    items: ['Docker', 'Git', 'GitHub', 'Linux', 'Vercel'],
  },
  {
    category: 'Engineering',
    items: ['Clean Architecture', 'Hexagonal', 'DDD', 'SOLID', 'Design Patterns'],
  },
  {
    category: 'AI & Automation',
    items: ['AI Integrations', 'AI Assistants', 'Product Engineering'],
  },
]

export const projects = [
  {
    name: 'Tech Academy',
    description:
      'Plataforma full-stack de cursos online para educación en electrónica e ingeniería. Bilingüe (ES/EN), dashboard protegido, catálogo con búsqueda/filtros, command palette y SEO completo.',
    tags: ['Next.js 15', 'TypeScript', 'Tailwind v4', 'Shadcn/UI', 'Zustand'],
    repo: 'https://github.com/AgustinJaime99/Tech-Academy',
    live: 'https://tech-academy-fawn.vercel.app',
    featured: true,
  },
  {
    name: 'Multi-Tenant Course',
    description:
      'Plataforma white-label de cursos online. Monorepo con NestJS + Prisma (API) y Next.js 15 + Tailwind (web). Pagos multi-proveedor, certificados PDF y seguimiento de progreso.',
    tags: ['NestJS', 'Prisma', 'Next.js 15', 'Monorepo'],
    repo: 'https://github.com/AgustinJaime99/multi-tenant-course',
    live: 'https://multi-tenant-course-web.vercel.app',
    featured: true,
  },
  {
    name: 'Chat App',
    description:
      'Aplicación de chat en tiempo real. Monorepo con Next.js en el frontend, NestJS como backend y MySQL como base de datos, comunicación vía WebSockets.',
    tags: ['Next.js', 'NestJS', 'MySQL', 'WebSockets'],
    repo: 'https://github.com/AgustinJaime99/chat-app',
    live: 'https://chat-app-rho-umber-15.vercel.app',
    featured: true,
  },
  {
    name: 'Trello Clone',
    description:
      'Clon completo de Trello construido con Next.js 14, con tableros, listas y tarjetas con drag & drop.',
    tags: ['Next.js 14', 'TypeScript', 'DnD'],
    repo: 'https://github.com/AgustinJaime99/trello-clone-next-14',
    live: 'https://trello-clone-next-14.vercel.app',
    featured: false,
  },
  {
    name: 'Weather App',
    description:
      'Aplicación del clima con datos en tiempo real, búsqueda por ciudad y pronóstico construida con TypeScript.',
    tags: ['TypeScript', 'API REST'],
    repo: 'https://github.com/AgustinJaime99/weather-app',
    live: 'https://weather-app-c9-22.vercel.app',
    featured: false,
  },
  {
    name: 'Twitter Dev Clone',
    description:
      'Clon de Twitter desarrollado con Next.js explorando autenticación, feeds y publicaciones en tiempo real.',
    tags: ['Next.js', 'JavaScript'],
    repo: 'https://github.com/AgustinJaime99/twdev-nextjs',
    live: null,
    featured: false,
  },
]

export const navLinks = [
  { id: 'home', label: 'Inicio' },
  { id: 'about', label: 'Sobre mí' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Proyectos' },
  { id: 'contact', label: 'Contacto' },
]
