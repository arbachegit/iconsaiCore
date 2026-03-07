import type { Skill } from '@/lib/github/types'

import SkillCard from './skill-card'
import styles from './skills.module.css'

interface SkillSectionData {
  name: string
  skills: Skill[]
}

interface SkillsSectionProps {
  section: SkillSectionData
  glowingSkill?: string | null
  onOpenModal?: (skillName: string) => void
}

function formatSectionName(sectionName: string): string {
  return sectionName
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function SkillsSection({ section, glowingSkill, onOpenModal }: SkillsSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>Secao</p>
          <h2 className={styles.sectionTitle}>{formatSectionName(section.name)}</h2>
        </div>
        <span className={styles.sectionCount}>{section.skills.length} skills</span>
      </div>

      <div className={styles.cardGrid}>
        {section.skills.map((skill) => (
          <SkillCard
            key={skill.name}
            skill={skill}
            glowing={glowingSkill === skill.name}
            onOpenModal={onOpenModal}
          />
        ))}
      </div>
    </section>
  )
}
