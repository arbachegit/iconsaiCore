'use client'

import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Database,
  GitBranch,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'

import BrandWordmark from '@/app/BrandWordmark'
import SkillModal from '@/components/SkillModal'
import SkillAdvisor from '@/components/SkillAdvisor'
import SkillSection from '@/components/skills/skills-section'
import styles from '@/components/skills/skills.module.css'
import { PHASES, PHASE_COLOR_RAW } from '@/data/phases'
import { useNewSkillsPolling } from '@/hooks/use-new-skills-polling'
import { buildSkillsApiUrl } from '@/lib/client/skills-api-url'
import { skillsSyncHealthResponseSchema } from '@/lib/github/sync-schema'
import type { Skill } from '@/lib/github/types'

interface SkillsCatalogProps {
  skills: Skill[]
  dataSource: 'github' | 'fallback'
  contentHash: string
}

interface SkillSectionData {
  name: string
  number: string
  description: string
  subtitle: string
  skills: Skill[]
}

function groupByPhase(skills: Skill[]): SkillSectionData[] {
  return PHASES.map((phase) => ({
    name: phase.name,
    number: phase.number,
    description: phase.description,
    subtitle: phase.subtitle,
    skills: skills.filter((skill) => skill.phase === phase.number),
  })).filter((section) => section.skills.length > 0)
}

function matchesSearch(skill: Skill, query: string): boolean {
  const searchable = [
    skill.name,
    skill.id,
    skill.description,
    skill.keywords,
    skill.trigger,
    ...skill.techs,
  ].join(' ').toLocaleLowerCase('pt-BR')

  return searchable.includes(query)
}

