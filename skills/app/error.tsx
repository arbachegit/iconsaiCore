'use client'

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
      <div className={styles.shell}>
        <section className={styles.errorState}>
          <p className={styles.eyebrow}>Erro inesperado</p>
          <h1>Algo falhou ao montar a pagina</h1>
          <p>{error.message || 'Tente novamente em alguns instantes.'}</p>
          <button className={styles.retryButton} onClick={reset} type="button">
            Tentar novamente
          </button>
        </section>
      </div>
    </main>
  )
}
