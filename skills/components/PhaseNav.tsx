'use client'

import { useState, useMemo } from 'react'
import { Copy, Check, ExternalLink, Table2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PHASES } from '@/data/phases'
import type { Skill } from '@/lib/github/types'

interface PhaseNavProps {
  skills: Skill[]
  activePhase: string | null
  onScrollToPhase: (phaseNumber: string, skillName?: string) => void
  onOpenSkillModal: (skillId: string) => void
  onOpenTable: () => void
}

/** Derive active phases and their skills dynamically from the skills array */
function useActivePhases(skills: Skill[]) {
  return useMemo(() => {
    const phaseSkills = new Map<string, Skill[]>()
    for (const skill of skills) {
      const list = phaseSkills.get(skill.phase) ?? []
      list.push(skill)
      phaseSkills.set(skill.phase, list)
    }

    // Only include phases that have at least 1 skill, keep PHASES order
    return PHASES
      .filter((p) => phaseSkills.has(p.number))
      .map((p) => ({
        ...p,
        skills: phaseSkills.get(p.number)!,
      }))
  }, [skills])
}

export default function PhaseNav({ skills, activePhase, onScrollToPhase, onOpenSkillModal, onOpenTable }: PhaseNavProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [openPhase, setOpenPhase] = useState<string | null>(null)

  const activePhases = useActivePhases(skills)

  const handleCopy = async (e: React.MouseEvent, trigger: string) => {
    e.stopPropagation()
    e.preventDefault()
    await navigator.clipboard.writeText(trigger)
    setCopiedId(trigger)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col items-end gap-2.5">
      <span className="text-xs font-mono uppercase tracking-[0.16em] text-[var(--cy)]">
        Navegacao
      </span>
      <div className="flex items-center gap-3">
        {/* Table badge */}
        <button
          onClick={onOpenTable}
          className="group relative flex items-center justify-center w-9 h-9 rounded-full border text-xs font-bold transition-all duration-300 ease-out hover:scale-110 focus:outline-none cursor-pointer"
          style={{
            borderColor: 'rgba(34,211,238,0.3)',
            color: 'var(--cy)',
            backgroundColor: 'transparent',
          }}
        >
          <Table2 className="w-3.5 h-3.5" />
          <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1a1a1a] border border-[#333] px-2.5 py-1 text-[11px] font-normal text-[#ccc] opacity-0 group-hover:opacity-100 transition-opacity">
            Table
          </span>
        </button>

        {/* Phase circles — only phases with skills */}
        <div className="flex items-center gap-0">
          {activePhases.map((phase, idx) => {
            const isActive = openPhase
              ? openPhase === phase.number
              : activePhase === phase.number

            return (
              <div key={phase.number} className="flex items-center">
                <DropdownMenu
                  open={openPhase === phase.number}
                  onOpenChange={(open) => setOpenPhase(open ? phase.number : null)}
                >
                  <DropdownMenuTrigger asChild>
                    <button
                      className="group relative flex items-center justify-center w-9 h-9 rounded-full border text-xs font-bold transition-all duration-300 ease-out hover:scale-110 focus:outline-none cursor-pointer"
                      style={{
                        borderColor: isActive ? 'var(--cy)' : 'rgba(34,211,238,0.3)',
                        color: isActive ? '#fff' : 'var(--cy)',
                        backgroundColor: isActive ? 'rgba(34,211,238,0.12)' : 'transparent',
                        boxShadow: isActive
                          ? '0 0 12px rgba(34,211,238,0.5), 0 0 28px rgba(34,211,238,0.15)'
                          : 'none',
                      }}
                    >
                      {phase.number}
                      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1a1a1a] border border-[#333] px-2.5 py-1 text-[11px] font-normal text-[#ccc] opacity-0 group-hover:opacity-100 transition-opacity">
                        {phase.name}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-auto min-w-[16rem] max-w-[28rem]"
                    align="end"
                    sideOffset={12}
                  >
                    <DropdownMenuLabel>
                      {phase.name}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {phase.skills.map((skill) => (
                      <DropdownMenuItem
                        key={skill.id}
                        className="justify-between"
                        onSelect={() => onScrollToPhase(phase.number, skill.name)}
                      >
                        <span className="flex-1 whitespace-nowrap">
                          {skill.name}
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0 ml-6">
                          <button
                            onClick={(e) => handleCopy(e, skill.trigger)}
                            className="p-1 rounded-md hover:bg-white/10 cursor-pointer transition-colors"
                            title={`Copy ${skill.trigger}`}
                          >
                            {copiedId === skill.trigger ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-[#666]" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              onOpenSkillModal(skill.id)
                            }}
                            className="p-1 rounded-md hover:bg-white/10 cursor-pointer transition-colors"
                            title="View details"
                          >
                            <ExternalLink className="w-4 h-4 text-[#666]" />
                          </button>
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {idx < activePhases.length - 1 && (
                  <div className="w-4 h-0 border-t border-dashed border-[var(--cy)] opacity-20" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
