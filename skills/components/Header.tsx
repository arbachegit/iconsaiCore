'use client'

import styles from '@/app/skills.module.css'

interface HeaderProps {
  totalSkills: number
  totalPhases: number
  version: string
}

export default function Header({ totalSkills, totalPhases, version }: HeaderProps) {
  return (
    <header className={styles['header']}>
      <div className={styles['headerInner']}>
        <div className={styles['logo']}>
          <div className={styles['logoIcon']}>IC</div>
          <div className={styles['logoText']}>
            Icons<span className={styles['logoTextAccent']}>AI</span> Skills
          </div>
        </div>
        <div className={styles['headerStats']}>
          <span>
            <span className={styles['statVal']}>{totalSkills}</span> skills
          </span>
          <span>
            <span className={styles['statVal']}>{totalPhases}</span> fases
          </span>
          <span>{version}</span>
        </div>
        <a
          href="https://learn.iconsai.ai/dashboard"
          className={styles['dashboardBtn']}
          aria-label="Voltar ao dashboard do Learn"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" />
            <rect x="14" y="3" width="7" height="5" />
            <rect x="14" y="12" width="7" height="9" />
            <rect x="3" y="16" width="7" height="5" />
          </svg>
          Dashboard
        </a>
      </div>
    </header>
  )
}
