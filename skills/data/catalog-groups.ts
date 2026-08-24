export interface CatalogGroup {
  id: 'iniciar' | 'harness' | 'hubs'
  name: string
  subtitle: string
  description: string
  color: string
  skillIds: string[]
}

export const INICIAR_SKILL_IDS = [
  'iniciar',
  'pensar-antes-de-codar',
  'execucao-por-objetivo',
  'simplicidade-primeiro',
  'mudanca-cirurgica',
  'harness-inspecao',
  'harness-determinismo',
  'harness-convergencia-de-padroes',
  'harness-metricas-evolutivas',
  'secrets-hygiene',
  'skill-dependency-governance',
  'arquitetura',
  'frontend-design',
  'brand',
  'logo',
  'favicon',
  'cors-headers-security',
  'skill-sanitization-validator',
  'skill-node-quality',
  'skill-api-validation-zod',
  'injection-defense',
  'skill-python-pydantic',
  'skill-python-quality',
  'skill-contract-jsonschema-ajv',
  'authz-policy-audit',
  'lgpd-pii-mapper',
  'login',
  'skill-llm-prompt-safety',
  'skill-mcp-guardrails',
  'skill-rag-ingestion',
  'skill-rag-retrieval',
  'finalizar',
] as const

export const HARNESS_SKILL_IDS = [
  'harness-inspecao',
  'harness-determinismo',
  'harness-convergencia-de-padroes',
  'harness-metricas-evolutivas',
] as const

export const HUB_SKILL_MEMBERS: Record<string, string[]> = {
  iniciar: [...INICIAR_SKILL_IDS.filter((id) => id !== 'iniciar')],
  finalizar: ['quality-finalizer', 'security-finalizer'],
  deploy: [
    'skill_deploy_master',
    'skill_deploy_fase_0_pre_check',
    'skill_deploy_fase_1_build',
    'skill_deploy_fase_2_publish',
    'skill_deploy_fase_3_deploy',
    'skill_deploy_fase_4_validate',
    'skill_deploy_fase_5_lock_release',
    'skill_versioning',
  ],
  security: [
    'injection-defense',
    'cors-headers-security',
    'authz-policy-audit',
    'secrets-hygiene',
    'lgpd-pii-mapper',
    'skill-llm-prompt-safety',
    'skill-rag-retrieval',
    'security-finalizer',
  ],
  arquitetura: [
    'skill-architecture-mother-normalizer',
    'skill-fullstack-audit',
    'skill-frontend-normalization',
    'skill-contract-jsonschema-ajv',
    'skill-node-quality',
    'skill-python-quality',
  ],
  design: [
    'frontend-design',
    'skill-design-audit',
    'brand',
    'logo',
    'favicon',
    'skill-ui-button',
    'login',
    'header-hero',
    'magazine-design',
    'warroom-design',
    'bi-design',
  ],
  temporal: [
    'skill-roteador-analise-temporal-espacial',
    'skill-analise-espaco-temporal-arrecadacao',
    'skill-inferencia-temporal-dados-faltantes',
    'skill-projecao-temporal-econometrica-var',
    'estimador-cobertura',
  ],
  'ia-contexto-container': ['ia-contextual', 'ia-simulacao-container'],
  login: ['authz-policy-audit', 'skill-cpf-validation', 'skill-infobip-sms'],
}

export const CATALOG_GROUPS: CatalogGroup[] = [
  {
    id: 'iniciar',
    name: 'Iniciar',
    subtitle: 'Primeiro passo',
    description: 'Seleção canônica para estruturar um projeto do objetivo ao primeiro deploy verificável.',
    color: '#f97316',
    skillIds: [...INICIAR_SKILL_IDS],
  },
  {
    id: 'harness',
    name: 'Harness',
    subtitle: 'Controle e evidência',
    description: 'Apenas os quatro harness de inspeção, determinismo, convergência e métricas evolutivas.',
    color: '#a78bfa',
    skillIds: [...HARNESS_SKILL_IDS],
  },
  {
    id: 'hubs',
    name: 'Hubs',
    subtitle: 'Skills orquestradoras',
    description: 'Skills que coordenam outras skills e expõem sua composição dentro do sumário.',
    color: '#22d3ee',
    skillIds: Object.keys(HUB_SKILL_MEMBERS),
  },
]

export function getHubMembers(skillId: string): string[] {
  return HUB_SKILL_MEMBERS[skillId] ?? []
}
