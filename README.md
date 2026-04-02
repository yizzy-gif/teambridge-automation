# Teambridge Automation

A modern, AI-powered automation builder built with React, TypeScript, and the [Alloy Design System](https://github.com/yizzy-gif/alloy-design-system).

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue?style=flat-square&logo=github)](https://yizzy-gif.github.io/teambridge-automation/)
[![Deploy](https://img.shields.io/github/deployments/yizzy-gif/teambridge-automation/github-pages?label=Deploy&style=flat-square)](https://github.com/yizzy-gif/teambridge-automation/deployments)

**[→ View Live Demo](https://yizzy-gif.github.io/teambridge-automation/)**

---

## Features

| Surface | What it does |
|---|---|
| **Automations** | List all workflows in card or table view. Filter by status (active, paused, draft). Search by name, description, or tag. View per-automation run stats with a segmented progress bar. |
| **Flow Builder** | Build step-based automation flows visually. Add trigger, condition, action, and AI nodes. Configure each step in a right-side panel. Use the inline AI prompt below any selected node to generate or modify steps with natural language. |
| **Templates** | Browse pre-built automation templates by category. Filter by trigger type, tag, and keyword. Launch any template directly into the builder with steps pre-loaded. |
| **Integrations** | Connect external services — Slack, Gmail, Gusto, ADP, When I Work, BambooHR. Toggle connections per integration. |
| **Settings** | Configure run limits, timezone, notification behavior, and AI feature preferences. |

### AI Features

The flow builder includes an AI assistant powered by [Claude](https://claude.ai/). Select any node in the builder and use the inline prompt to describe what you want — the AI will suggest or modify steps automatically.

> **AI features require a `VITE_ANTHROPIC_API_KEY` environment variable.** Without it, the app loads and all other features work normally — only AI step generation is unavailable. See [Environment Variables](#environment-variables) below.

---

## Prerequisites

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

### 3. (Optional) Set up AI features

Create a `.env.local` file in the project root:

```
VITE_ANTHROPIC_API_KEY=your_key_here
```

Get an API key at [console.anthropic.com](https://console.anthropic.com). Without this key the app runs fully — AI step generation in the builder will show an error if triggered.

### 4. Start the development server

```bash
npm run dev
```

The app will be available at **[http://localhost:5173](http://localhost:5173)**

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_ANTHROPIC_API_KEY` | No | Anthropic API key. Enables AI step generation in the Flow Builder. App loads and works without it. |

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
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Pages auto-deploy on push to main
├── src/
│   ├── layouts/
│   │   ├── AppShell.tsx          # Main layout — sidebar, top bar, page outlet
│   │   └── AppShell.module.css
│   ├── pages/
│   │   ├── AutomationsPage.tsx   # Automation list with search & filters
│   │   ├── BuilderPage.tsx       # Step-based flow builder + inline AI prompt
│   │   ├── IntegrationsPage.tsx  # Connected apps marketplace
│   │   ├── TemplatesPage.tsx     # Pre-built automation templates
│   │   └── SettingsPage.tsx      # General, notifications & AI settings
│   ├── features/
│   │   └── ai/                   # Anthropic SDK client, tools, and system prompts
│   ├── styles/
│   │   └── app.css               # Imports Alloy tokens, typography, and resets
│   ├── App.tsx                   # Route configuration (React Router v7)
│   └── main.tsx                  # App entry point
├── public/
│   └── 404.html                  # SPA redirect for GitHub Pages deep links
├── index.html
├── package.json
├── vite.config.ts
└── CHANGELOG.md
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
| AI | Anthropic SDK (`claude-sonnet-4-6`) |

---

## Deployment

This project deploys automatically to GitHub Pages on every push to `main` via `.github/workflows/deploy.yml`. No manual steps required.

Live URL: **[https://yizzy-gif.github.io/teambridge-automation/](https://yizzy-gif.github.io/teambridge-automation/)**

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

**AI features not working**
Ensure `VITE_ANTHROPIC_API_KEY` is set in your `.env.local` file and that the key is valid at [console.anthropic.com](https://console.anthropic.com).
