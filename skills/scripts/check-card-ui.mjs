#!/usr/bin/env node

/**
 * Card UI Validator
 *
 * Checks that skill-card badge positioning, text containment,
 * and spacing rules are correct in both TSX and CSS.
 * Run before build or in CI.
 *
 * Usage:
 *   node scripts/check-card-ui.mjs
 *   npm run check:ui
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const CARD_TSX = join(ROOT, 'components/skills/skill-card.tsx')
const CARD_CSS = join(ROOT, 'components/skills/skills.module.css')

let errors = 0
let warnings = 0
let total = 0

function pass(msg) { total++; console.log(`  \x1b[32m✓\x1b[0m ${msg}`) }
function fail(msg) { total++; console.log(`  \x1b[31m✗\x1b[0m ${msg}`); errors++ }
function warn(msg) { total++; console.log(`  \x1b[33m!\x1b[0m ${msg}`); warnings++ }

/** Extract a CSS block by class name (first match, handles multi-selector blocks) */
function cssBlock(className) {
  // Match .className followed by optional other selectors, then { ... }
  const re = new RegExp(`\\.${className}[\\s,][^{]*\\{([^}]+)\\}`)
  return css.match(re)?.[1] || ''
}

/** Check if a CSS block contains a property (key: value pair) */
function hasProperty(block, prop) {
  return new RegExp(`${prop}\\s*:`).test(block)
}

/** Check if a CSS block contains overflow-wrap or word-break */
function hasWordWrap(block) {
  return hasProperty(block, 'overflow-wrap') || hasProperty(block, 'word-wrap')
}

function hasWordBreak(block) {
  return hasProperty(block, 'word-break')
}

// ── Read files ──
const tsx = readFileSync(CARD_TSX, 'utf8')
const css = readFileSync(CARD_CSS, 'utf8')

console.log('\n  Card UI Validator')
console.log('  =================\n')

// ══════════════════════════════════════════════
// SECTION 1: TSX Structure
// ══════════════════════════════════════════════
console.log('  [1] TSX Structure')

const articleMatch = tsx.match(/<article[^>]*>([\s\S]*?)<\/article>/)
if (!articleMatch) {
  fail('Could not find <article> element in skill-card.tsx')
} else {
  const articleBody = articleMatch[1]

  const badgeIdx = articleBody.indexOf('statusBadge')
  const headerIdx = articleBody.indexOf('cardHeader')

  if (badgeIdx < 0) {
    fail('statusBadge not found inside <article>')
  } else if (headerIdx < 0) {
    fail('cardHeader not found inside <article>')
  } else if (badgeIdx < headerIdx) {
    pass('statusBadge is a direct child of card (before cardHeader)')
  } else {
    fail('statusBadge appears AFTER cardHeader — must be before it')
  }

  const headerContent = articleBody.match(/cardHeader[\s\S]*?<\/div>\s*<\/div>/)
  if (headerContent && headerContent[0].includes('statusBadge')) {
    fail('statusBadge is nested INSIDE cardHeader — must be outside')
  } else {
    pass('statusBadge is not nested inside cardHeader')
  }
}

// ══════════════════════════════════════════════
// SECTION 2: Card Container
// ══════════════════════════════════════════════
console.log('\n  [2] Card Container')

const cardBlock = cssBlock('card')

if (cardBlock.includes('position') && cardBlock.includes('relative')) {
  pass('.card has position: relative')
} else {
  fail('.card must have position: relative (anchor for absolute badge)')
}

if (hasProperty(cardBlock, 'overflow') || cardBlock.includes('overflow')) {
  // If overflow is set, make sure it's not 'visible' (or just skip — no overflow is fine)
  if (cardBlock.includes('overflow: visible')) {
    warn('.card has overflow: visible — content may escape container')
  } else {
    pass('.card overflow is controlled')
  }
} else {
  pass('.card has no overflow set (default, OK with word-break on children)')
}

// ══════════════════════════════════════════════
// SECTION 3: Badge Positioning
// ══════════════════════════════════════════════
console.log('\n  [3] Badge Positioning')

const badgeBlock = cssBlock('statusBadge')

if (badgeBlock.includes('position') && badgeBlock.includes('absolute')) {
  pass('.statusBadge has position: absolute')
} else {
  fail('.statusBadge must have position: absolute')
}

const topMatch = badgeBlock.match(/top:\s*(\d+)px/)
const rightMatch = badgeBlock.match(/right:\s*(\d+)px/)

if (topMatch) {
  const top = parseInt(topMatch[1])
  if (top >= 10 && top <= 20) {
    pass(`.statusBadge top: ${top}px (10-20px range)`)
  } else {
    warn(`.statusBadge top: ${top}px — expected 10-20px`)
  }
} else {
  fail('.statusBadge must have top value in px')
}

if (rightMatch) {
  const right = parseInt(rightMatch[1])
  if (right >= 10 && right <= 20) {
    pass(`.statusBadge right: ${right}px (10-20px range)`)
  } else {
    warn(`.statusBadge right: ${right}px — expected 10-20px`)
  }
} else {
  fail('.statusBadge must have right value in px')
}

if (hasProperty(badgeBlock, 'z-index')) {
  pass('.statusBadge has z-index')
} else {
  warn('.statusBadge should have z-index to stay above content')
}

