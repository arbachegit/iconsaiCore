#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = join(SCRIPT_DIR, '..')
const tsx = readFileSync(join(ROOT, 'components/skills/skill-card.tsx'), 'utf8')
const css = readFileSync(join(ROOT, 'components/skills/skills.module.css'), 'utf8')

let errors = 0
let total = 0

function pass(message) {
  total += 1
  console.log(`  \x1b[32mPASS\x1b[0m ${message}`)
}

function fail(message) {
  total += 1
  errors += 1
  console.log(`  \x1b[31mFAIL\x1b[0m ${message}`)
}

function check(condition, message) {
  if (condition) {
    pass(message)
  } else {
    fail(message)
  }
}

function cssBlock(className) {
  const expression = new RegExp(`\\.${className}(?:[\\s,{][^{]*)?\\{([^}]+)\\}`)
  return css.match(expression)?.[1] || ''
}

function containsAll(source, fragments) {
  return fragments.every((fragment) => source.includes(fragment))
}

console.log('\n  Skills Card UI Gate')
console.log('  ===================\n')

console.log('  [1] Estrutura')
check(/<article[\s\S]*<\/article>/.test(tsx), 'card usa article semântico')
check(tsx.indexOf('cardTopline') < tsx.indexOf('cardBody'), 'metadados precedem o conteúdo')
check(tsx.includes('onOpenModal?.(skill.id)'), 'abertura usa o id canônico')
check(tsx.includes('navigator.clipboard.writeText(skill.trigger)'), 'comando pode ser copiado')

console.log('\n  [2] Contenção BI Density')
const card = cssBlock('card')
const titleButton = cssBlock('cardTitleButton')
const cardId = cssBlock('cardId')
const description = cssBlock('cardDescription')
const tags = cssBlock('tags')
const footer = cssBlock('cardFooter')
const footerCode = cssBlock('cardFooter code') || css.match(/\.cardFooter code\s*\{([^}]+)\}/)?.[1] || ''

check(containsAll(card, ['position: relative', 'min-width: 0', 'overflow: hidden']), 'card contém conteúdo longo')
check(containsAll(titleButton, ['grid-template-columns: minmax(0, 1fr) auto', 'min-width: 0']), 'título reserva espaço da ação')
check(css.includes('overflow-wrap: anywhere'), 'títulos longos quebram sem vazar')
check(containsAll(cardId, ['min-width: 0', 'overflow: hidden', 'text-overflow: ellipsis', 'white-space: nowrap']), 'id usa ellipsis')
check(containsAll(description, ['overflow: hidden', '-webkit-line-clamp: 3']), 'descrição tem altura controlada')

console.log('\n  [3] Rodapé e tags')
check(containsAll(tags, ['flex-wrap: wrap', 'min-width: 0', 'margin: auto 0 14px']), 'tags respiram e quebram corretamente')
check(containsAll(footer, ['grid-template-columns: minmax(0, 1fr) auto', 'min-width: 0', 'border-top']), 'rodapé mantém comando e ação alinhados')
check(containsAll(footerCode, ['min-width: 0', 'overflow: hidden', 'text-overflow: ellipsis', 'white-space: nowrap']), 'comando longo usa ellipsis')

console.log('\n  -------------------')
console.log(`  Total: ${total}`)
console.log(errors === 0 ? '  \x1b[32mPASS\x1b[0m' : `  \x1b[31mFAIL\x1b[0m ${errors} erro(s)`)
console.log('')

process.exit(errors > 0 ? 1 : 0)
