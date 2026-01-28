# Agentic HR — 3D Portfolio Website

A cinematic WebGL marketing site for Agentic HR, built with React Three Fiber.

## Quick Start

```bash
cd website
npm install
npm run dev
```

Then open http://localhost:5173

## Tech Stack

- **React 18** + **Vite** — Fast development
- **React Three Fiber** — 3D rendering
- **@react-three/drei** — Useful R3F helpers
- **@react-three/postprocessing** — Visual effects
- **GSAP** — Animation
- **Zustand** — State management
- **Lenis** — Smooth scroll

## Project Structure

```
src/
├── components/
│   ├── Experience.jsx      # Main 3D canvas
│   ├── objects/            # 3D agent metaphors
│   └── ui/                 # HTML overlays
├── hooks/                  # Custom React hooks
├── stores/                 # Zustand state
└── styles/                 # CSS design system
```

## 3D Scenes (Agent Metaphors)

| Scene | Agent | Visual |
|-------|-------|--------|
| The Void | Hero | Crystalline monolith |
| Scanner | resume_screener.py | Prism splitting particles |
| Pulse | voice_caller.py | Expanding sonar rings |
| Time Rings | calendar_agent.py | Rotating slot rings |
| Dialogue | interview_agent.py | Two geometric entities |
| Analyzer | transcript_scorer_agent.py | Spinning analysis torus |
| Seal | offer_letter_agent.py | Materializing token |

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

## Performance

- Target: 60fps desktop
- Post-processing: Bloom, Vignette, Grain, Chromatic Aberration
- Mobile: Graceful 2D fallback

## Deploy

Build and deploy to Vercel or Netlify:

```bash
npm run build
# Deploy dist/ folder
```
