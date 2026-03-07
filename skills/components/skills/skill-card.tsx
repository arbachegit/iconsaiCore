'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { PHASE_COLOR_RAW } from '@/data/phases'
import type { Skill } from '@/lib/github/types'

import styles from './skills.module.css'

interface SkillCardProps {
  skill: Skill
  glowing?: boolean
  onOpenModal?: (skillName: string) => void
}

export default function SkillCard({ skill, glowing, onOpenModal }: SkillCardProps) {
  const [copied, setCopied] = useState(false)
  const accent = PHASE_COLOR_RAW[skill.phase] || '#22d3ee'

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(skill.trigger)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const status = skill.isNew ? 'new' : 'active'

  return (
    <article className={`${styles.card} ${glowing ? styles.cardGlow : ''}`}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>{skill.name}</h3>
          <p className={styles.cardName}>{skill.id}</p>
        </div>
        <span className={styles.statusBadge} data-status={status}>
          {status}
        </span>
      </div>

      <p className={styles.cardDescription}>
        {skill.description || 'Sem descricao informada para esta skill.'}
      </p>

      <div className={styles.cardMeta}>
        <span
          className={styles.phaseBadge}
          style={{ color: accent, borderColor: `${accent}40`, backgroundColor: `${accent}18` }}
        >
          {skill.phaseName ? `${skill.phase}. ${skill.phaseName}` : `Fase ${skill.phase}`}
        </span>
        <code className={styles.triggerCode}>{skill.trigger}</code>
      </div>

      <div className={styles.tags}>
        {skill.techs.length === 0 ? (
          <span className={styles.tagMuted}>sem tags</span>
        ) : (
          skill.techs.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))
        )}
      </div>

      {/* Footer actions */}
      <div className={styles.cardActions}>
        <button
          onClick={handleCopy}
          className={styles.cardActionBtn}
          title="Copiar comando"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (onOpenModal) onOpenModal(skill.name)
          }}
          className={styles.cardActionBtn}
          title="Ver detalhes da skill"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </article>
  )
}
