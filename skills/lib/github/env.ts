import 'server-only'

export interface GitHubServerEnv {
  owner: string
  repo: string
  token?: string
}

export class MissingServerEnvError extends Error {
  constructor(public readonly envName: string) {
    super(`Missing required server environment variable: ${envName}`)
    this.name = 'MissingServerEnvError'
  }
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new MissingServerEnvError(name)
  }

  return value
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

export function getGitHubEnv(): GitHubServerEnv {
  return {
    owner: readOptionalEnv('GITHUB_OWNER') ?? 'arbachegit',
    repo: readOptionalEnv('GITHUB_REPO') ?? 'iconsaiConfig',
    token: readOptionalEnv('GITHUB_TOKEN'),
  }
}

export function getSkillsWebhookSecret(): string {
  return readRequiredEnv('SKILLS_WEBHOOK_SECRET')
}
