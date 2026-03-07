# Skills Implementation Tab - Feature Specification

## Overview

Add a third tab called **"Skills Implementation"** to the Skills Navigator app.
This tab provides an operational table view of all skills that have been implemented
via the webhook sync from iconsaiConfig.

Currently the app has 2 tabs:
- **Ciclo de Vida** (lifecycle timeline)
- **Catalogo Completo** (full card catalog)

The new tab sits after these two.

---

## Tab Name

```
"Skills Implementation"
```

Route: handled client-side (same as existing tabs, using state toggle in Navigation.tsx)

---

## Table Columns

| Column | Description | Behavior |
|--------|-------------|----------|
| **Name** | Skill display name + category icon | Click opens detail modal |
| **Route** | `/skill-{slug}` | Copy icon on the right side |
| **Date** | Implementation date | Relative format ("2d ago", "1w ago"). Full date on hover. Expandable version timeline |
| **Tips** | Short hint (2-4 words max) | Truncated from full tips field |
| **Status** | `new` or `active` | Cyan badge with pulse dot for "new" (< 1 week old) |
| **Version** | Current semver | e.g. "v1.0.0" |
| **Phase** | Lifecycle phase badge | e.g. "1. Setup", "8. Deploy" |

---

## Features

### Search
- Text input at the top
- Filters by: skill name, slug, tips text

### Quick Filter Chips
- Horizontal row of buttons: All, Setup, Design, Backend, AI, Quality, Analytics, Deploy
- Filters by `implementation_type`
- Active chip gets cyan highlight

### Column Sorting
- Sortable columns: Name, Route, Date, Status, Version, Phase
- Click header to toggle asc/desc
- Arrow indicator on active sort column
- Default sort: Date descending (newest first)

### Copy Route
- Each row has a copy icon next to the route
- Click copies `/skill-{slug}` to clipboard
- Shows green checkmark for 2 seconds after copying

### Detail Modal
- Opens when clicking the skill name
- Shows all metadata: type, category, phase, version, status, repository, author, tips, main function, source paths
- **Modal header (skill name) is a link** that navigates to the Skill Cards tab with neon glow highlight on that card
- Close with ESC key or clicking overlay

### Relative Dates
- "just now", "5m ago", "2h ago", "3d ago", "1w ago", "2mo ago"
- Full date shown on hover tooltip (dd/mm/yyyy format)

### Version Timeline (future enhancement)
- Expandable row showing version history
- Each version entry: version number, date, changelog summary

---

## Mobile Layout

On screens < 1024px, the table converts to a card layout:
- Skill name + status badge at top
- Route with copy icon
- Date, version, phase as inline metadata

---

## Data Source

### API Endpoint
```
GET /implementations?limit=200
```

Returns `SkillImplementation[]` from the `skill_implementations` table
(populated by the skills-sync-webhook).

### Key Fields from SkillImplementation

```typescript
interface SkillImplementation {
  id: string
  skill_slug: string
  skill_name: string
  implementation_type: string   // setup, design, backend, ai, quality, analytics, deploy
  implementation_date: string   // ISO date
  tips?: string
  main_function?: string
  status: 'new' | 'active' | 'archived'
  current_version?: string
  lifecycle_phase: number       // 1-8
  lifecycle_phase_name: string
  source_repository?: string
  source_paths: string[]
  data: Record<string, unknown>
}
```

### Mock Data (for development without API)
Provide mock implementations covering all 8 phases, ~25-30 entries,
using real skill slugs from the iconsaiConfig repository.

---

## Visual Style

- Matches existing dark theme (slate-900, slate-800 borders)
- Cyan (#06B6D4) for accents, active states, "new" badges
- Font: Plus Jakarta Sans (body) + JetBrains Mono (code/routes)
- Status "new" badge: cyan background, pulse animation dot
- Phase badges: slate-800 background, slate-400 text

---

## Components to Create

1. **SkillsImplementationTable.tsx** - Main table with search, filters, sorting
2. **SkillDetailModal.tsx** - Modal with metadata and link to Skill Cards

## Components to Modify

1. **Navigation.tsx** - Add third tab `'implementation'` to `SkillsTab` type
2. **page.tsx** (or parent component) - Handle third tab state and render table

---

## Phase Labels Reference

| Phase | Label |
|-------|-------|
| 1 | Setup / Inicializacao |
| 2 | Design / Arquitetura |
| 3 | Desenvolvimento Backend |
| 4 | Integracao AI / LLM |
| 5 | Qualidade / Testes |
| 6 | Analytics / Dados |
| 7 | Pre-Deploy |
| 8 | Deploy / CI-CD |