export default function SkillsCatalog({
  skills = [],
  dataSource = 'fallback',
  contentHash = '',
}: SkillsCatalogProps) {
  const [activePhase, setActivePhase] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [modalSkillId, setModalSkillId] = useState<string | null>(null)
  const catalogRef = useRef<HTMLElement>(null)
  const deferredQuery = useDeferredValue(searchQuery)
  const polling = useNewSkillsPolling(skills.length, contentHash)

  const phaseCounts = useMemo(
    () => Object.fromEntries(PHASES.map((phase) => [
      phase.number,
      skills.filter((skill) => skill.phase === phase.number).length,
    ])),
    [skills],
  )

  const visibleSkills = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLocaleLowerCase('pt-BR')
    return skills.filter((skill) => {
      const matchesPhase = activePhase === 'all' || skill.phase === activePhase
      const matchesQuery = normalizedQuery.length < 2 || matchesSearch(skill, normalizedQuery)
      return matchesPhase && matchesQuery
    })
  }, [activePhase, deferredQuery, skills])

  const sections = useMemo(() => groupByPhase(visibleSkills), [visibleSkills])
  const isFiltering = activePhase !== 'all' || deferredQuery.trim().length >= 2
  const activePhaseData = PHASES.find((phase) => phase.number === activePhase)
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase('pt-BR')
  const hasSearchQuery = normalizedQuery.length >= 2
  const quickResults = hasSearchQuery ? visibleSkills.slice(0, 6) : []

  const handleOpenSkill = useCallback((skillId: string) => {
    setModalSkillId(skillId)
  }, [])

  const resetFilters = useCallback(() => {
    setSearchQuery('')
    setActivePhase('all')
  }, [])

  const showCatalogResults = useCallback(() => {
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <>
      <main className={styles.page}>
        <header className={styles.topbar}>
          <BrandWordmark />

          <div className={styles.topbarTrail} aria-label="Localização atual">
            <span>ecossistema</span>
            <span className={styles.trailDivider}>/</span>
            <strong>skills</strong>
          </div>

          <a
            className={styles.toolsLink}
            href="https://icon.iconsai.ai/tools"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ferramentas
            <ArrowUpRight aria-hidden="true" />
          </a>
        </header>

        <div className={styles.atlas}>
          <aside className={styles.rail} aria-label="Fases do ciclo de desenvolvimento">
            <div className={styles.railHeading}>
              <span>Mapa do ciclo</span>
              <small>09 fases</small>
            </div>

            <nav className={styles.phaseNav}>
              <button
                type="button"
                className={styles.phaseButton}
                data-active={activePhase === 'all'}
                onClick={() => setActivePhase('all')}
                aria-pressed={activePhase === 'all'}
              >
                <span className={styles.phaseNumber}>00</span>
                <span className={styles.phaseCopy}>
                  <strong>Visão completa</strong>
                  <small>Todo o catálogo</small>
                </span>
                <span className={styles.phaseCount}>{skills.length}</span>
              </button>

              {PHASES.map((phase) => {
                const count = phaseCounts[phase.number] ?? 0
                const isActive = activePhase === phase.number
                return (
                  <button
                    key={phase.number}
                    type="button"
                    className={styles.phaseButton}
                    data-active={isActive}
                    onClick={() => setActivePhase(isActive ? 'all' : phase.number)}
                    aria-pressed={isActive}
                    style={{ '--phase-color': PHASE_COLOR_RAW[phase.number] } as React.CSSProperties}
                  >
                    <span className={styles.phaseNumber}>{phase.number.padStart(2, '0')}</span>
                    <span className={styles.phaseCopy}>
                      <strong>{phase.name.split('/')[0].trim()}</strong>
                      <small>{phase.subtitle}</small>
                    </span>
                    <span className={styles.phaseCount}>{count}</span>
                  </button>
                )
              })}
            </nav>

            <div className={styles.sourceCard}>
              <div className={styles.sourceCardTop}>
                <GitBranch aria-hidden="true" />
                <span>Fonte canônica</span>
              </div>
              <strong>iconsaiConfig / skills</strong>
              <p>Arquivos SKILL.md lidos do repositório central.</p>
              <a
                href="https://github.com/arbachegit/iconsaiConfig/tree/main/skills"
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir repositório
                <ArrowUpRight aria-hidden="true" />
              </a>
            </div>
          </aside>

          <div className={styles.content}>
            <section className={styles.hero}>
              <div className={styles.heroStatusRow}>
                <span className={styles.kicker}>Atlas operacional / edição 2026</span>
                <SourceStatus source={dataSource} />
              </div>

              <div className={styles.heroGrid}>
                <div>
                  <h1>
                    Skills que fazem
                    <span>o trabalho avançar.</span>
                  </h1>
                  <p className={styles.heroDescription}>
                    Encontre o protocolo certo para cada etapa: da arquitetura inicial ao deploy.
                    Cada skill reúne instruções canônicas, gatilhos e contexto de aplicação.
                  </p>
                </div>

                <div className={styles.heroMetrics} aria-label="Resumo do catálogo">
                  <div>
                    <strong>{skills.length}</strong>
                    <span>skills canônicas</span>
                  </div>
                  <div>
                    <strong>{PHASES.length}</strong>
                    <span>fases do ciclo</span>
                  </div>
                  <div>
                    <strong>{contentHash || 'local'}</strong>
                    <span>versão do índice</span>
                  </div>
                </div>
              </div>

              <div className={styles.searchPanel}>
                <div className={styles.searchBar}>
                  <Search aria-hidden="true" />
                  <label htmlFor="skill-search">Buscar no catálogo</label>
                  <input
                    id="skill-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Ex.: autenticação, Zod, RAG, deploy..."
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className={styles.clearSearch}
                      onClick={() => setSearchQuery('')}
                      aria-label="Limpar busca"
                    >
                      <X aria-hidden="true" />
                    </button>
                  )}
                  <span className={styles.searchHint} aria-live="polite">
                    {hasSearchQuery
                      ? `${visibleSkills.length} ${visibleSkills.length === 1 ? 'resultado' : 'resultados'}`
                      : 'mín. 2 caracteres'}
                  </span>
                </div>

                {hasSearchQuery && (
                  <div className={styles.searchResults} aria-label="Resultados rápidos da busca">
                    {quickResults.length > 0 ? (
                      <>
                        <div className={styles.searchResultList}>
                          {quickResults.map((skill) => (
                            <button
                              key={skill.id}
                              type="button"
                              onClick={() => handleOpenSkill(skill.id)}
                            >
                              <strong>{skill.name}</strong>
                              <code>/{skill.id}</code>
                              <span>Fase {skill.phase}</span>
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          className={styles.showCatalogResults}
                          onClick={showCatalogResults}
                        >
                          Ver {visibleSkills.length === 1 ? 'resultado' : `todos os ${visibleSkills.length} resultados`}
                          <ArrowUpRight aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <span className={styles.searchEmpty}>Nenhuma skill corresponde a “{searchQuery.trim()}”.</span>
                    )}
                  </div>
                )}
              </div>

              <SkillAdvisor skills={skills} onOpenSkill={handleOpenSkill} />
            </section>

            <section ref={catalogRef} className={styles.catalog} aria-labelledby="catalog-title">
              <div className={styles.catalogHeader}>
                <div>
                  <span className={styles.catalogEyebrow}>
                    {isFiltering ? 'Recorte ativo' : 'Índice completo'}
                  </span>
                  <h2 id="catalog-title">
                    {activePhaseData ? activePhaseData.name : 'Mapa completo de execução'}
                  </h2>
                  <p>
                    {activePhaseData
                      ? activePhaseData.description
                      : 'Navegue por fase ou busque pelo problema, tecnologia ou comando.'}
                  </p>
                </div>

                <div className={styles.catalogActions}>
                  <span className={styles.resultCount}>
                    <strong>{visibleSkills.length}</strong>
                    {visibleSkills.length === 1 ? ' resultado' : ' resultados'}
                  </span>
                  {isFiltering && (
                    <button type="button" className={styles.resetButton} onClick={resetFilters}>
                      Limpar filtros
                      <X aria-hidden="true" />
                    </button>
                  )}
                  <WebhookCheckButton
                    renderedCount={skills.length}
                    renderedHash={contentHash}
                    polling={polling}
                  />
                </div>
              </div>

              {sections.length === 0 ? (
                <div className={styles.emptyState}>
                  <CircleAlert aria-hidden="true" />
                  <div>
                    <h3>Nenhuma skill neste recorte</h3>
                    <p>Tente outro termo ou volte para a visão completa.</p>
                  </div>
                  <button type="button" onClick={resetFilters}>Ver todas as skills</button>
                </div>
              ) : (
                <div className={styles.sections}>
                  {sections.map((section) => (
                    <SkillSection
                      key={section.number}
                      section={section}
                      onOpenModal={handleOpenSkill}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        <footer className={styles.footer}>
          <span>Catálogo operacional IconsAI</span>
          <span>SKILL.md como fonte de verdade</span>
          <span>{skills.length} protocolos indexados</span>
        </footer>
      </main>

      <SkillModal
        skills={skills}
        skillId={modalSkillId}
        onClose={() => setModalSkillId(null)}
      />
    </>
  )
}

function SourceStatus({ source }: { source: 'github' | 'fallback' }) {
  const isLive = source === 'github'
  return (
    <span className={styles.sourceStatus} data-live={isLive}>
      <span className={styles.statusDot} />
      {isLive ? 'GitHub sincronizado' : 'Snapshot local'}
    </span>
  )
}

interface WebhookCheckButtonProps {
  renderedCount: number
  renderedHash: string
  polling: { hasNewSkills: boolean; remoteCount: number | null; refresh: () => void }
}

function WebhookCheckButton({ renderedCount, renderedHash, polling }: WebhookCheckButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'warn' | 'error'>('idle')
  const hasRemoteUpdate = polling.hasNewSkills && status === 'idle'

  const handleCheck = async () => {
    if (hasRemoteUpdate) {
      polling.refresh()
      return
    }

    setStatus('loading')
    try {
      const endpoint = buildSkillsApiUrl('/skills/api/skills/sync')
      const url = new URL(endpoint, window.location.origin)
      if (/^[a-f0-9]{12}$/.test(renderedHash)) {
        url.searchParams.set('current_hash', renderedHash)
      }
      const response = await fetch(`${url.pathname}${url.search}`, { cache: 'no-store' })
      const payload = skillsSyncHealthResponseSchema.safeParse(await response.json())
      if (!response.ok || !payload.success || !payload.data.ok) {
        setStatus('error')
      } else {
        const remoteCount = Number(payload.data.checks.skillCount)
        const remoteHash = payload.data.checks.contentHash ?? ''
        setStatus(
          remoteCount !== renderedCount || (remoteHash && remoteHash !== renderedHash)
            ? 'warn'
            : 'ok',
        )
      }
    } catch {
      setStatus('error')
    }

    window.setTimeout(() => setStatus('idle'), 4000)
  }

  const effectiveStatus = hasRemoteUpdate ? 'warn' : status
  const label = effectiveStatus === 'warn'
    ? 'Atualização disponível'
    : effectiveStatus === 'ok'
      ? 'Índice sincronizado'
      : effectiveStatus === 'error'
        ? 'Falha ao verificar'
        : effectiveStatus === 'loading'
          ? 'Verificando índice'
          : 'Verificar índice'

  return (
    <button
      type="button"
      className={styles.syncButton}
      data-status={effectiveStatus}
      onClick={handleCheck}
      disabled={status === 'loading'}
    >
      {effectiveStatus === 'ok' ? (
        <Check aria-hidden="true" />
      ) : effectiveStatus === 'error' ? (
        <Database aria-hidden="true" />
      ) : (
        <RefreshCw aria-hidden="true" data-spinning={status === 'loading'} />
      )}
      {label}
    </button>
  )
}
