'use client'

import styles from '@/app/skills.module.css'

interface FooterProps {
  updatedAt: string
}

export default function Footer({ updatedAt }: FooterProps) {
  return (
    <footer className={styles['footer']}>
      <p>
        IconsAI Skills Navigator v3.1 &mdash;{' '}
        <a
          className={styles['footerLink']}
          href="https://github.com/iconsai"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </p>
      <p className={styles['footerSub']}>Atualizado em {updatedAt}</p>
    </footer>
  )
}
