'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Copy, FileText, ListChecks, Sparkles, Target, X } from 'lucide-react'
import { getHubMembers } from '@/data/catalog-groups'
import { PHASES, PHASE_COLOR_RAW } from '@/data/phases'
import { useSkillDoc } from '@/lib/use-skill-doc'
import { buildSkillSummary, formatSkillSummary } from '@/lib/skill-summary'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import type { Skill } from '@/lib/github/types'

interface SkillModalProps {
  skills: Skill[]
  skillId: string | null
  onClose: () => void
  onNavigateSkill: (skillId: string) => void
}

export default function SkillModal({ skills, skillId, onClose, onNavigateSkill }: SkillModalProps) {
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'summary' | 'complete'>('summary')
  const skill = skillId ? skills.find((s) => s.id === skillId) : null
  const phase = skill ? PHASES.find((p) => p.number === skill.phase) : null
  const color = skill ? PHASE_COLOR_RAW[skill.phase] || '#22d3ee' : '#22d3ee'
  const { doc: fullDoc, loading } = useSkillDoc(skillId)
  const hubMembers = skillId
    ? getHubMembers(skillId)
      .map((memberId) => skills.find((candidate) => candidate.id === memberId))
      .filter((member): member is Skill => Boolean(member))
    : []

  useEffect(() => {
    setViewMode('summary')
    setCopied(false)
  }, [skillId])

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

  const summary = buildSkillSummary(skill, fullDoc)

  const handleCopy = async () => {
    const text = viewMode === 'complete' && fullDoc ? fullDoc : formatSkillSummary(summary)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const status = skill.isNew ? 'new' : 'active'

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
            <div className="flex items-center gap-3 flex-wrap">
              <p
                className="text-xs font-mono uppercase tracking-wider"
                style={{ color }}
              >
                {phase ? `${phase.number}. ${phase.name}` : `${skill.phase}. ${skill.phaseName}`}
              </p>
              <code className="text-xs font-mono text-[var(--cy)]">{skill.trigger}</code>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
                style={{
                  backgroundColor: status === 'new' ? `${color}20` : 'rgba(74,222,128,0.15)',
                  color: status === 'new' ? color : '#4ade80',
                  border: `1px solid ${status === 'new' ? `${color}40` : 'rgba(74,222,128,0.3)'}`,
                }}
              >
                {status}
              </span>
            </div>
            <h2 className="mt-1 text-lg font-bold text-[var(--t1)]">{skill.name}</h2>
            <p className="mt-1 text-xs text-[var(--t3)]">
              {viewMode === 'summary' ? 'Sumário da skill' : 'Versão completa do SKILL.md'}
            </p>
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

        {/* Metadata bar */}
        <div className="px-5 py-3 border-b border-[var(--brd)] bg-[var(--bg-deep)]">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono text-[var(--t3)]">
            <span>
              <span className="text-[var(--t3)] opacity-60">id:</span>{' '}
              <span className="text-[var(--t2)]">{skill.id}</span>
            </span>
            <span>
              <span className="text-[var(--t3)] opacity-60">version:</span>{' '}
              <span style={{ color }}>{skill.version}</span>
            </span>
            <span>
              <span className="text-[var(--t3)] opacity-60">phase:</span>{' '}
              <span className="text-[var(--t2)]">{skill.phase} — {skill.phaseName}</span>
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {viewMode === 'summary' ? (
          loading && !fullDoc ? (
            <div className="flex items-center justify-center gap-3 py-12 text-[var(--t3)]">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--cy)] border-t-transparent" />
              <span className="text-sm">Preparando um sumário didático...</span>
            </div>
          ) : (
          <div className="space-y-6">
            <section className="rounded-xl border border-[var(--brd)] bg-[var(--bg-deep)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color }} aria-hidden="true" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--t3)]">
                  Em poucas palavras
                </h3>
              </div>
              <p className="text-[15px] text-[var(--t1)] leading-7">
                {summary.explanation}
              </p>
            </section>

            {(summary.howItWorks.length > 0 || summary.whenToUse.length > 0) && (
              <div className="grid gap-5 sm:grid-cols-2">
                {summary.howItWorks.length > 0 && (
                  <section>
                    <div className="mb-3 flex items-center gap-2">
                      <ListChecks className="h-4 w-4" style={{ color }} aria-hidden="true" />
                      <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--t3)]">
                        Como funciona
                      </h3>
                    </div>
                    <ol className="space-y-2.5">
                      {summary.howItWorks.map((item, index) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-[var(--t2)]">
                          <span
                            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold font-mono"
                            style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}35` }}
                          >
                            {index + 1}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {summary.whenToUse.length > 0 && (
                  <section>
                    <div className="mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" style={{ color }} aria-hidden="true" />
                      <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--t3)]">
                        Quando usar
                      </h3>
                    </div>
                    <ul className="space-y-2.5">
                      {summary.whenToUse.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-[var(--t2)]">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}

            {summary.outcome && (
              <section className="border-l-2 pl-4" style={{ borderColor: color }}>
                <h3 className="mb-2 text-xs font-mono uppercase tracking-wider text-[var(--t3)]">
                  O que entrega
                </h3>
                <p className="text-sm leading-6 text-[var(--t2)]">{summary.outcome}</p>
              </section>
            )}

            {/* Techs */}
            {skill.techs.length > 0 && (
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

            {hubMembers.length > 0 && (
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--t3)] mb-2">
                  Skills contidas neste hub
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {hubMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => onNavigateSkill(member.id)}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[var(--brd)] bg-[var(--bg-deep)] px-3 py-2.5 text-left transition-colors hover:border-[var(--cy)] hover:bg-[var(--bg-surface)] cursor-pointer"
                    >
                      <span className="min-w-0">
                        <strong className="block truncate text-sm text-[var(--t1)]">{member.name}</strong>
                        <code className="block truncate text-xs text-[var(--t3)]">{member.trigger}</code>
                      </span>
                      <FileText className="h-4 w-4 shrink-0 text-[var(--cy)]" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setViewMode('complete')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--cy)] bg-[var(--bg-deep)] px-4 py-3 text-sm font-bold text-[var(--cy)] transition-colors hover:bg-[var(--bg-surface)] cursor-pointer"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Versão completa
            </button>
          </div>
          )
          ) : loading ? (
            <div className="flex items-center gap-3 py-8 justify-center text-[var(--t3)]">
              <span className="w-4 h-4 border-2 border-[var(--cy)] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Carregando documentação completa...</span>
            </div>
          ) : fullDoc ? (
            <div>
              <button
                type="button"
                onClick={() => setViewMode('summary')}
                className="mb-5 inline-flex items-center gap-2 rounded-lg border border-[var(--brd)] px-3 py-2 text-xs font-bold text-[var(--t2)] hover:border-[var(--cy)] hover:text-[var(--cy)] cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Voltar ao sumário
              </button>
              <MarkdownRenderer content={fullDoc} className="md-content" />
            </div>
          ) : (
            <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-300">
              O conteúdo completo desta skill não está disponível no snapshot atual.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
