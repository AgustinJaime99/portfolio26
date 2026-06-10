# Portfolio

Bienvenidos a mi portfolio personal, aqui encontraran que tecnologias utilice y el modo de arranque para correrlo de forma local ;)

## Stack

- **React 18** + **Vite**
- **Three.js** (`@react-three/fiber`, `@react-three/drei`) — fondo 3D interactivo
- **Framer Motion** — animaciones de UI y reveal on-scroll
- **GSAP** + **ScrollTrigger** — sincronización de scroll
- **Lenis** — smooth scrolling
- **Tailwind CSS** — estilos
- **Lucide React** — iconos

## Desarrollo

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Build de producción

```bash
npm run build
npm run preview
```

## Estructura

```
src/
├── components/   # Navbar, Hero, About, Skills, Projects, Contact, Footer, Scene3D
├── hooks/        # useLenis (smooth scroll + GSAP ticker)
├── data/         # profile.js (datos e info de proyectos)
├── App.jsx
└── main.jsx
```

La información del perfil y los proyectos se obtiene del GitHub de [@AgustinJaime99](https://github.com/AgustinJaime99) y se centraliza en `src/data/profile.js`.
