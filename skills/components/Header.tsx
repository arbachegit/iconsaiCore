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
      </div>
    </header>
  )
}
