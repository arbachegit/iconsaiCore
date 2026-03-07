'use client'

import { useRef, useState, useCallback } from 'react'
import styles from '@/components/skills/skills.module.css'
import SkillSection from '@/components/skills/skills-section'
import PhaseNav from '@/components/PhaseNav'
import SkillModal from '@/components/SkillModal'
import SkillsTable from '@/components/SkillsTable'
import { PHASES } from '@/data/phases'
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
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const sections = groupByPhase(skills)

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

  return (
    <>
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.hero}>
            {/* Top row: logo */}
            <div className="flex justify-between items-start">
              <p className={styles.eyebrow}>Repositorio fonte: iconsaiConfig</p>
              <img
                src="/skills/logo.png"
                alt="IconsAI"
                className="h-10 w-auto opacity-90"
              />
            </div>

            {/* Title & description */}
            <h1 className={styles.title}>Catalogo de Skills</h1>
            <p className={styles.description}>
              A pagina publica em <code>/skills</code> e atualizada por webhook sempre que o
              repositorio fonte recebe alteracoes em YAML.
              {dataSource === 'fallback' && (
                <span className="ml-2 text-xs text-[var(--yl)]">(offline — dados em cache)</span>
              )}
            </p>

            {/* Bottom row: stats on left, nav on right */}
            <div className="flex items-end justify-between gap-6 flex-wrap mt-7">
              <div className="flex items-end gap-4 flex-wrap">
                <div className={styles.metric}>
                  <span className={styles.metricValue}>{skills.length}</span>
                  <span className={styles.metricLabel}>skills validas</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>{sections.length}</span>
                  <span className={styles.metricLabel}>secoes</span>
                </div>
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
            {sections.map((section) => (
              <div
                key={section.name}
                ref={(el) => {
                  if (el) sectionRefs.current.set(section.name, el)
                }}
              >
                <SkillSection section={section} glowingSkill={glowingSkill} onOpenModal={handleOpenModalByName} />
              </div>
            ))}
          </div>
        </div>
      </main>

      <SkillModal skills={skills} skillId={modalSkillId} onClose={handleCloseModal} />
      <SkillsTable skills={skills} open={showTable} onClose={() => setShowTable(false)} onOpenSkillModal={handleOpenModal} />
    </>
  )
}
