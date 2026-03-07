# Pending Changes for Skills App

Changes planned for the Skills Navigator at `icon.iconsai.ai/skills`.
Source code: `~/Projects/iconsaiSkills/skills/`

---

## 1. Rename Tab Labels

**Current:**
- "Ciclo de Vida" (lifecycle tab)
- "Catalogo Completo" (catalog tab)

**New:**
- "Root" (lifecycle tab)
- "Skill Cards" (catalog tab)

**File:** `components/Navigation.tsx`

**Change:**
```tsx
// Before
<button ...>Ciclo de Vida</button>
<button ...>Catalogo Completo</button>

// After
<button ...>Root</button>
<button ...>Skill Cards</button>
```

---

## 2. Add Third Tab: "Skills Implementation"

Add a new tab after "Skill Cards" that shows a sortable/filterable table
of all implemented skills.

**Full spec:** See `docs/SKILL-IMPLEMENTATION-TAB.md`

**Files to modify:**
- `components/Navigation.tsx` - Add `'implementation'` to SkillsTab type, add third button
- `app/page.tsx` (or parent client component) - Handle third tab rendering

**Files to create:**
- `components/SkillsImplementationTable.tsx` - Table with search, sort, filter chips
- `components/SkillDetailModal.tsx` - Detail modal, header links to Skill Cards with glow

---

## 3. Favicon Fix

The favicon must have a **transparent background** (no white square).
Source file: `~/Projects/images/faviconSkill.svg` (two-color: red "i" + cyan ".ai")

**Current issue:** The `icon.png` files may lack alpha channel.

**Fix:**
```bash
# Regenerate with alpha from SVG
convert skills/app/icon.svg -background none -resize 32x32 png32:skills/app/icon.png
convert skills/app/icon.svg -background none -resize 192x192 png32:skills/app/apple-icon.png
```

**Verify transparency:**
```bash
identify -verbose skills/app/icon.png | grep -i alpha
# Must show "Alpha" or "TrueColorAlpha"
```

---

## 4. Header Logo (Future)

Consider replacing the text-based logo ("IC" box + "IconsAI Skills") with
the actual logo image from `~/Projects/images/iconsai_no_bg.png`.

**Current:** Text logo in `components/Header.tsx`
**Proposed:** `<img src="/skills/logo.png">` with resized transparent PNG

---

## 5. Neon Glow on Skill Cards

When navigating from Root tab or Skills Implementation modal to Skill Cards,
the target card should glow with cyan neon (#06B6D4) for ~20 seconds then fade.

**Three-state animation:**
1. `idle` - no glow, normal border
2. `glowing` - pulsing cyan box-shadow (20 seconds)
3. `fading` - transition border/shadow to transparent (3 seconds)

**Auto-scroll:** Card scrolls into viewport with `scrollIntoView({ behavior: 'smooth', block: 'center' })`

---

## Architecture Notes

### Project Structure
```
~/Projects/iconsaiSkills/
├── skills/                 ← Next.js app (port 3003)
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx        ← Server component, fetches from GitHub
│   │   ├── globals.css
│   │   ├── skills.module.css
│   │   ├── icon.svg        ← Two-color favicon
│   │   ├── icon.png        ← 32x32 fallback
│   │   └── apple-icon.png  ← 180x180
│   ├── components/
│   │   ├── Header.tsx      ← Logo + stats
│   │   ├── Navigation.tsx  ← Tab buttons (2 → 3)
│   │   ├── Footer.tsx      ← Version + GitHub link
│   │   ├── Modal.tsx
│   │   ├── CopyButton.tsx
│   │   └── skills/
│   │       ├── skill-card.tsx
│   │       ├── skills-section.tsx
│   │       └── skills.module.css
│   ├── lib/
│   │   └── github/
│   │       ├── skills.ts   ← Fetches YAML from iconsaiConfig repo
│   │       ├── types.ts    ← Skill, GitHubContentItem interfaces
│   │       └── env.ts
│   ├── data/
│   │   ├── skills.ts
│   │   └── skill-docs.ts
│   ├── public/
│   ├── next.config.js      ← basePath: '/skills', output: 'standalone'
│   └── package.json        ← Next.js 15, React 19, port 3003
│
├── tools/                  ← Next.js app (port 3002)
└── .git/
```

### Deployment
- Server: DigitalOcean droplet at 104.236.28.58 (icon.iconsai.ai)
- Caddy reverse proxy: `/skills*` → localhost:3003
- Production config: `~/Projects/iconsaiIcon/Caddyfile.production`
- Build: `next build` (standalone output)
- Run: `next start -p 3003`

### Data Flow
- Skills are YAML files in the `iconsaiConfig` GitHub repo
- `lib/github/skills.ts` fetches them via GitHub API
- Server component renders with `revalidate = 3600` (1 hour cache)
- 47 skills across 8 lifecycle phases

### basePath Reminder
The app uses `basePath: '/skills'`. All `<Link href>` values must NOT
include `/skills` prefix — Next.js adds it automatically.
- Correct: `href="/skill-cards"`
- Wrong: `href="/skills/skill-cards"` (becomes `/skills/skills/skill-cards`)
