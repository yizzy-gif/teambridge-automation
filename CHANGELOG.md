# Changelog

All notable changes to Teambridge Automation are documented in this file.

---

## [0.2.0] — 2026-04-02

### Features

- **Inline AI prompt panel** — the AI input field now floats directly below the selected flow node in the builder canvas, replacing the right-panel interaction model. Select any node and type a natural-language instruction to generate or modify steps in-place.
- **AILoader spinner** — the send button shows a loading indicator while an AI request is in-flight.
- **Boolean controller for condition nodes** — condition nodes now expose a true/false toggle in the configuration panel.
- **Workflow settings panel** — name, description, and tags can be edited from a settings panel in the builder; values persist to `localStorage`.

### Fixes

- Wrapped long error text in the AI result banner to prevent layout overflow.
- Switched the floating AI input gap calculation to use the node's measured DOM height — consistent positioning across all node types regardless of content.
- Widened the floating AI input to 296 px for better readability.
- Aligned the floating AI input visual style to match the right-panel AI form exactly.
- Iterative gap refinements between the floating input and its anchor node (settled at `NODE_H + 8px`).

---

## [0.1.1] — 2026-03-30

### Features

- Moved AI prompt inline below the selected node (initial version with `AILoader` on send).
- UI polish across the builder canvas and automations list.

---

## [0.1.0] — 2026-03-22

### Initial release

- React 19 + TypeScript + Vite 6 project scaffolding.
- **Alloy Design System** integrated — all components, tokens, icons, and Geist typography.
- **Automations page** — card and table view modes, search bar, status filter tabs (All, Active, Paused, Draft), aggregate metric cards (total runs, people reached, completion rate).
- **Flow Builder** — vertical step canvas with trigger, condition, action, and AI node types connected by arrows. Right-side configuration panel. Steps can be added from a left-side node library.
- **Templates page** — pre-built automation templates organized by category, with keyword search and tag filters. Click any template to launch the builder with steps pre-loaded.
- **Integrations page** — marketplace for Slack, Gmail, Gusto, ADP, When I Work, and BambooHR with connect/disconnect toggles.
- **Settings page** — General (run limits, timezone), Notifications (alerts, digest), and AI Features (model selection, auto-name toggle) sections.
- **AI integration** — `callFlowAgent` wired to `claude-sonnet-4-6` via the Anthropic SDK for natural-language step generation directly in the builder.
- `AppShell` sidebar navigation layout with primary and secondary nav items.
