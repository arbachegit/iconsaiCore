import styles from '@/components/skills/skills.module.css'

export default function Loading() {
  return (
    <main className={styles.page}>
      <div className={styles.loadingTopbar}>
        <div className={styles.skeletonBadge} />
        <div className={styles.skeletonBadge} />
      </div>
      <section className={styles.hero}>
        <span className={styles.catalogEyebrow}>Carregando índice</span>
        <div className={styles.loadingTitle} />
        <div className={styles.loadingCopy} />
      </section>
      <div className={styles.loadingGrid} aria-label="Carregando catálogo">
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
      </div>
    </main>
  )
}
