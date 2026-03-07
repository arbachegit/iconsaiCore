import { fetchSkillsWithFallback } from '@/lib/github/fetch-skills'
import SkillsCatalog from '@/components/SkillsCatalog'

export const revalidate = 3600

export default async function SkillsPage() {
  const { skills, source } = await fetchSkillsWithFallback()

  return <SkillsCatalog skills={skills} dataSource={source} />
}
