'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import CopyButton from '@/components/CopyButton'
import Modal from '@/components/Modal'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import { PHASES, PHASE_COLOR_RAW } from '@/data/phases'
import type { Skill } from '@/lib/github/types'
import { useSkillDoc } from '@/lib/use-skill-doc'
import s from '@/app/mobile/skills-mobile.module.css'

const PHASE_CLASS: Record<string, string> = {
  '1': s.phase1, '2': s.phase2, '3': s.phase3, '4': s.phase4,
  '5': s.phase5, '6': s.phase6, '7': s.phase7, '8': s.phase8,
  '9': s.phase9,
}

interface SkillsMobileCatalogProps {
  skills: Skill[]
  dataSource: 'github' | 'fallback'
}

export default function SkillsMobileCatalog({ skills, dataSource }: SkillsMobileCatalogProps) {
  const [activeTab, setActiveTab] = useState<'lifecycle' | 'catalog'>('lifecycle')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPhase, setSelectedPhase] = useState('all')
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [pendingCatalogSkillId, setPendingCatalogSkillId] = useState<string | null>(null)
  const [highlightedSkillId, setHighlightedSkillId] = useState<string | null>(null)

  const filteredSkills = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return skills.filter((sk) => {
      const matchPhase = selectedPhase === 'all' || sk.phase === selectedPhase
      const matchSearch =
        !q ||
        sk.name.toLowerCase().includes(q) ||
        sk.description.toLowerCase().includes(q) ||
        sk.keywords.toLowerCase().includes(q) ||
        sk.id.toLowerCase().includes(q) ||
        sk.techs.some((t) => t.toLowerCase().includes(q))
      return matchPhase && matchSearch
    })
  }, [skills, searchQuery, selectedPhase])

  const phaseCounts = useMemo(() => {
    const c: Record<string, number> = { all: skills.length }
    PHASES.forEach((p) => { c[p.number] = skills.filter((sk) => sk.phase === p.number).length })
    return c
  }, [skills])

  const skillsByPhase = useMemo(() => {
    const m: Record<string, Skill[]> = {}
    PHASES.forEach((p) => { m[p.number] = skills.filter((sk) => sk.phase === p.number) })
    return m
  }, [skills])

  const openSkill = useCallback((skill: Skill) => setSelectedSkill(skill), [])
  const closeSkill = useCallback(() => setSelectedSkill(null), [])

  const openSkillById = useCallback((id: string) => {
    const sk = skills.find((s) => s.id === id)
    if (sk) {
      setSelectedSkill(null)
      setSearchQuery('')
      setSelectedPhase('all')
      setActiveTab('catalog')
      setPendingCatalogSkillId(sk.id)
    }
  }, [skills])

  useEffect(() => {
    if (activeTab !== 'catalog' || !pendingCatalogSkillId) return

    const cardId = `mobile-catalog-skill-${pendingCatalogSkillId}`
    const el = document.getElementById(cardId)
    if (!el) return

    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedSkillId(pendingCatalogSkillId)
    setPendingCatalogSkillId(null)

    const t = window.setTimeout(() => {
      setHighlightedSkillId((curr) => (curr === pendingCatalogSkillId ? null : curr))
    }, 1600)

    return () => window.clearTimeout(t)
  }, [activeTab, pendingCatalogSkillId])

  return (
    <div className={s.root}>
      {/* Header */}
      <header className={s.header}>
        <div className={s.logoWrap}>
          <div className={s.logoIcon}>IC</div>
          <div className={s.logoText}>Icons<span className={s.logoAccent}>AI</span> Skills</div>
        </div>
        <div className={s.headerStats}>
          <span><span className={s.statVal}>{skills.length}</span> skills</span>
          <span>v3.1</span>
          {dataSource === 'fallback' && (
            <span className={s.statVal} style={{ color: 'var(--yl)', fontSize: '0.65rem' }}>(offline)</span>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className={s.tabs}>
        <button
          className={`${s.tab} ${activeTab === 'lifecycle' ? s.tabActive : ''}`}
          onClick={() => setActiveTab('lifecycle')}
        >
          Ciclo de Vida
        </button>
        <button
          className={`${s.tab} ${activeTab === 'catalog' ? s.tabActive : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          Catalogo
        </button>
      </div>

      {/* TAB: Lifecycle */}
      {activeTab === 'lifecycle' && (
        <>
          <section className={s.hero}>
            <h1 className={s.heroTitle}>
              Ciclo de Vida do <span className={s.gradient}>Projeto</span>
            </h1>
            <p className={s.heroDesc}>
              Diagrama mostrando quando usar cada skill durante o desenvolvimento, desde a inicializacao ate producao.
            </p>
          </section>

          <section className={s.lifecycleSection}>
            <h2 className={s.lifecycleTitle}>
              <span className={s.lifecycleTitleIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
              Fases do Desenvolvimento
            </h2>

            <div className={s.lifecycleDiagram}>
              <div className={s.lifecycleLine} />

              {PHASES.map((phase) => {
                const phaseSkills = skillsByPhase[phase.number] || []
                const color = PHASE_COLOR_RAW[phase.number]
                return (
                  <div key={phase.number} className={s.lifecyclePhase}>
                    <div className={s.phaseNumber} style={{ borderColor: color }}>
                      <span style={{ color }}>{phase.number}</span>
                    </div>
                    <div className={s.phaseTitle} style={{ color }}>{phase.name}</div>
                    <div className={s.phaseSubtitle}>{phase.subtitle}</div>
                    <p className={s.phaseDesc}>{phase.description}</p>
                    <div className={s.phaseSkills}>
                      {phaseSkills.map((sk) => (
                        <button
                          key={sk.id}
                          className={`${s.skillTag} ${sk.isNew ? s.skillTagNew : ''}`}
                          onClick={() => openSkillById(sk.id)}
                        >
                          {sk.id}
                          {sk.isNew && <span className={s.newBadge}>NEW</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}

      {/* TAB: Catalog */}
      {activeTab === 'catalog' && (
        <>
          <section className={s.hero}>
            <h1 className={s.heroTitle}>
              Catalogo de <span className={s.gradient}>Skills</span>
            </h1>
            <p className={s.heroDesc}>
              Todas as skills organizadas por fase. Use a busca para encontrar a skill ideal.
            </p>
            <div className={s.searchWrap}>
              <span className={s.searchIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                className={s.searchInput}
                placeholder="Buscar skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </section>

          <section className={s.filters}>
            <div className={s.filterRow}>
              <span className={s.filterLabel}>Fase:</span>
              <button
                className={`${s.filterBtn} ${selectedPhase === 'all' ? s.filterBtnActive : ''}`}
                onClick={() => setSelectedPhase('all')}
              >
                Todas <span className={s.filterCount}>{phaseCounts.all}</span>
              </button>
              {PHASES.map((p) => (
                <button
                  key={p.number}
                  className={`${s.filterBtn} ${selectedPhase === p.number ? s.filterBtnActive : ''}`}
                  onClick={() => setSelectedPhase(p.number)}
                >
                  {p.name.split(' /')[0].split(' ')[0]}{' '}
                  <span className={s.filterCount}>{phaseCounts[p.number]}</span>
                </button>
              ))}
            </div>
          </section>

          <div className={s.resultsInfo}>
            Mostrando <span className={s.resultsNum}>{filteredSkills.length}</span> skills
          </div>

          <div className={s.cardList}>
            {filteredSkills.map((sk) => (
              <MobileSkillCard
                key={sk.id}
                skill={sk}
                domId={`mobile-catalog-skill-${sk.id}`}
                highlighted={highlightedSkillId === sk.id}
                onOpen={openSkill}
              />
            ))}
          </div>
        </>
      )}

      {/* Footer */}
      <footer className={s.footer}>
        <p>
          IconsAI Skills Navigator v3.1 &mdash;{' '}
          <a className={s.footerLink} href="https://github.com/iconsai" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </p>
      </footer>

      {/* Skill Detail Modal */}
      <Modal open={!!selectedSkill} onClose={closeSkill} overlayClassName={s.modalOverlay}>
        {selectedSkill && <MobileSkillModal skill={selectedSkill} onClose={closeSkill} />}
      </Modal>
    </div>
  )
}

/* ─── Skill Card (mobile) ─── */
function MobileSkillCard({
  skill,
  domId,
  highlighted,
  onOpen,
}: {
  skill: Skill
  domId: string
  highlighted: boolean
  onOpen: (s: Skill) => void
}) {
  const phaseClass = PHASE_CLASS[skill.phase] ?? s.phase2
  const accent = PHASE_COLOR_RAW[skill.phase] || '#22d3ee'

  return (
    <article
      id={domId}
      className={`${s.skillCard} ${skill.isNew ? s.skillCardNew : ''} ${highlighted ? s.skillCardTarget : ''}`}
      style={{ '--card-accent': accent } as React.CSSProperties}
    >
      {skill.isNew && <span className={s.skillCardNewBadge}>NEW</span>}

      <div className={s.cardHeader}>
        <span className={`${s.cardId} ${phaseClass}`}>{skill.id}</span>
        <span className={`${s.cardPhase} ${phaseClass}`}>{skill.phaseName}</span>
      </div>

      <h3 className={s.cardTitle}>{skill.name}</h3>
      <p className={s.cardDesc}>{skill.description}</p>

      <div className={s.cardTech}>
        {skill.techs.map((t) => (
          <span key={t} className={s.techTag}>{t}</span>
        ))}
      </div>

      <div className={s.cardCommand}>
        <code className={s.cardCommandCode}>{skill.trigger}</code>
        <CopyButton text={skill.trigger} className={s.copyBtn}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </CopyButton>
      </div>

      <div className={s.cardActions}>
        <button type="button" className={s.cardDetailBtn} onClick={() => onOpen(skill)}>
          <span>Abrir skill</span>
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
      </div>
    </article>
  )
}

/* ─── Skill Modal (mobile) ─── */
function MobileSkillModal({ skill, onClose }: { skill: Skill; onClose: () => void }) {
  const phaseClass = PHASE_CLASS[skill.phase] ?? s.phase2
  const { doc: fullDoc, loading } = useSkillDoc(skill.id)
  const copyText = fullDoc || skill.description

  return (
    <div className={s.modalBox}>
      <div className={s.modalTopActions}>
        <CopyButton text={copyText} className={s.modalActionBtn}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </CopyButton>
        <button className={s.modalCloseBtn} onClick={onClose}>&#10005;</button>
      </div>

      <div className={s.modalHeaderRow}>
        <span className={`${s.cardPhase} ${phaseClass}`}>{skill.phaseName}</span>
        <span className={s.modalCommandInline}>{skill.trigger}</span>
        <span className={s.modalStatusBadge} data-status={skill.isNew ? 'new' : 'active'}>
          {skill.isNew ? 'new' : 'active'}
        </span>
      </div>

      {/* Metadata bar */}
      <div className={s.modalMeta}>
        <span><span className={s.modalMetaLabel}>id:</span> {skill.id}</span>
        <span><span className={s.modalMetaLabel}>version:</span> <span className={s.modalMetaAccent}>{skill.version}</span></span>
        <span><span className={s.modalMetaLabel}>phase:</span> {skill.phase} — {skill.phaseName}</span>
      </div>

      {/* Structured fields — always visible */}
      <h3 className={s.modalTitle}>{skill.name}</h3>
      <p className={s.modalDesc}>{skill.description}</p>

      <div className={s.modalTech}>
        {skill.techs.map((t) => (
          <span key={t} className={s.techTag}>{t}</span>
        ))}
      </div>

      {skill.examples.length > 0 && (
        <>
          <div className={s.modalSectionTitle}>Quando usar</div>
          <ul className={s.modalWhenList}>
            {skill.examples.map((ex, i) => (
              <li key={i} className={s.modalWhenItem}>{ex}</li>
            ))}
          </ul>
        </>
      )}

      {skill.commands.length > 0 && (
        <>
          <div className={s.modalSectionTitle}>Comando</div>
          {skill.commands.map((cmd, i) => (
            <div key={i} className={s.modalCommand}>
              <code>{cmd}</code>
              <CopyButton text={cmd} className={s.copyBtn}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </CopyButton>
            </div>
          ))}
        </>
      )}

      {skill.keywords && (
        <>
          <div className={s.modalSectionTitle}>Keywords</div>
          <p className={s.modalKeywords}>{skill.keywords}</p>
        </>
      )}

      {/* Full doc from SKILL.md — shown below structured fields */}
      {loading ? (
        <div className={s.modalLoading}>
          <span className={s.modalSpinner} />
          <span>Carregando documentacao completa...</span>
        </div>
      ) : fullDoc ? (
        <div className={s.modalDocSection}>
          <div className={s.modalSectionTitle}>Documentacao (SKILL.md)</div>
          <MarkdownRenderer content={fullDoc} className={s.mdContent} />
        </div>
      ) : null}
    </div>
  )
}
