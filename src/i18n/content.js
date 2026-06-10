export const meta = {
  name: 'Agustín Diego Jaime',
  firstName: 'Agustín',
  lastName: 'Jaime',
  handle: 'AgustinJaime99',
  avatar: 'https://avatars.githubusercontent.com/u/71357291?v=4',
  github: 'https://github.com/AgustinJaime99',
  linkedin: 'https://www.linkedin.com/in/agustin-diego-jaime-4033041b7/',
}

const skillGroups = (categories) => [
  { category: categories[0], items: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Shadcn/UI', 'Framer Motion'] },
  { category: categories[1], items: ['Node.js', 'NestJS', 'Express', 'REST APIs', 'WebSockets'] },
  { category: categories[2], items: ['PostgreSQL', 'MySQL', 'MongoDB', 'Prisma', 'TypeORM'] },
  { category: categories[3], items: ['Docker', 'Git', 'GitHub', 'Linux', 'Vercel'] },
  { category: categories[4], items: ['Clean Architecture', 'Hexagonal', 'DDD', 'SOLID', 'Design Patterns'] },
  { category: categories[5], items: ['AI Integrations', 'AI Assistants', 'Product Engineering'] },
]

const repos = {
  techAcademy: {
    repo: 'https://github.com/AgustinJaime99/Tech-Academy',
    live: 'https://tech-academy-fawn.vercel.app',
    images: [
      '/images/projects/tech-academy-1.png',
      '/images/projects/tech-academy-2.png',
      '/images/projects/tech-academy-3.png',
    ],
  },
  multiTenant: {
    repo: 'https://github.com/AgustinJaime99/multi-tenant-course',
    live: 'https://multi-tenant-course-web.vercel.app',
    images: [
      '/images/projects/multi-tenant-1.png',
      '/images/projects/multi-tenant-2.png',
      '/images/projects/multi-tenant-3.png',
      '/images/projects/multi-tenant-4.png',
      '/images/projects/multi-tenant-5.png',
      '/images/projects/multi-tenant-6.png',
    ],
  },
  chatApp: {
    repo: 'https://github.com/AgustinJaime99/chat-app',
    live: 'https://chat-app-rho-umber-15.vercel.app',
    images: [
      '/images/projects/chat-app-1.png',
      '/images/projects/chat-app-2.png',
      // '/images/projects/chat-app-3.png',
    ],
  },
  trello: {
    repo: 'https://github.com/AgustinJaime99/trello-clone-next-14',
    live: 'https://trello-clone-next-14.vercel.app',
    images: [
      '/images/projects/trello-clone-1.png',
      '/images/projects/trello-clone-2.png',
      '/images/projects/trello-clone-3.png',
      '/images/projects/trello-clone-4.png',
      '/images/projects/trello-clone-5.png',
    ],
  },
  weather: {
    repo: 'https://github.com/AgustinJaime99/weather-app',
    live: 'https://weather-app-c9-22.vercel.app',
    images: ['/images/projects/weather-app-1.png', '/images/projects/weather-app-2.png'],
  },
  twitter: {
    repo: 'https://github.com/AgustinJaime99/twdev-nextjs',
    live: null,
    images: [
      '/images/projects/twitter-clone-1.png',
      '/images/projects/twitter-clone-2.png',
      '/images/projects/twitter-clone-3.png',
      '/images/projects/twitter-clone-4.png',
    ],
  },
}

export const content = {
  es: {
    nav: {
      links: [
        { id: 'home', label: 'Inicio' },
        { id: 'about', label: 'Sobre mí' },
        { id: 'skills', label: 'Skills' },
        { id: 'experience', label: 'Experiencia' },
        { id: 'projects', label: 'Proyectos' },
        { id: 'contact', label: 'Contacto' },
      ],
      blog: 'Blog',
      cta: 'Hablemos',
    },
    hero: {
      badge: 'Disponible para proyectos remotos y freelance',
      greeting: 'Hola, soy',
      role: 'Full Stack Developer',
      tagline: 'Software Engineer · AI Enthusiast',
      intro:
        'Construyo aplicaciones web de extremo a extremo con foco en arquitecturas limpias, sistemas escalables y experiencias de usuario modernas. Transformo diseños de Figma en productos listos para producción.',
      viewProjects: 'Ver proyectos',
      contact: 'Contactar',
      scroll: 'Scroll',
    },
    about: {
      eyebrow: '01 — Sobre mí',
      titleStart: 'Resuelvo problemas complejos con ',
      titleHighlight: 'arquitecturas limpias',
      titleEnd: ' y sistemas escalables.',
      description:
        'Soy desarrollador Full Stack y Software Engineer. Disfruto construyendo productos mantenibles aplicando principios SOLID, DDD y arquitectura hexagonal, mientras aprendo y mejoro constantemente mi oficio. Always learning. Always building. Always improving.',
      whatIDoTitle: 'Lo que hago',
      whatIDo: [
        'Aplicaciones web end-to-end',
        'APIs y servicios backend escalables',
        'Arquitecturas de base de datos eficientes',
        'Aplicaciones en tiempo real con WebSockets',
        'Diseños de Figma a producción',
        'Integración de IA en productos',
      ],
      stats: [
        { value: '21+', label: 'Repositorios' },
        { value: '5+', label: 'Años programando' },
        { value: '15+', label: 'Proyectos full stack' },
      ],
    },
    skills: {
      eyebrow: '02 — Tech Stack',
      titleStart: 'Tecnologías que me ',
      titleHighlight: 'destacan',
      hint: 'toca o pasa el cursor sobre cada nodo para ver detalles',
      groups: skillGroups(['Frontend', 'Backend', 'Bases de datos & ORMs', 'DevOps & Tools', 'Ingeniería', 'IA & Automatización']),
    },
    experience: {
      eyebrow: '03 — Experiencia',
      titleStart: 'Lugares donde aporte mis ',
      titleHighlight: 'habilidades',
      hint: 'desliza para recorrer mi trayectoria',
      items: [
        {
          role: 'Fullstack Developer',
          company: 'Ingenes',
          period: 'Abr 2023 — Actual',
          summary:
            'Diseño y construcción de productos end-to-end: onboarding inteligente con scoring, APIs en NestJS, e-commerce interno y analítica.',
          highlights: [
            'Diseño e implementación de flujos de onboarding inteligentes con sistema de scoring que segmenta perfiles según objetivos de negocio, optimizando la conversión.',
            'Diseño y mantenimiento de endpoints API con NestJS y Node.js, integrando bases de datos con validaciones por roles para flujos de supervisión.',
            'Desarrollo de e-commerce interno con caché en cliente (SWR) y revalidación selectiva, mejorando tiempos de navegación bajo alta demanda.',
            'Reportes de analítica personalizados e integración de píxeles (META, GTAG, TikTok) para medir y optimizar campañas.',
            'Aplicación de Clean Code y Clean Architecture; mentoría técnica a developers Jr mediante revisión de PRs y acompañamiento en deploys.',
          ],
          tags: ['TypeScript', 'Next.js', 'NestJS', 'Node.js', 'Prisma', 'SWR', 'MySQL', 'Docker', 'Vercel'],
        },
        {
          role: 'Frontend Developer',
          company: 'B21',
          period: 'Ene 2022 — Mar 2023',
          summary:
            'Desarrollo del onboarding fintech para préstamos y seguimiento de su estado, traduciendo diseños de Figma a interfaces animadas.',
          highlights: [
            'Desarrollo del flujo de onboarding fintech para solicitud de préstamos personalizado según las necesidades del usuario.',
            'Integración con APIs REST junto al equipo de backend para garantizar consistencia de datos.',
            'Interfaz para el seguimiento del estado de préstamos otorgados por compañías financieras asociadas.',
            'Traducción de diseños de Figma a interfaces interactivas con animaciones fluidas mediante Framer Motion.',
          ],
          tags: ['TypeScript', 'Next.js', 'Framer Motion', 'Styled Components', 'AWS', 'Git'],
        },
        {
          role: 'Fullstack Developer',
          company: 'Proyecto Wow',
          period: 'Oct 2020 — Dic 2021',
          summary:
            'Plataforma de cursos online con foco en frontend y soporte fullstack en endpoints, autenticación y manejo de sesiones.',
          highlights: [
            'Desarrollo de plataforma de cursos online con foco en frontend y soporte fullstack en endpoints y autenticación.',
            'Integración de APIs REST y queries GraphQL; autenticación interna y manejo de sesiones.',
            'Trabajo colaborativo con equipos de UX/UI, frontend y backend, traduciendo diseños de Figma a componentes reutilizables.',
          ],
          tags: ['React', 'Next.js', 'JavaScript', 'GraphQL', 'Node.js', 'Git'],
        },
      ],
    },
    projects: {
      eyebrow: '04 — Proyectos',
      titleStart: 'Cosas que he ',
      titleHighlight: 'construido',
      featuredBadge: 'Proyecto destacado',
      othersTitle: 'Otros proyectos',
      viewDemo: 'Ver demo',
      code: 'Código',
      viewMore: 'Ver más en GitHub',
      items: [
        { ...repos.techAcademy, name: 'Tech Academy', featured: true, tags: ['Next.js 15', 'TypeScript', 'Tailwind v4', 'Shadcn/UI', 'Zustand'], description: 'Plataforma full-stack de cursos online para educación en electrónica e ingeniería. Bilingüe (ES/EN), dashboard protegido, catálogo con búsqueda/filtros, command palette y SEO completo.' },
        { ...repos.multiTenant, name: 'Multi-Tenant Course', featured: true, tags: ['NestJS', 'Prisma', 'Next.js 15', 'Monorepo'], description: 'Plataforma white-label de cursos online. Monorepo con NestJS + Prisma (API) y Next.js 15 + Tailwind (web). Pagos multi-proveedor, certificados PDF y seguimiento de progreso.' },
        { ...repos.chatApp, name: 'Chat App', featured: true, tags: ['Next.js', 'NestJS', 'MySQL', 'WebSockets'], description: 'Aplicación de chat en tiempo real. Monorepo con Next.js en el frontend, NestJS como backend y MySQL como base de datos, comunicación vía WebSockets.' },
        { ...repos.trello, name: 'Trello Clone', featured: false, tags: ['Next.js 14', 'TypeScript', 'DnD'], description: 'Clon completo de Trello construido con Next.js 14, con tableros, listas y tarjetas con drag & drop.' },
        { ...repos.weather, name: 'Weather App', featured: false, tags: ['TypeScript', 'API REST'], description: 'Aplicación del clima con datos en tiempo real, búsqueda por ciudad y pronóstico construida con TypeScript.' },
        { ...repos.twitter, name: 'Twitter Dev Clone', featured: false, tags: ['Next.js', 'JavaScript'], description: 'Clon de Twitter desarrollado con Next.js explorando autenticación, feeds y publicaciones en tiempo real.' },
      ],
    },
    contact: {
      eyebrow: '05 — Contacto',
      titleStart: '¿Construimos algo ',
      titleHighlight: 'juntos',
      titleEnd: '?',
      description:
        'Estoy abierto a oportunidades remotas, proyectos freelance y colaboraciones. Si tienes una idea o un proyecto en mente, hablemos.',
      sendMessage: 'Enviar mensaje',
      links: [
        { key: 'github', label: 'GitHub', value: '@AgustinJaime99' },
        { key: 'linkedin', label: 'LinkedIn', value: 'Agustín Diego Jaime' },
      ],
    },
    footer: {
      built: 'Construido con React · Three.js · Framer Motion · GSAP',
    },
  },

  en: {
    nav: {
      links: [
        { id: 'home', label: 'Home' },
        { id: 'about', label: 'About' },
        { id: 'skills', label: 'Skills' },
        { id: 'experience', label: 'Experience' },
        { id: 'projects', label: 'Projects' },
        { id: 'contact', label: 'Contact' },
      ],
      blog: 'Blog',
      cta: "Let's talk",
    },
    hero: {
      badge: 'Available for remote & freelance projects',
      greeting: "Hi, I'm",
      role: 'Full Stack Developer',
      tagline: 'Software Engineer · AI Enthusiast',
      intro:
        'I build end-to-end web applications with a focus on clean architecture, scalable systems and modern user experiences. I turn Figma designs into production-ready products.',
      viewProjects: 'View projects',
      contact: 'Contact',
      scroll: 'Scroll',
    },
    about: {
      eyebrow: '01 — About me',
      titleStart: 'I solve complex problems with ',
      titleHighlight: 'clean architecture',
      titleEnd: ' and scalable systems.',
      description:
        'I am a Full Stack Developer and Software Engineer. I enjoy building maintainable products applying SOLID principles, DDD and hexagonal architecture, while constantly learning and improving my craft. Always learning. Always building. Always improving.',
      whatIDoTitle: 'What I do',
      whatIDo: [
        'End-to-end web applications',
        'Scalable backend services and APIs',
        'Efficient database architectures',
        'Real-time apps with WebSockets',
        'Figma designs to production',
        'AI integration into products',
      ],
      stats: [
        { value: '21+', label: 'Repositories' },
        { value: '5+', label: 'Years coding' },
        { value: '15+', label: 'Full stack projects' },
      ],
    },
    skills: {
      eyebrow: '02 — Tech Stack',
      titleStart: 'Technologies I ',
      titleHighlight: 'build with',
      hint: 'tap or hover over each node to see details',
      groups: skillGroups(['Frontend', 'Backend', 'Databases & ORMs', 'DevOps & Tools', 'Engineering', 'AI & Automation']),
    },
    experience: {
      eyebrow: '03 — Experience',
      titleStart: 'Places where I share my ',
      titleHighlight: 'knowledge',
      hint: 'swipe to walk through my journey',
      items: [
        {
          role: 'Fullstack Developer',
          company: 'Ingenes',
          period: 'Apr 2023 — Present',
          summary:
            'Designing and building end-to-end products: intelligent onboarding with scoring, NestJS APIs, an internal e-commerce and analytics.',
          highlights: [
            'Designed and implemented intelligent onboarding flows with a scoring system that segments profiles by business goals, optimizing conversion.',
            'Designed and maintained API endpoints with NestJS and Node.js, integrating databases with role-based validations for supervision flows.',
            'Built an internal e-commerce with client-side caching (SWR) and selective revalidation, improving navigation times under high demand.',
            'Custom analytics reports and pixel integration (META, GTAG, TikTok) to measure and optimize marketing campaigns.',
            'Applied Clean Code and Clean Architecture; technical mentoring of Jr developers through PR reviews and deploy support.',
          ],
          tags: ['TypeScript', 'Next.js', 'NestJS', 'Node.js', 'Prisma', 'SWR', 'MySQL', 'Docker', 'Vercel'],
        },
        {
          role: 'Frontend Developer',
          company: 'B21',
          period: 'Jan 2022 — Mar 2023',
          summary:
            'Built the fintech loan onboarding and status tracking, turning Figma designs into animated, interactive interfaces.',
          highlights: [
            'Developed the fintech onboarding flow for loan applications, personalized to user needs.',
            'Integrated REST APIs together with the backend team to guarantee data consistency.',
            'Interface to track the status of loans granted by partner financial companies.',
            'Translated Figma designs into interactive interfaces with smooth animations using Framer Motion.',
          ],
          tags: ['TypeScript', 'Next.js', 'Framer Motion', 'Styled Components', 'AWS', 'Git'],
        },
        {
          role: 'Fullstack Developer',
          company: 'Proyecto Wow',
          period: 'Oct 2020 — Dec 2021',
          summary:
            'Online course platform with a frontend focus and fullstack support on endpoints, authentication and session handling.',
          highlights: [
            'Developed an online course platform with a frontend focus and fullstack support on endpoints and authentication.',
            'Integrated REST APIs and GraphQL queries; internal authentication and session handling.',
            'Collaborated with UX/UI, frontend and backend teams, turning Figma designs into reusable components.',
          ],
          tags: ['React', 'Next.js', 'JavaScript', 'GraphQL', 'Node.js', 'Git'],
        },
      ],
    },
    projects: {
      eyebrow: '04 — Projects',
      titleStart: 'Things I have ',
      titleHighlight: 'built',
      featuredBadge: 'Featured project',
      othersTitle: 'Other projects',
      viewDemo: 'Live demo',
      code: 'Code',
      viewMore: 'See more on GitHub',
      items: [
        { ...repos.techAcademy, name: 'Tech Academy', featured: true, tags: ['Next.js 15', 'TypeScript', 'Tailwind v4', 'Shadcn/UI', 'Zustand'], description: 'Full-stack online course platform for electronics & engineering education. Bilingual (ES/EN), protected dashboard, catalog with search/filters, command palette and full SEO.' },
        { ...repos.multiTenant, name: 'Multi-Tenant Course', featured: true, tags: ['NestJS', 'Prisma', 'Next.js 15', 'Monorepo'], description: 'White-label online course platform. Monorepo with NestJS + Prisma (API) and Next.js 15 + Tailwind (web). Multi-provider payments, PDF certificates and progress tracking.' },
        { ...repos.chatApp, name: 'Chat App', featured: true, tags: ['Next.js', 'NestJS', 'MySQL', 'WebSockets'], description: 'Real-time chat application. Monorepo with Next.js on the frontend, NestJS as backend and MySQL as database, communicating via WebSockets.' },
        { ...repos.trello, name: 'Trello Clone', featured: false, tags: ['Next.js 14', 'TypeScript', 'DnD'], description: 'Full Trello clone built with Next.js 14, featuring boards, lists and cards with drag & drop.' },
        { ...repos.weather, name: 'Weather App', featured: false, tags: ['TypeScript', 'REST API'], description: 'Weather app with real-time data, city search and forecast built with TypeScript.' },
        { ...repos.twitter, name: 'Twitter Dev Clone', featured: false, tags: ['Next.js', 'JavaScript'], description: 'Twitter clone developed with Next.js exploring authentication, feeds and real-time posts.' },
      ],
    },
    contact: {
      eyebrow: '05 — Contact',
      titleStart: "Shall we build something ",
      titleHighlight: 'together',
      titleEnd: '?',
      description:
        "I'm open to remote opportunities, freelance projects and collaborations. If you have an idea or a project in mind, let's talk.",
      sendMessage: 'Send message',
      links: [
        { key: 'github', label: 'GitHub', value: '@AgustinJaime99' },
        { key: 'linkedin', label: 'LinkedIn', value: 'Agustín Diego Jaime' },
      ],
    },
    footer: {
      built: 'Built with React · Three.js · Framer Motion · GSAP',
    },
  },
}
