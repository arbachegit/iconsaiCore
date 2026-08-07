import { PHASE_COLOR_RAW } from '@/data/phases'
import type { Skill } from '@/lib/github/types'

import SkillCard from './skill-card'
import styles from './skills.module.css'

interface SkillSectionData {
  name: string
  number: string
  description: string
  subtitle: string
  skills: Skill[]
}

interface SkillsSectionProps {
  section: SkillSectionData
  onOpenModal?: (skillId: string) => void
}

export default function SkillsSection({ section, onOpenModal }: SkillsSectionProps) {
  const accent = PHASE_COLOR_RAW[section.number] || '#22d3ee'

  return (
    <section
      className={styles.section}
      id={`fase-${section.number}`}
      style={{ '--phase-color': accent } as React.CSSProperties}
    >
      <div className={styles.sectionIndex} aria-hidden="true">
        {section.number.padStart(2, '0')}
      </div>

      <div className={styles.sectionContent}>
        <header className={styles.sectionHeader}>
          <div className={styles.sectionTitleGroup}>
            <span>{section.subtitle}</span>
            <h3>{section.name}</h3>
            <p>{section.description}</p>
          </div>
          <span className={styles.sectionCount}>
            {section.skills.length.toString().padStart(2, '0')}
            <small>skills</small>
          </span>
        </header>

        <div className={styles.cardGrid}>
          {section.skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onOpenModal={onOpenModal}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
