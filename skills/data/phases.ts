export interface Phase {
  number: string
  name: string
  description: string
  subtitle: string
  color: string
  slugs: string[]
}

export const PHASES: Phase[] = [
  {
    number: '1',
    name: 'Setup / Inicializacao',
    description: 'Auditar e normalizar a estrutura do repositorio antes de comecar o desenvolvimento. Garantir que a arquitetura esteja limpa e padronizada.',
    subtitle: 'Antes de comecar a codar',
    color: 'var(--bl)',
    slugs: ['setup', 'audit', 'init', 'scaffold', 'monorepo', 'dependency', 'governance', 'architecture', 'normalizer', 'fullstack-audit', 'frontend-normalization', 'codebase-structure'],
  },
  {
    number: '2',
    name: 'Design / Arquitetura',
    description: 'Definir componentes UI, sistema de design, e configurar ferramentas visuais. Garantir consistencia visual desde o inicio.',
    subtitle: 'Planejamento visual e estrutural',
    color: 'var(--cy)',
    slugs: ['design', 'ui', 'ux', 'button', 'favicon', 'logo', 'brand', 'login', 'layout', 'component', 'figma', 'tailwind', 'shadcn', 'visual', 'css', 'typography'],
  },
  {
    number: '3',
    name: 'Desenvolvimento Backend',
    description: 'Implementar APIs com validacao robusta, normalizacao de dados, e contratos bem definidos. Garantir seguranca e consistencia dos dados.',
    subtitle: 'APIs, validacao, servicos',
    color: 'var(--gn)',
    slugs: ['backend', 'api', 'validation', 'zod', 'pydantic', 'marshmallow', 'dto', 'nest', 'sanitization', 'normalize', 'identifier', 'cpf', 'cnpj', 'ibge', 'contract', 'jsonschema', 'ajv', 'openapi', 'rest', 'graphql', 'endpoint'],
  },
  {
    number: '4',
    name: 'Integracao',
    description: 'Configurar integracoes externas: ETL, MCP, APIs de terceiros, autenticacao, webhooks e pipelines de ingestao.',
    subtitle: 'ETL, MCP, Auth, Webhooks',
    color: 'var(--yl)',
    slugs: ['integration', 'mcp', 'etl', 'auth', 'webhook', 'oauth', 'twilio', 'infobip', 'whatsapp', 'sms', 'ingestion', 'pipeline', 'connector', 'middleware', 'guardrail', 'tool-contract', 'rag-ingestion', 'multi-tenant', 'role', 'rbac'],
  },
  {
    number: '5',
    name: 'LLM / AI',
    description: 'Configurar prompts, retrieval, agentes conversacionais e pipelines de IA. Seguranca de prompts e integracao com modelos.',
    subtitle: 'Prompts, RAG, Agentes',
    color: 'var(--or)',
    slugs: ['llm', 'prompt', 'rag-retrieval', 'chat', 'agent', 'openai', 'claude', 'embedding', 'vector', 'retrieval', 'reranking', 'conversational', 'ai-safety', 'model', 'inference'],
  },
  {
    number: '6',
    name: 'Qualidade / Testes',
    description: 'Garantir qualidade do codigo com linting, formatacao, testes automatizados e testes E2E massivos. Auditar APIs, validar contratos e testar toda a UI com Playwright.',
    subtitle: 'Lint, format, testes',
    color: 'var(--rd)',
    slugs: ['quality', 'test', 'lint', 'eslint', 'prettier', 'ruff', 'mypy', 'pytest', 'jest', 'playwright', 'e2e', 'coverage', 'sanitizer', 'format', 'black'],
  },
  {
    number: '7',
    name: 'Analytics / Dados',
    description: 'Skills especializadas para analise de dados fiscais, temporais e espaciais. Use apenas se o projeto envolver analise de dados.',
    subtitle: 'Analise temporal e espacial (opcional)',
    color: 'var(--pr)',
    slugs: ['analytics', 'data', 'analysis', 'temporal', 'spatial', 'geo', 'map', 'fiscal', 'arrecadacao', 'econometria', 'var-model', 'inference-temporal', 'pandas', 'geopandas', 'statsmodels', 'bootstrap', 'cobertura', 'estimador', 'router-analysis'],
  },
  {
    number: '8',
    name: 'Pre-Deploy',
    description: 'Gatekeeper que bloqueia deploy se qualquer contrato minimo nao estiver comprovado. Build, lint, tests, env vars, health checks.',
    subtitle: 'Validacao antes de subir',
    color: 'var(--pk)',
    slugs: ['pre-deploy', 'gatekeeper', 'pre-check', 'readiness', 'checklist', 'env-validation'],
  },
  {
    number: '9',
    name: 'Deploy / CI-CD',
    description: 'Deploy deterministico com Docker, tags imutaveis, e versionamento automatico. Garantir que sempre rode a imagem do commit correto.',
    subtitle: 'Producao e versionamento',
    color: 'var(--tl)',
    slugs: ['deploy', 'ci', 'cd', 'docker', 'compose', 'build', 'publish', 'registry', 'ghcr', 'lock', 'release', 'version', 'systemctl', 'rsync', 'caddy', 'nginx', 'production'],
  },
]

export const PHASE_COLORS: Record<string, string> = {
  '1': 'var(--bl)',
  '2': 'var(--cy)',
  '3': 'var(--gn)',
  '4': 'var(--yl)',
  '5': 'var(--or)',
  '6': 'var(--rd)',
  '7': 'var(--pr)',
  '8': 'var(--pk)',
  '9': 'var(--tl)',
}

export const PHASE_COLOR_RAW: Record<string, string> = {
  '1': '#3b82f6',
  '2': '#22d3ee',
  '3': '#22c55e',
  '4': '#eab308',
  '5': '#fb923c',
  '6': '#ef4444',
  '7': '#c084fc',
  '8': '#f472b6',
  '9': '#14b8a6',
}
