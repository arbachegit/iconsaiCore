import { fetchSkillsWithFallback } from '@/lib/github/fetch-skills'
import { computeSkillsHash, getContentHash } from '@/lib/github/skills'
import SkillsCatalog from '@/components/SkillsCatalog'

export const revalidate = 3600

export default async function SkillsPage() {
  const [{ skills, source }, remoteVersion] = await Promise.all([
    fetchSkillsWithFallback(),
    getContentHash(false).catch(() => null),
  ])
  const contentHash = remoteVersion?.hash || computeSkillsHash(skills)

  return <SkillsCatalog skills={skills} dataSource={source} contentHash={contentHash} />
}
