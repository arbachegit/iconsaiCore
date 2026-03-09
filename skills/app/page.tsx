import { fetchSkillsWithFallback } from '@/lib/github/fetch-skills'
import { getContentHash } from '@/lib/github/skills'
import SkillsCatalog from '@/components/SkillsCatalog'

export const revalidate = 3600

export default async function SkillsPage() {
  const [{ skills, source }, { hash }] = await Promise.all([
    fetchSkillsWithFallback(),
    getContentHash(false).catch(() => ({ count: 0, hash: '' })),
  ])

  return <SkillsCatalog skills={skills} dataSource={source} contentHash={hash} />
}
