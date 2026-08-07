'use client'

import { FormEvent, useMemo, useState } from 'react'
import {
  ArrowRight,
  BrainCircuit,
  Check,
  CircleAlert,
  Copy,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react'

import styles from '@/components/skills/skills.module.css'
import CopyButton from '@/components/CopyButton'
import type { Skill } from '@/lib/github/types'
import { buildSkillsApiUrl } from '@/lib/client/skills-api-url'
import {
  recommendationErrorResponseSchema,
  recommendationResponseSchema,
  type RecommendationResponse,
} from '@/lib/recommendation/schema'

const EXAMPLE_SITUATIONS = [
  'Vou iniciar um dashboard Next.js com autenticação e Supabase.',
  'Preciso revisar segurança e qualidade antes de publicar uma API.',
  'Quero criar um RAG multi-tenant com documentos internos.',
]

interface SkillAdvisorProps {
  skills: Skill[]
  onOpenSkill: (skillId: string) => void
}

async function readRecommendationResponse(response: Response): Promise<RecommendationResponse> {
  const responseText = await response.text()
  let payload: unknown = null

  if (responseText) {
    try {
      payload = JSON.parse(responseText)
    } catch {
      payload = null
    }
  }

  if (response.redirected) {
    throw new Error('Sua sessão expirou. Abra o catálogo novamente pelo Learn.')
  }

  if (!response.ok) {
    const apiError = recommendationErrorResponseSchema.safeParse(payload)
    if (apiError.success) throw new Error(apiError.data.error)

    if (response.status === 401 || response.status === 403) {
      throw new Error('Sua sessão expirou. Abra o catálogo novamente pelo Learn.')
    }

    throw new Error('O orientador não respondeu corretamente. Tente novamente em instantes.')
  }

  const recommendation = recommendationResponseSchema.safeParse(payload)
  if (!recommendation.success) {
    throw new Error('O orientador devolveu uma resposta incompleta. Tente novamente.')
  }

  return recommendation.data
}

export default function SkillAdvisor({ skills, onOpenSkill }: SkillAdvisorProps) {
  const [situation, setSituation] = useState('')
  const [result, setResult] = useState<RecommendationResponse | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const skillNames = useMemo(
    () => Object.fromEntries(skills.map((skill) => [skill.id, skill.name])),
    [skills],
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedSituation = situation.trim()
    if (normalizedSituation.length < 12 || isLoading) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(buildSkillsApiUrl('/skills/api/skills/recommend'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation: normalizedSituation }),
      })
      setResult(await readRecommendationResponse(response))
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível gerar a recomendação.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const resetAdvisor = () => {
    setSituation('')
    setResult(null)
    setError('')
  }

  return (
    <section className={styles.advisor} aria-labelledby="skill-advisor-title">
      <div className={styles.advisorIntro}>
        <span className={styles.advisorIcon}>
          <BrainCircuit aria-hidden="true" />
        </span>
        <div>
          <span className={styles.advisorEyebrow}>Orientador inteligente</span>
          <h2 id="skill-advisor-title">Descreva o trabalho. Receba a sequência de skills.</h2>
          <p>
            Conte o que você vai construir, revisar ou corrigir. O orientador cruza sua situação
            com o catálogo canônico e propõe apenas o conjunto necessário.
          </p>
        </div>
      </div>

      <form className={styles.advisorForm} onSubmit={handleSubmit}>
        <label htmlFor="skill-situation">Qual é a sua situação?</label>
        <textarea
          id="skill-situation"
          value={situation}
          onChange={(event) => setSituation(event.target.value.slice(0, 1200))}
          placeholder="Ex.: estou criando uma API pública em Next.js, com login, Supabase e deploy em droplet..."
          rows={4}
          minLength={12}
          maxLength={1200}
          required
        />

        <div className={styles.advisorFormFooter}>
          <span>{situation.length}/1.200</span>
          <button type="submit" disabled={situation.trim().length < 12 || isLoading}>
            {isLoading ? (
              <>
                <LoaderCircle aria-hidden="true" data-spinning="true" />
                Analisando catálogo
              </>
            ) : (
              <>
                <Sparkles aria-hidden="true" />
                Recomendar skills
              </>
            )}
          </button>
        </div>
      </form>

      {!result && !isLoading && (
        <div className={styles.advisorExamples} aria-label="Exemplos de situações">
          <span>Experimente:</span>
          {EXAMPLE_SITUATIONS.map((example) => (
            <button key={example} type="button" onClick={() => setSituation(example)}>
              {example}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className={styles.advisorError} role="alert">
          <CircleAlert aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className={styles.advisorResult} aria-live="polite">
          <div className={styles.advisorResultHeader}>
            <div>
              <span className={styles.advisorEyebrow}>Rota recomendada</span>
              <h3>{result.summary}</h3>
              <p>{result.strategy}</p>
            </div>
            <button type="button" className={styles.advisorReset} onClick={resetAdvisor}>
              <RotateCcw aria-hidden="true" />
              Nova análise
            </button>
          </div>

          <ol className={styles.recommendationList}>
            {result.recommendations.map((recommendation, index) => (
              <li key={`${recommendation.skillId}-${index}`}>
                <span className={styles.recommendationOrder}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className={styles.recommendationBody}>
                  <div className={styles.recommendationTitle}>
                    <span data-priority={recommendation.priority}>{recommendation.priority}</span>
                    <strong>{skillNames[recommendation.skillId] || recommendation.skillId}</strong>
                    <code>/{recommendation.skillId}</code>
                  </div>
                  <p>{recommendation.reason}</p>
                  <small>{recommendation.whenToUse}</small>
                </div>
                <div className={styles.recommendationActions}>
                  <CopyButton
                    text={`$${recommendation.skillId}`}
                    className={`${styles.recommendationCopy} ${styles.recommendationCopyCodex}`}
                    title={`Copiar $${recommendation.skillId} para o Codex`}
                    copiedTitle="Comando do Codex copiado"
                  >
                    {(copied) => (
                      <>
                        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                        <span>Codex</span>
                      </>
                    )}
                  </CopyButton>
                  <CopyButton
                    text={`/${recommendation.skillId}`}
                    className={`${styles.recommendationCopy} ${styles.recommendationCopyClaude}`}
                    title={`Copiar /${recommendation.skillId} para o Claude`}
                    copiedTitle="Comando do Claude copiado"
                  >
                    {(copied) => (
                      <>
                        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                        <span>Claude</span>
                      </>
                    )}
                  </CopyButton>
                  <button
                    type="button"
                    className={styles.recommendationOpen}
                    onClick={() => onOpenSkill(recommendation.skillId)}
                    aria-label={`Abrir documentação de ${recommendation.skillId}`}
                  >
                    <ArrowRight aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ol>

          {result.cautions.length > 0 && (
            <div className={styles.advisorCautions}>
              <span>Atenção operacional</span>
              <ul>
                {result.cautions.map((caution) => <li key={caution}>{caution}</li>)}
              </ul>
            </div>
          )}

          <div className={styles.advisorTrace}>
            <span>Prompt {result.promptVersion}</span>
            <span>{result.provider === 'anthropic' ? 'Claude' : 'OpenAI fallback'}</span>
            <span>IDs limitados ao catálogo</span>
          </div>
        </div>
      )}
    </section>
  )
}
