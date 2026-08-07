'use client'

import { CircleAlert } from 'lucide-react'

import styles from '@/components/skills/skills.module.css'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className={styles.page}>
      <section className={styles.errorState}>
        <CircleAlert aria-hidden="true" />
        <div>
          <span className={styles.catalogEyebrow}>Falha no catálogo</span>
          <h2>Não foi possível montar a página</h2>
          <p>{error.message || 'Tente novamente em alguns instantes.'}</p>
        </div>
        <button onClick={reset} type="button">Tentar novamente</button>
      </section>
    </main>
  )
}
