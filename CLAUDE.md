# Automation 2.0 — Claude Code Rules

This is the **Teambridge Automation** product — a restructured, reskinned automation tool with new AI feature integrations. It consumes the **Alloy** design system from the sibling `../Alloy/` directory.

---

## Project Overview

- **Framework:** React + TypeScript
- **Bundler:** Vite
- **Styling:** CSS Modules + Alloy design tokens (CSS custom properties)
- **Routing:** React Router v7
- **Fonts:** Geist (via `geist` npm package, imported through Alloy)
- **Dev command:** `npm run dev`
- **Build command:** `npm run build`

---

## Project Structure

```
Automation_2.0/
├── src/
│   ├── layouts/
│   │   ├── AppShell.tsx          # Main shell — sidebar nav + top bar + <Outlet>
│   │   └── AppShell.module.css
│   ├── pages/
│   │   ├── AutomationsPage.tsx   # Automation list with search/filter
│   │   ├── BuilderPage.tsx       # Flow builder + AI suggestions panel
│   │   ├── IntegrationsPage.tsx  # Connected apps marketplace
│   │   └── SettingsPage.tsx      # General, notifications, AI feature settings
│   ├── components/               # Shared app-specific components (not Alloy)
│   ├── features/                 # Feature modules (to be expanded)
│   │   ├── automations/          # Automation domain logic
│   │   ├── ai/                   # AI integration layer
│   │   └── integrations/         # Integration connectors
│   ├── styles/
│   │   └── app.css               # Imports Alloy tokens.css + typography.css + resets
│   ├── App.tsx                   # Router configuration
│   └── main.tsx                  # Entry point
├── index.html
├── package.json
├── vite.config.ts                # Path aliases: @alloy → ../Alloy/src, @ → src
├── tsconfig.app.json
└── CLAUDE.md
```

---

## Path Aliases

| Alias | Resolves to |
|---|---|
| `@alloy/*` | `../Alloy/src/*` |
| `@/*` | `src/*` |

Use these in all imports:
```ts
import { Button } from '@alloy/components/Button';
import styles from '@/layouts/AppShell.module.css';
```

---

## Design System — Alloy

All styling MUST use Alloy design tokens. **Never hardcode colors, sizes, shadows, or spacing.**

### Key token namespaces
```css
--color-bg-primary/secondary/tertiary        /* Surfaces */
--color-content-primary/secondary/tertiary   /* Text/icons */
--color-border-opaque/transparent/focus      /* Strokes */
--color-success/warning/error/info-*         /* Status */
--color-bg-inverse-primary                   /* Dark fill for primary buttons */
--color-content-inverse-primary              /* White text on dark fills */
--space-{0–24}                               /* 4px base spacing scale */
--text-{xs|sm|base|lg|xl|2xl}               /* Font sizes */
--font-weight-{regular|medium|semibold|bold} */
--radius-{xs|sm|md|lg|xl|2xl|full}          /* Border radius */
--shadow-{below|above}-{low|md|high}         /* Elevation */
--duration-{fast|base|slow} --ease-{default|in|out}
```

### Existing Alloy components
Import from `@alloy/components/ComponentName`:
- `Button` — primary, secondary, ghost, destructive variants
- `Tag` — labeling
- `StatusTag` — status display
- `ToggleButton` — toggle states
- Icons in `@alloy/components/icons/`

---

## Component Conventions

- Use CSS Modules (`.module.css`) for all component styles
- All components must accept and spread a `className` prop
- Use `forwardRef` for all interactive/HTML-wrapping components
- Conditional classes: use `clsx` (already installed)
- No Tailwind — Alloy is the styling system
- State styling via `data-*` attributes (e.g. `data-loading`, `data-disabled`)

---

## Feature Architecture

### Automations (core)
The automation list (`AutomationsPage`) and builder (`BuilderPage`) are the primary surfaces.

**Builder** is a step-based flow builder:
- Steps: `trigger` | `condition` | `action` | `ai`
- Steps are rendered as a vertical list of cards connected by arrows
- Each step has a type-specific accent color using semantic tokens
- The AI sidebar panel sends a natural-language description to the AI API and generates step suggestions

**AI features to build out:**
- `features/ai/` — API client for AI step generation, name suggestion, error explanation
- Wire `BuilderPage` AI panel to `claude-sonnet-4-6` via the Anthropic SDK
- AI step type renders AI-generated content inline in the flow

### Integrations
- Each integration card shows connection status and a connect/disconnect toggle
- `features/integrations/` will hold OAuth flow handlers and integration configs

### Settings
- General, Notifications, AI Features sections
- Toggle and select controls are implemented inline — extract to `components/` if reused

---

## Figma MCP Workflow

When implementing a Figma design in this project:

1. Run `get_design_context` with the node ID
2. Run `get_screenshot` for visual reference
3. Map ALL Figma values to Alloy tokens (never hardcode)
4. Implement using CSS Modules + CSS custom properties
5. Reuse existing page/layout structure; only add new components when necessary

---

## What Never to Do

- Never hardcode hex colors, pixel sizes, or shadow values — use Alloy tokens
- Never use Tailwind
- Never use inline `style={{}}` for design values (only for dynamic/computed values)
- Never install external icon packages — add icons to `@alloy/components/icons/`
- Never skip TypeScript types on component props