if (badgeBlock.includes('white-space') && badgeBlock.includes('nowrap')) {
  pass('.statusBadge has white-space: nowrap (badge text never wraps)')
} else {
  fail('.statusBadge must have white-space: nowrap')
}

// ══════════════════════════════════════════════
// SECTION 4: Header Clearance (no overlap with badge)
// ══════════════════════════════════════════════
console.log('\n  [4] Header Clearance')

const headerBlock = cssBlock('cardHeader')
const prMatch = headerBlock.match(/padding-right:\s*(\d+)px/)

if (prMatch) {
  const pr = parseInt(prMatch[1])
  if (pr >= 60) {
    pass(`.cardHeader padding-right: ${pr}px (room for badge)`)
  } else {
    fail(`.cardHeader padding-right: ${pr}px — must be >= 60px`)
  }
} else {
  fail('.cardHeader must have padding-right to prevent title/badge overlap')
}

// ══════════════════════════════════════════════
// SECTION 5: Text Containment (words stay inside card)
// ══════════════════════════════════════════════
console.log('\n  [5] Text Containment')

const titleBlock = cssBlock('cardTitle')
const nameBlock = cssBlock('cardName')
const descBlock = cssBlock('cardDescription')
const triggerBlock = cssBlock('triggerCode')

// cardTitle
if (hasWordWrap(titleBlock)) {
  pass('.cardTitle has overflow-wrap (long titles wrap inside card)')
} else {
  fail('.cardTitle must have overflow-wrap: break-word')
}

if (hasWordBreak(titleBlock)) {
  pass('.cardTitle has word-break (fallback for unbreakable words)')
} else {
  warn('.cardTitle should have word-break: break-word as fallback')
}

// cardName (skill ID — monospace, long underscored names)
if (hasWordWrap(nameBlock) || hasWordBreak(nameBlock)) {
  pass('.cardName has word-wrap/word-break (long IDs break correctly)')
} else {
  fail('.cardName must have word-break to wrap long skill IDs like skill_deploy_fase_5_lock_release')
}

// cardDescription
if (hasWordWrap(descBlock)) {
  pass('.cardDescription has overflow-wrap (descriptions stay inside card)')
} else {
  fail('.cardDescription must have overflow-wrap: break-word')
}

// triggerCode
if (hasProperty(triggerBlock, 'text-overflow') && triggerBlock.includes('ellipsis')) {
  pass('.triggerCode has text-overflow: ellipsis (truncates gracefully)')
} else {
  fail('.triggerCode must have text-overflow: ellipsis for long triggers')
}

if (hasProperty(triggerBlock, 'overflow') && triggerBlock.includes('hidden')) {
  pass('.triggerCode has overflow: hidden (prevents bleed)')
} else {
  fail('.triggerCode must have overflow: hidden')
}

if (hasProperty(triggerBlock, 'max-width')) {
  pass('.triggerCode has max-width constraint')
} else {
  warn('.triggerCode should have max-width to stay inside card')
}

// ══════════════════════════════════════════════
// SECTION 6: Tags-to-Footer Spacing
// ══════════════════════════════════════════════
console.log('\n  [6] Tags-to-Footer Spacing')

const tagsBlock = cssBlock('tags')
const mbMatch = tagsBlock.match(/margin-bottom:\s*(\d+)px/)

if (mbMatch) {
  const mb = parseInt(mbMatch[1])
  if (mb >= 12) {
    pass(`.tags margin-bottom: ${mb}px (breathing room before footer)`)
  } else {
    warn(`.tags margin-bottom: ${mb}px — should be >= 12px`)
  }
} else {
  fail('.tags must have margin-bottom for spacing before footer line')
}

// Tags should also wrap properly
if (tagsBlock.includes('flex-wrap') && tagsBlock.includes('wrap')) {
  pass('.tags has flex-wrap: wrap (badges flow to next line)')
} else {
  fail('.tags must have flex-wrap: wrap to prevent horizontal overflow')
}

// ══════════════════════════════════════════════
// SECTION 7: Footer Line
// ══════════════════════════════════════════════
console.log('\n  [7] Footer Line')

const actionsBlock = cssBlock('cardActions')

if (actionsBlock.includes('border-top')) {
  pass('.cardActions has border-top separator')
} else {
  fail('.cardActions must have border-top')
}

const ptMatch = actionsBlock.match(/padding-top:\s*(\d+)px/)
if (ptMatch) {
  const pt = parseInt(ptMatch[1])
  if (pt >= 10) {
    pass(`.cardActions padding-top: ${pt}px`)
  } else {
    warn(`.cardActions padding-top: ${pt}px — should be >= 10px`)
  }
} else {
  fail('.cardActions must have padding-top')
}

if (actionsBlock.includes('margin-top') && actionsBlock.includes('auto')) {
  pass('.cardActions has margin-top: auto (pinned to bottom)')
} else {
  fail('.cardActions must have margin-top: auto')
}

// ══════════════════════════════════════════════
// Summary
// ══════════════════════════════════════════════
console.log('\n  ─────────────────')
console.log(`  Total checks: ${total}`)
if (errors === 0) {
  console.log(`  \x1b[32mPASS\x1b[0m — ${warnings} warning(s), 0 errors`)
} else {
  console.log(`  \x1b[31mFAIL\x1b[0m — ${errors} error(s), ${warnings} warning(s)`)
}
console.log('')

process.exit(errors > 0 ? 1 : 0)
