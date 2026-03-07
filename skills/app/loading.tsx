import styles from '@/components/skills/skills.module.css'

export default function Loading() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Carregando</p>
          <h1 className={styles.title}>Sincronizando catalogo</h1>
          <p className={styles.description}>
            Buscando as skills mais recentes no repositorio fonte.
          </p>
        </section>

        <div className={styles.sections}>
          {Array.from({ length: 2 }).map((_, sectionIndex) => (
            <section key={sectionIndex} className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonBadge} />
              </div>
              <div className={styles.cardGrid}>
                {Array.from({ length: 4 }).map((__, cardIndex) => (
                  <div key={cardIndex} className={styles.skeletonCard} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
