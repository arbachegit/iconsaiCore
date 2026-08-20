import { fetchSkillsWithFallback } from '@/lib/github/fetch-skills'
import { computeSkillsHash, getContentHash } from '@/lib/github/skills'
import SkillsCatalog from '@/components/SkillsCatalog'
import { serializeRequestSearchParams, type RequestSearchParams } from '@/lib/server/catalog-request'

export const revalidate = 3600

export default async function SkillsMobilePage({
  searchParams,
}: {
  searchParams: Promise<RequestSearchParams>
}) {
  const [{ skills, source }, remoteVersion] = await Promise.all([
    fetchSkillsWithFallback(),
    getContentHash(false).catch(() => null),
  ])
  const contentHash = remoteVersion?.hash || computeSkillsHash(skills)
  const initialSearch = serializeRequestSearchParams(await searchParams)

  return (
    <SkillsCatalog
      skills={skills}
      dataSource={source}
      contentHash={contentHash}
      initialSearch={initialSearch}
    />
  )
}
