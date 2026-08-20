'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import BrandWordmark from '@/app/BrandWordmark'
import CopyButton from '@/components/CopyButton'
import SkillModal from '@/components/SkillModal'
import { PHASES, PHASE_COLOR_RAW } from '@/data/phases'
import type { Skill } from '@/lib/github/types'
import { buildCatalogUrl, readCatalogUrlState } from '@/lib/client/catalog-url-state'
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

  const applyLocationState = useCallback(() => {
    const state = readCatalogUrlState(window.location.search, skills)
    const selected = state.skillId ? skills.find((skill) => skill.id === state.skillId) ?? null : null
    setSelectedSkill(selected)
    setSearchQuery(state.searchQuery)
    setSelectedPhase(PHASES.some((phase) => phase.number === state.activeFilter) ? state.activeFilter : 'all')
    if (selected) setActiveTab('catalog')
  }, [skills])

  useEffect(() => {
    applyLocationState()
    window.addEventListener('popstate', applyLocationState)
    return () => window.removeEventListener('popstate', applyLocationState)
  }, [applyLocationState])

  const openSkill = useCallback((skill: Skill) => {
    window.history.pushState(
      { ...window.history.state, skillsModalEntry: true },
      '',
      buildCatalogUrl(window.location.href, { skillId: skill.id }),
    )
    setSelectedSkill(skill)
  }, [])

  const closeSkill = useCallback(() => {
    if (window.history.state?.skillsModalEntry) {
      window.history.back()
      return
    }
    window.history.replaceState(
      { ...window.history.state, skillsModalEntry: false },
      '',
      buildCatalogUrl(window.location.href, { skillId: null }),
    )
    setSelectedSkill(null)
  }, [])

  const navigateSkill = useCallback((skillId: string) => {
    const skill = skills.find((candidate) => candidate.id === skillId)
    if (!skill) return
    window.history.replaceState(
      {
        ...window.history.state,
        skillsModalEntry: Boolean(window.history.state?.skillsModalEntry),
      },
      '',
      buildCatalogUrl(window.location.href, { skillId }),
    )
    setSelectedSkill(skill)
  }, [skills])

  const openSkillById = useCallback((id: string) => {
    const sk = skills.find((s) => s.id === id)
    if (sk) openSkill(sk)
  }, [openSkill, skills])

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    window.history.replaceState(
      window.history.state,
      '',
      buildCatalogUrl(window.location.href, { searchQuery: query }),
    )
  }, [])

  const handlePhaseChange = useCallback((phase: string) => {
    setSelectedPhase(phase)
    window.history.pushState(
      { ...window.history.state, skillsModalEntry: false },
      '',
      buildCatalogUrl(window.location.href, { activeFilter: phase }),
    )
  }, [])

  return (
    <div className={s.root}>
      {/* Header */}
      <header className={s.header}>
        <BrandWordmark className={`${s.logoWrap} logo-iconsai`} />
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
          Catálogo
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
              Catálogo de <span className={s.gradient}>Skills</span>
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
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          </section>

          <section className={s.filters}>
            <div className={s.filterRow}>
              <span className={s.filterLabel}>Fase:</span>
              <button
                className={`${s.filterBtn} ${selectedPhase === 'all' ? s.filterBtnActive : ''}`}
                onClick={() => handlePhaseChange('all')}
              >
                Todas <span className={s.filterCount}>{phaseCounts.all}</span>
              </button>
              {PHASES.map((p) => (
                <button
                  key={p.number}
                  className={`${s.filterBtn} ${selectedPhase === p.number ? s.filterBtnActive : ''}`}
                  onClick={() => handlePhaseChange(p.number)}
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

      <SkillModal
        skills={skills}
        skillId={selectedSkill?.id ?? null}
        onClose={closeSkill}
        onNavigateSkill={navigateSkill}
      />
    </div>
  )
}

/* ─── Skill Card (mobile) ─── */
function MobileSkillCard({
  skill,
  onOpen,
}: {
  skill: Skill
  onOpen: (s: Skill) => void
}) {
  const phaseClass = PHASE_CLASS[skill.phase] ?? s.phase2
  const accent = PHASE_COLOR_RAW[skill.phase] || '#22d3ee'

  return (
    <article
      className={`${s.skillCard} ${skill.isNew ? s.skillCardNew : ''}`}
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
