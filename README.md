# Teambridge Automation

A modern, AI-powered automation builder built with React, TypeScript, and the [Alloy Design System](https://github.com/yizzy-gif/alloy-design-system).

---

## Prerequisites

Make sure you have the following installed before getting started:

| Tool | Version |
|---|---|
| [Node.js](https://nodejs.org) | v18 or higher |
| [npm](https://www.npmjs.com) | v9 or higher (comes with Node) |
| [Git](https://git-scm.com) | Any recent version |

---

## Getting Started

### 1. Clone this repository

```bash
git clone https://github.com/yizzy-gif/teambridge-automation.git
cd teambridge-automation
```

### 2. Install dependencies (includes Alloy Design System)

```bash
npm install
```

> **Note:** This project uses the [Alloy Design System](https://github.com/yizzy-gif/alloy-design-system) for all UI components, tokens, and styling. It is installed automatically from GitHub when you run `npm install` — no separate setup required.

### 3. Start the development server

```bash
npm run dev
```

The app will be available at **[http://localhost:5173](http://localhost:5173)**

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local development server at `localhost:5173` |
| `npm run build` | Type-check and build for production (outputs to `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the project |

---

## Project Structure

```
teambridge-automation/
├── src/
│   ├── layouts/
│   │   ├── AppShell.tsx          # Main layout — sidebar, top bar, page outlet
│   │   └── AppShell.module.css
│   ├── pages/
│   │   ├── AutomationsPage.tsx   # Automation list with search & filters
│   │   ├── BuilderPage.tsx       # Step-based flow builder + AI suggestions panel
│   │   ├── IntegrationsPage.tsx  # Connected apps marketplace
│   │   └── SettingsPage.tsx      # General, notifications & AI settings
│   ├── styles/
│   │   └── app.css               # Imports Alloy tokens, typography, and resets
│   ├── App.tsx                   # Route configuration (React Router v7)
│   └── main.tsx                  # App entry point
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.app.json
```

---

## Design System — Alloy

All UI is built on the **Alloy Design System**, a token-driven component library maintained in a separate repository.

- **GitHub:** [github.com/yizzy-gif/alloy-design-system](https://github.com/yizzy-gif/alloy-design-system)
- **Installed via:** `npm install` (GitHub dependency, no registry needed)

### What Alloy provides

- **Components** — Button, Tag, StatusTag, ToggleButton, Input fields, Charts, Table, and more
- **Design tokens** — CSS custom properties for colors, spacing, typography, radius, shadows, and animation
- **Icons** — 35+ SVG icon components
- **Typography** — Geist font via the `geist` npm package

### Import pattern

```ts
import { Button } from '@alloy/components/Button';
import { SearchIcon } from '@alloy/components/icons/SearchIcon';
import styles from '@/layouts/AppShell.module.css';
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Bundler | Vite 6 |
| Routing | React Router v7 |
| Styling | CSS Modules + Alloy design tokens |
| Class merging | clsx |
| Typography | Geist (via `geist` npm package) |

---

## Troubleshooting

**Styles look broken / Alloy components missing**
Make sure `npm install` completed without errors. The Alloy design system is fetched directly from GitHub — ensure you have internet access and that Git is installed.

**Port 5173 already in use**
Set a custom port via the `PORT` environment variable:
```bash
PORT=3000 npm run dev
```

**TypeScript errors after cloning**
Run `npm install` first — TypeScript needs the installed packages to resolve types correctly.
