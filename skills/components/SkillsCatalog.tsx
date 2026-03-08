'use client'

import { useRef, useState, useCallback, useMemo } from 'react'
import styles from '@/components/skills/skills.module.css'
import SkillSection from '@/components/skills/skills-section'
import PhaseNav from '@/components/PhaseNav'
import SkillModal from '@/components/SkillModal'
import SkillsTable from '@/components/SkillsTable'
import { PHASES } from '@/data/phases'
import { useNewSkillsPolling } from '@/hooks/use-new-skills-polling'
import type { Skill } from '@/lib/github/types'

interface SkillsCatalogProps {
  skills: Skill[]
  dataSource: 'github' | 'fallback'
}

interface SkillSectionData {
  name: string
  skills: Skill[]
}

function groupByPhase(skills: Skill[]): SkillSectionData[] {
  const grouped = new Map<string, Skill[]>()
  for (const skill of skills) {
    const phase = PHASES.find((p) => p.number === skill.phase)
    const sectionName = phase ? `${phase.number}. ${phase.name}` : skill.phaseName
    const list = grouped.get(sectionName) ?? []
    list.push(skill)
    grouped.set(sectionName, list)
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([name, sectionSkills]) => ({ name, skills: sectionSkills }))
}

export default function SkillsCatalog({ skills = [], dataSource = 'fallback' }: SkillsCatalogProps) {
  const [modalSkillId, setModalSkillId] = useState<string | null>(null)
  const [activePhase, setActivePhase] = useState<string | null>(null)
  const [glowingSkill, setGlowingSkill] = useState<string | null>(null)
  const [showTable, setShowTable] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const polling = useNewSkillsPolling(skills.length)

  const allSections = groupByPhase(skills)

  // Filter skills when search has 2+ chars
  const filteredSkills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q.length < 2) return skills
    return skills.filter(
      (sk) =>
        sk.name.toLowerCase().includes(q) ||
        sk.id.toLowerCase().includes(q) ||
        sk.description.toLowerCase().includes(q) ||
        sk.keywords.toLowerCase().includes(q) ||
        sk.techs.some((t) => t.toLowerCase().includes(q)),
    )
  }, [skills, searchQuery])

  const sections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q.length < 2) return allSections
    return groupByPhase(filteredSkills)
  }, [searchQuery, allSections, filteredSkills])

  const handleScrollToPhase = useCallback((phaseNumber: string, skillName?: string) => {
    setActivePhase(phaseNumber)
    const phase = PHASES.find((p) => p.number === phaseNumber)
    if (!phase) return
    const sectionName = `${phase.number}. ${phase.name}`
    const el = sectionRefs.current.get(sectionName)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (skillName) {
        setGlowingSkill(skillName)
        setTimeout(() => setGlowingSkill(null), 3000)
      }
    }
  }, [])

  const handleOpenModal = useCallback((skillId: string) => {
    setModalSkillId(skillId)
  }, [])

  const handleOpenModalByName = useCallback((skillName: string) => {
    const skill = skills.find((s) => s.name === skillName)
    if (skill) setModalSkillId(skill.id)
  }, [skills])

  const handleCloseModal = useCallback(() => {
    setModalSkillId(null)
  }, [])

  const handleOpenTable = useCallback(() => {
    setShowTable(true)
  }, [])

  const isFiltering = searchQuery.trim().length >= 2

  return (
    <>
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.hero}>
            {/* Top row: logo */}
            <div className="flex justify-between items-start">
              <p className={styles.eyebrow}>Repositório fonte: iconsaiConfig</p>
              <img
                src="/skills/logo.png"
                alt="IconsAI"
                className="h-10 w-auto opacity-90"
              />
            </div>

            {/* Title & description */}
            <h1 className={styles.title}>Catálogo de Skills</h1>
            <p className={styles.description}>
              A página pública em <code>/skills</code> é atualizada por webhook sempre que o
              repositório fonte recebe alterações em YAML.
              {dataSource === 'fallback' && (
                <span className="ml-2 text-xs text-[var(--yl)]">(offline — dados em cache)</span>
              )}
            </p>

            {/* Bottom row: stats | search + webhook | nav */}
            <div className="flex items-end justify-between gap-6 flex-wrap mt-7">
              <div className="flex items-end gap-4 flex-wrap">
                <div className={styles.metric}>
                  <span className={styles.metricValue}>
                    {isFiltering ? filteredSkills.length : skills.length}
                  </span>
                  <span className={styles.metricLabel}>
                    {isFiltering ? 'encontradas' : 'skills válidas'}
                  </span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>{sections.length}</span>
                  <span className={styles.metricLabel}>seções</span>
                </div>
              </div>

              {/* Search + Webhook check */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <svg
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--t3)] pointer-events-none"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar..."
                    className="w-40 h-9 pl-8 pr-3 rounded-full border border-[rgba(34,211,238,0.3)] bg-transparent text-xs font-mono text-[var(--t1)] placeholder:text-[var(--t3)] outline-none focus:border-[var(--cy)] transition-colors"
                  />
                </div>
                <WebhookCheckButton renderedCount={skills.length} polling={polling} />
              </div>

              <PhaseNav
                skills={skills}
                activePhase={activePhase}
                onScrollToPhase={handleScrollToPhase}
                onOpenSkillModal={handleOpenModal}
                onOpenTable={handleOpenTable}
              />
            </div>
          </section>

          <div className={styles.sections}>
            {sections.length === 0 && isFiltering ? (
              <div className="text-center py-16 text-[var(--t3)] text-sm font-mono">
                Nenhuma skill encontrada para &quot;{searchQuery}&quot;
              </div>
            ) : (
              sections.map((section) => (
                <div
                  key={section.name}
                  ref={(el) => {
                    if (el) sectionRefs.current.set(section.name, el)
                  }}
                >
                  <SkillSection section={section} glowingSkill={glowingSkill} onOpenModal={handleOpenModalByName} />
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <SkillModal skills={skills} skillId={modalSkillId} onClose={handleCloseModal} />
      <SkillsTable skills={skills} open={showTable} onClose={() => setShowTable(false)} onOpenSkillModal={handleOpenModal} />
    </>
  )
}

/* ─── Webhook Check Button ─── */
interface WebhookCheckButtonProps {
  renderedCount: number
  polling: { hasNewSkills: boolean; remoteCount: number | null; refresh: () => void }
}

function WebhookCheckButton({ renderedCount, polling }: WebhookCheckButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'warn' | 'error'>('idle')
  const [tooltip, setTooltip] = useState('Verificar webhook')

  // When polling detects new skills, auto-activate the button to green
  const isNewDetected = polling.hasNewSkills && status === 'idle'

  const handleCheck = async () => {
    // If new skills detected by polling, reload the page
    if (isNewDetected) {
      polling.refresh()
      return
    }

    setStatus('loading')
    setTooltip('Verificando...')
    try {
      const res = await fetch('/skills/api/skills/sync', { cache: 'no-store' })
      const data = await res.json()

      if (!data.ok) {
        const failures = Object.entries(data.checks as Record<string, string>)
          .filter(([, v]) => v !== 'ok')
          .map(([k]) => k)
        setStatus('error')
        setTooltip(`Falha: ${failures.join(', ')}`)
      } else {
        const ghCount = Number(data.checks?.skillCount ?? 0)
        if (ghCount !== renderedCount) {
          setStatus('warn')
          setTooltip(`Desync: GitHub ${ghCount} vs Página ${renderedCount}`)
        } else {
          setStatus('ok')
          setTooltip(`OK — ${ghCount} skills sincronizadas`)
        }
      }
    } catch {
      setStatus('error')
      setTooltip('Endpoint inacessível')
    }
    setTimeout(() => {
      setStatus('idle')
      setTooltip('Verificar webhook')
    }, 4000)
  }

  const effectiveStatus = isNewDetected ? 'new' : status

  const borderColor =
    effectiveStatus === 'new' || effectiveStatus === 'ok'
      ? 'rgba(74,222,128,0.6)'
      : effectiveStatus === 'warn'
        ? 'rgba(250,204,21,0.6)'
        : effectiveStatus === 'error'
          ? 'rgba(248,113,113,0.6)'
          : 'rgba(34,211,238,0.3)'

  const iconColor =
    effectiveStatus === 'new' || effectiveStatus === 'ok'
      ? '#4ade80'
      : effectiveStatus === 'warn'
        ? '#facc15'
        : effectiveStatus === 'error'
          ? '#f87171'
          : 'var(--cy)'

  const glowStyle = isNewDetected
    ? { borderColor, color: iconColor, backgroundColor: 'transparent', boxShadow: '0 0 12px rgba(74,222,128,0.5), 0 0 32px rgba(74,222,128,0.15)', animation: 'webhookGlow 2s ease-in-out infinite' }
    : { borderColor, color: iconColor, backgroundColor: 'transparent' }

  const newTooltip = isNewDetected
    ? `${polling.remoteCount !== null ? `${Math.abs(polling.remoteCount - renderedCount)} nova(s) skill(s) — clique para atualizar` : 'Novas skills — clique para atualizar'}`
    : tooltip

  return (
    <>
      {isNewDetected && (
        <style>{`@keyframes webhookGlow { 0%,100% { box-shadow: 0 0 12px rgba(74,222,128,0.5), 0 0 32px rgba(74,222,128,0.15); } 50% { box-shadow: 0 0 20px rgba(74,222,128,0.7), 0 0 48px rgba(74,222,128,0.25); } }`}</style>
      )}
      <button
        onClick={handleCheck}
        disabled={status === 'loading'}
        className="group relative flex items-center justify-center w-9 h-9 rounded-full border text-xs font-bold transition-all duration-300 ease-out hover:scale-110 focus:outline-none cursor-pointer disabled:opacity-60"
        style={glowStyle}
      >
        {status === 'loading' ? (
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : isNewDetected ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : status === 'ok' ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : status === 'error' ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : status === 'warn' ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        )}
        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1a1a1a] border border-[#333] px-2.5 py-1 text-[11px] font-normal text-[#ccc] opacity-0 group-hover:opacity-100 transition-opacity">
          {newTooltip}
        </span>
      </button>
    </>
  )
}
