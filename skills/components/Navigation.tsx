'use client'

import styles from '@/app/skills.module.css'

export type SkillsTab = 'lifecycle' | 'catalog'

interface NavigationProps {
  activeTab: SkillsTab
  onTabChange: (tab: SkillsTab) => void
}

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className={styles['navTabs']}>
      <button
        className={`${styles['navTab']} ${activeTab === 'lifecycle' ? styles['navTabActive'] : ''}`}
        onClick={() => onTabChange('lifecycle')}
      >
        Root
      </button>
      <button
        className={`${styles['navTab']} ${activeTab === 'catalog' ? styles['navTabActive'] : ''}`}
        onClick={() => onTabChange('catalog')}
      >
        Skill Cards
      </button>
    </nav>
  )
}
