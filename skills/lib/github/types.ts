export interface RawSkillYaml {
  id?: unknown
  name?: unknown
  title?: unknown
  trigger?: unknown
  phase?: unknown
  phaseName?: unknown
  category?: unknown
  section?: unknown
  order?: unknown
  status?: unknown
  description?: unknown
  techs?: unknown
  tags?: unknown
  examples?: unknown
  commands?: unknown
  isNew?: unknown
  keywords?: unknown
  interface?: {
    display_name?: unknown
    short_description?: unknown
  }
}

export interface Skill {
  id: string
  name: string
  trigger: string
  phase: string
  phaseName: string
  techs: string[]
  description: string
  examples: string[]
  commands: string[]
  isNew?: boolean
  keywords: string
}

export interface GitHubContentItem {
  type: 'file' | 'dir'
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string | null
  git_url: string | null
  download_url: string | null
}

export interface GitHubContentFile extends GitHubContentItem {
  type: 'file'
  content: string
  encoding: string
}

export interface SkillsSyncPayload {
  repository?:
    | string
    | {
        name?: string
        full_name?: string
      }
  sha?: string
  ref?: string
  changed_files?: string[]
  timestamp?: string
}
