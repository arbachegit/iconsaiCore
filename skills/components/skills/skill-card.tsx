'use client'

import { useState } from 'react'
import { ArrowUpRight, Check, Copy } from 'lucide-react'

import { PHASE_COLOR_RAW } from '@/data/phases'
import type { Skill } from '@/lib/github/types'

import styles from './skills.module.css'

interface SkillCardProps {
  skill: Skill
  onOpenModal?: (skillId: string) => void
  accent?: string
}

export default function SkillCard({ skill, onOpenModal, accent: accentOverride }: SkillCardProps) {
  const [copied, setCopied] = useState(false)
  const accent = accentOverride || PHASE_COLOR_RAW[skill.phase] || '#22d3ee'
  const visibleTechs = skill.techs.slice(0, 3)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(skill.trigger)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <article
      className={styles.card}
      style={{ '--phase-color': accent } as React.CSSProperties}
    >
      <div className={styles.cardTopline}>
        <span className={styles.cardPhase}>F{skill.phase.padStart(2, '0')}</span>
        <span className={styles.cardVersion}>v{skill.version}</span>
        {skill.isNew && <span className={styles.newBadge}>nova</span>}
      </div>

      <div className={styles.cardBody}>
        <button
          type="button"
          className={styles.cardTitleButton}
          onClick={() => onOpenModal?.(skill.id)}
        >
          <span>{skill.name}</span>
          <ArrowUpRight aria-hidden="true" />
        </button>
        <p className={styles.cardId}>{skill.id}</p>
        <p className={styles.cardDescription}>
          {skill.description || 'Sem descrição informada para esta skill.'}
        </p>
      </div>

      <div className={styles.tags} aria-label="Tecnologias">
        {visibleTechs.length > 0 ? (
          <>
            {visibleTechs.map((tech) => (
              <span key={tech} className={styles.tag}>{tech}</span>
            ))}
            {skill.techs.length > 3 && <span className={styles.tagMuted}>mais</span>}
          </>
        ) : (
          <span className={styles.tagMuted}>protocolo transversal</span>
        )}
      </div>

      <div className={styles.cardFooter}>
        <code title={skill.trigger}>{skill.trigger}</code>
        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.showButton}
            onClick={() => onOpenModal?.(skill.id)}
          >
            Mostrar
          </button>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? 'Comando copiado' : `Copiar ${skill.trigger}`}
            title={copied ? 'Comando copiado' : 'Copiar comando'}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          </button>
        </div>
      </div>
    </article>
  )
}
