'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { X, Copy, Check, Search, ArrowUpDown, ArrowUp, ArrowDown, Table2 } from 'lucide-react'
import { PHASES, PHASE_COLOR_RAW } from '@/data/phases'
import type { Skill } from '@/lib/github/types'

type SortField = 'name' | 'trigger' | 'phase' | 'status'
type SortDir = 'asc' | 'desc'

interface SkillsTableProps {
  skills: Skill[]
  open: boolean
  onClose: () => void
  onOpenSkillModal: (skillId: string) => void
}

export default function SkillsTable({ skills, open, onClose, onOpenSkillModal }: SkillsTableProps) {
  const [search, setSearch] = useState('')
  const [activePhase, setActivePhase] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('phase')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const handleCopy = useCallback(async (e: React.MouseEvent, trigger: string) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(trigger)
    setCopiedId(trigger)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir('asc')
      return field
    })
  }, [])

  const filtered = useMemo(() => {
    let result = [...skills]

    if (activePhase) {
      result = result.filter((s) => s.phase === activePhase)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.trigger.toLowerCase().includes(q) ||
          s.techs.some((t) => t.toLowerCase().includes(q)) ||
          s.description.toLowerCase().includes(q) ||
          s.keywords.toLowerCase().includes(q)
      )
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'trigger':
          cmp = a.trigger.localeCompare(b.trigger)
          break
        case 'phase':
          cmp = parseInt(a.phase) - parseInt(b.phase)
          break
        case 'status': {
          const sa = a.isNew ? 0 : 1
          const sb = b.isNew ? 0 : 1
          cmp = sa - sb
          break
        }
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [skills, search, activePhase, sortField, sortDir])

  if (!open) return null

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[var(--cy)]" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[var(--cy)]" />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-[1100px] max-h-[88vh] flex flex-col rounded-2xl border border-[var(--brd)] bg-[var(--bg-card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--brd)] shrink-0">
          <div className="flex items-center gap-4">
            <Table2 className="w-5 h-5 text-[var(--cy)]" />
            <h2 className="text-lg font-bold text-[var(--t1)]">Skills Implementation</h2>
            <span className="px-3 py-1 rounded-full text-xs font-mono text-[var(--cy)]" style={{ backgroundColor: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)' }}>
              {filtered.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-[var(--t2)]" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-8 py-5 border-b border-[var(--brd)] space-y-4 shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t3)]" />
            <input
              type="text"
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-[var(--bg-deep)] border border-[var(--brd)] text-sm text-[var(--t1)] placeholder:text-[var(--t3)] focus:outline-none focus:border-[var(--cy)]/40 transition-colors"
            />
          </div>

          {/* Phase chips */}
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setActivePhase(null)}
              className="px-4 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer"
              style={{
                backgroundColor: !activePhase ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.03)',
                color: !activePhase ? '#22d3ee' : 'var(--t3)',
                border: `1px solid ${!activePhase ? 'rgba(34,211,238,0.25)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              All
            </button>
            {PHASES.map((phase) => {
              const isActive = activePhase === phase.number
              const color = PHASE_COLOR_RAW[phase.number]
              const shortName = phase.name.split('/')[0].trim()
              return (
                <button
                  key={phase.number}
                  onClick={() => setActivePhase(isActive ? null : phase.number)}
                  className="px-4 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer"
                  style={{
                    backgroundColor: isActive ? `${color}15` : 'rgba(255,255,255,0.03)',
                    color: isActive ? color : 'var(--t3)',
                    border: `1px solid ${isActive ? `${color}30` : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {phase.number}. {shortName}
                </button>
              )
            })}
          </div>
        </div>

        {/* Table body (scrollable) */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Desktop table */}
          <table className="w-full hidden md:table">
            <thead className="sticky top-0 z-10 bg-[var(--bg-card)]">
              <tr className="border-b border-[var(--brd)]">
                <th className="text-left px-8 py-4">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--t3)] hover:text-[var(--t2)] transition-colors cursor-pointer"
                  >
                    Name <SortIcon field="name" />
                  </button>
                </th>
                <th className="text-left px-6 py-4">
                  <button
                    onClick={() => handleSort('trigger')}
                    className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--t3)] hover:text-[var(--t2)] transition-colors cursor-pointer"
                  >
                    Route <SortIcon field="trigger" />
                  </button>
                </th>
                <th className="text-left px-6 py-4">
                  <button
                    onClick={() => handleSort('phase')}
                    className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--t3)] hover:text-[var(--t2)] transition-colors cursor-pointer"
                  >
                    Phase <SortIcon field="phase" />
                  </button>
                </th>
                <th className="text-left px-6 py-4">
                  <span className="text-xs font-mono uppercase tracking-wider text-[var(--t3)]">
                    Techs
                  </span>
                </th>
                <th className="text-left px-6 py-4">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--t3)] hover:text-[var(--t2)] transition-colors cursor-pointer"
                  >
                    Status <SortIcon field="status" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((skill) => {
                const phase = PHASES.find((p) => p.number === skill.phase)
                const color = PHASE_COLOR_RAW[skill.phase] || '#22d3ee'
                return (
                  <tr
                    key={skill.id}
                    className="border-b border-[var(--brd)] hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Name */}
                    <td className="px-8 py-4">
                      <button
                        onClick={() => onOpenSkillModal(skill.id)}
                        className="text-sm font-medium text-[var(--t1)] hover:text-[var(--cy)] transition-colors text-left cursor-pointer"
                      >
                        {skill.name}
                      </button>
                    </td>

                    {/* Route */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <code className="text-xs font-mono text-[var(--t2)] truncate max-w-[200px]">
                          {skill.trigger}
                        </code>
                        <button
                          onClick={(e) => handleCopy(e, skill.trigger)}
                          className="p-1.5 rounded-md hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                          title="Copy route"
                        >
                          {copiedId === skill.trigger ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-[var(--t3)]" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Phase */}
                    <td className="px-6 py-4">
                      <span
                        className="inline-block px-3.5 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap"
                        style={{
                          backgroundColor: `${color}12`,
                          color,
                          border: `1px solid ${color}25`,
                        }}
                      >
                        {phase ? `${phase.number}. ${phase.name.split('/')[0].trim()}` : skill.phaseName}
                      </span>
                    </td>

                    {/* Techs */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {skill.techs.slice(0, 3).map((tech) => (
                          <span
                            key={tech}
                            className="px-2.5 py-1 rounded-md text-[11px] font-mono text-[var(--t2)]"
                            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                          >
                            {tech}
                          </span>
                        ))}
                        {skill.techs.length > 3 && (
                          <span className="px-2.5 py-1 text-[11px] font-mono text-[var(--t3)]">
                            +{skill.techs.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {skill.isNew ? (
                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono" style={{ backgroundColor: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.15)' }}>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22d3ee] opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22d3ee]" />
                          </span>
                          new
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-mono" style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--t3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          active
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center text-sm text-[var(--t3)]">
                    No skills found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile card layout */}
          <div className="md:hidden p-6 space-y-4">
            {filtered.map((skill) => {
              const phase = PHASES.find((p) => p.number === skill.phase)
              const color = PHASE_COLOR_RAW[skill.phase] || '#22d3ee'
              return (
                <div
                  key={skill.id}
                  className="p-5 rounded-xl bg-[var(--bg-deep)] border border-[var(--brd)] space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => onOpenSkillModal(skill.id)}
                      className="text-sm font-medium text-[var(--t1)] hover:text-[var(--cy)] transition-colors text-left cursor-pointer"
                    >
                      {skill.name}
                    </button>
                    {skill.isNew ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[11px] font-mono shrink-0" style={{ backgroundColor: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.15)' }}>
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22d3ee] opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#22d3ee]" />
                        </span>
                        new
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-mono shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--t3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <code className="flex-1 text-xs font-mono text-[var(--t2)] truncate">
                      {skill.trigger}
                    </code>
                    <button
                      onClick={(e) => handleCopy(e, skill.trigger)}
                      className="p-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                      title="Copy route"
                    >
                      {copiedId === skill.trigger ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[var(--t3)]" />
                      )}
                    </button>
                  </div>

                  <span
                    className="inline-block px-3.5 py-1.5 rounded-lg text-xs font-mono"
                    style={{
                      backgroundColor: `${color}12`,
                      color,
                      border: `1px solid ${color}25`,
                    }}
                  >
                    {phase ? `${phase.number}. ${phase.name.split('/')[0].trim()}` : skill.phaseName}
                  </span>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div className="py-16 text-center text-sm text-[var(--t3)]">
                No skills found matching your filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
