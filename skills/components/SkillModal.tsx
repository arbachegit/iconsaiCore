'use client'

import { useEffect, useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { PHASES, PHASE_COLOR_RAW } from '@/data/phases'
import { useSkillDoc } from '@/lib/use-skill-doc'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import type { Skill } from '@/lib/github/types'

interface SkillModalProps {
  skills: Skill[]
  skillId: string | null
  onClose: () => void
}

export default function SkillModal({ skills, skillId, onClose }: SkillModalProps) {
  const [copied, setCopied] = useState(false)
  const skill = skillId ? skills.find((s) => s.id === skillId) : null
  const phase = skill ? PHASES.find((p) => p.number === skill.phase) : null
  const color = skill ? PHASE_COLOR_RAW[skill.phase] || '#22d3ee' : '#22d3ee'
  const { doc: fullDoc, loading } = useSkillDoc(skillId)

  useEffect(() => {
    if (!skillId) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [skillId, onClose])

  if (!skill) return null

  const handleCopy = async () => {
    const text = fullDoc || skill.description
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--brd)] bg-[var(--bg-card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 pb-4 bg-[var(--bg-card)] border-b border-[var(--brd)]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <p
                className="text-xs font-mono uppercase tracking-wider"
                style={{ color }}
              >
                {phase ? `${phase.number}. ${phase.name}` : skill.phaseName}
              </p>
              <code className="text-xs font-mono text-[var(--cy)]">{skill.trigger}</code>
            </div>
            <h2 className="mt-1 text-lg font-bold text-[var(--t1)]">{skill.name}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
              title="Copy skill content"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-[var(--t2)]" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 text-[var(--t2)]" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading ? (
            <div className="flex items-center gap-3 py-8 justify-center text-[var(--t3)]">
              <span className="w-4 h-4 border-2 border-[var(--cy)] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Carregando skill...</span>
            </div>
          ) : fullDoc ? (
            <MarkdownRenderer content={fullDoc} className="md-content" />
          ) : (
            <div className="space-y-5">
              {/* Description */}
              <p className="text-sm text-[var(--t2)] leading-relaxed">
                {skill.description}
              </p>

              {/* Techs */}
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--t3)] mb-2">
                  Tecnologias
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skill.techs.map((tech) => (
                    <span
                      key={tech}
                      className="px-2.5 py-1 rounded-full text-xs font-mono"
                      style={{
                        backgroundColor: `${color}18`,
                        color: color,
                        border: `1px solid ${color}30`,
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Examples */}
              {skill.examples.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--t3)] mb-2">
                    Quando usar
                  </h3>
                  <ul className="space-y-1.5">
                    {skill.examples.map((ex, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--t2)]">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Commands */}
              {skill.commands.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--t3)] mb-2">
                    Comandos
                  </h3>
                  <div className="space-y-1.5">
                    {skill.commands.map((cmd) => (
                      <code
                        key={cmd}
                        className="block px-3 py-2 rounded-lg bg-[var(--bg-deep)] text-sm font-mono text-[var(--cy)] border border-[var(--brd)]"
                      >
                        {cmd}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {/* Status */}
              {skill.isNew && (
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: color }} />
                  </span>
                  <span className="text-xs font-mono uppercase tracking-wider" style={{ color }}>
                    New
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
