import { fetchSkillsWithFallback } from '@/lib/github/fetch-skills'
import SkillsMobileCatalog from '@/components/SkillsMobileCatalog'

export const revalidate = 3600

export default async function SkillsMobilePage() {
  const { skills, source } = await fetchSkillsWithFallback()

  return <SkillsMobileCatalog skills={skills} dataSource={source} />
}
