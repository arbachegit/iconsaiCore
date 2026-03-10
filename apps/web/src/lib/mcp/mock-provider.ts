/**
 * MCP Mock Provider - Development Data Provider
 * @version 1.0.0
 * @date 2026-01-27
 *
 * Provides mock data for development and testing when real databases
 * are not available or being populated.
 *
 * Usage:
 * - Import mock functions instead of real ones during development
 * - Data structure mirrors brasil-data-hub tables exactly
 * - Enable/disable via NEXT_PUBLIC_USE_MOCK_DATA=true
 */

import type {
  PopMunicipioData,
  MunicipioResumo,
  GeoMunicipioData,
  MunicipioCompleto,
  PopEstadoData,
  EstadoResumo,
  GeoEstadoData,
  EstadoCompleto,
} from './database-client';

// ============================================
// CONFIGURATION
// ============================================

export const MOCK_CONFIG = {
  enabled: process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true',
  simulateLatency: true,
  latencyMs: { min: 100, max: 300 },
};

/**
 * Simulate network latency
 */
async function simulateLatency(): Promise<void> {
  if (!MOCK_CONFIG.simulateLatency) return;
  const delay = Math.random() * (MOCK_CONFIG.latencyMs.max - MOCK_CONFIG.latencyMs.min) + MOCK_CONFIG.latencyMs.min;
  await new Promise(resolve => setTimeout(resolve, delay));
}

// ============================================
// MOCK DATA - ESTADOS
// ============================================

const MOCK_ESTADOS: GeoEstadoData[] = [
  { id: '1', codigo_ibge: 11, nome: 'Rondônia', sigla: 'RO', area_km2: 237765.35, gentilico: 'rondoniense', populacao_estimada: 1796460 },
  { id: '2', codigo_ibge: 12, nome: 'Acre', sigla: 'AC', area_km2: 164123.04, gentilico: 'acreano', populacao_estimada: 894470 },
  { id: '3', codigo_ibge: 13, nome: 'Amazonas', sigla: 'AM', area_km2: 1559167.88, gentilico: 'amazonense', populacao_estimada: 4207714 },
  { id: '4', codigo_ibge: 14, nome: 'Roraima', sigla: 'RR', area_km2: 224300.51, gentilico: 'roraimense', populacao_estimada: 631181 },
  { id: '5', codigo_ibge: 15, nome: 'Pará', sigla: 'PA', area_km2: 1245870.70, gentilico: 'paraense', populacao_estimada: 8690745 },
  { id: '6', codigo_ibge: 16, nome: 'Amapá', sigla: 'AP', area_km2: 142828.52, gentilico: 'amapaense', populacao_estimada: 861773 },
  { id: '7', codigo_ibge: 17, nome: 'Tocantins', sigla: 'TO', area_km2: 277720.41, gentilico: 'tocantinense', populacao_estimada: 1590248 },
  { id: '8', codigo_ibge: 21, nome: 'Maranhão', sigla: 'MA', area_km2: 331936.95, gentilico: 'maranhense', populacao_estimada: 7114598 },
  { id: '9', codigo_ibge: 22, nome: 'Piauí', sigla: 'PI', area_km2: 251611.93, gentilico: 'piauiense', populacao_estimada: 3281480 },
  { id: '10', codigo_ibge: 23, nome: 'Ceará', sigla: 'CE', area_km2: 148894.75, gentilico: 'cearense', populacao_estimada: 9187103 },
  { id: '11', codigo_ibge: 24, nome: 'Rio Grande do Norte', sigla: 'RN', area_km2: 52811.11, gentilico: 'potiguar', populacao_estimada: 3534165 },
  { id: '12', codigo_ibge: 25, nome: 'Paraíba', sigla: 'PB', area_km2: 56467.24, gentilico: 'paraibano', populacao_estimada: 4039277 },
  { id: '13', codigo_ibge: 26, nome: 'Pernambuco', sigla: 'PE', area_km2: 98067.88, gentilico: 'pernambucano', populacao_estimada: 9616621 },
  { id: '14', codigo_ibge: 27, nome: 'Alagoas', sigla: 'AL', area_km2: 27848.14, gentilico: 'alagoano', populacao_estimada: 3351543 },
  { id: '15', codigo_ibge: 28, nome: 'Sergipe', sigla: 'SE', area_km2: 21915.12, gentilico: 'sergipano', populacao_estimada: 2318822 },
  { id: '16', codigo_ibge: 29, nome: 'Bahia', sigla: 'BA', area_km2: 564733.18, gentilico: 'baiano', populacao_estimada: 14930634 },
  { id: '17', codigo_ibge: 31, nome: 'Minas Gerais', sigla: 'MG', area_km2: 586521.12, gentilico: 'mineiro', populacao_estimada: 21292666 },
  { id: '18', codigo_ibge: 32, nome: 'Espírito Santo', sigla: 'ES', area_km2: 46074.44, gentilico: 'capixaba', populacao_estimada: 4064052 },
  { id: '19', codigo_ibge: 33, nome: 'Rio de Janeiro', sigla: 'RJ', area_km2: 43781.59, gentilico: 'fluminense', populacao_estimada: 17366189 },
  { id: '20', codigo_ibge: 35, nome: 'São Paulo', sigla: 'SP', area_km2: 248219.63, gentilico: 'paulista', populacao_estimada: 46289333 },
  { id: '21', codigo_ibge: 41, nome: 'Paraná', sigla: 'PR', area_km2: 199307.94, gentilico: 'paranaense', populacao_estimada: 11516840 },
  { id: '22', codigo_ibge: 42, nome: 'Santa Catarina', sigla: 'SC', area_km2: 95730.69, gentilico: 'catarinense', populacao_estimada: 7338473 },
  { id: '23', codigo_ibge: 43, nome: 'Rio Grande do Sul', sigla: 'RS', area_km2: 281707.15, gentilico: 'gaúcho', populacao_estimada: 11422973 },
  { id: '24', codigo_ibge: 50, nome: 'Mato Grosso do Sul', sigla: 'MS', area_km2: 357145.53, gentilico: 'sul-mato-grossense', populacao_estimada: 2809394 },
  { id: '25', codigo_ibge: 51, nome: 'Mato Grosso', sigla: 'MT', area_km2: 903207.05, gentilico: 'mato-grossense', populacao_estimada: 3526220 },
  { id: '26', codigo_ibge: 52, nome: 'Goiás', sigla: 'GO', area_km2: 340106.49, gentilico: 'goiano', populacao_estimada: 7113540 },
  { id: '27', codigo_ibge: 53, nome: 'Distrito Federal', sigla: 'DF', area_km2: 5760.78, gentilico: 'brasiliense', populacao_estimada: 3055149 },
];

const MOCK_POP_ESTADOS: PopEstadoData[] = MOCK_ESTADOS.map((estado, i) => ({
  id: `pop-${estado.id}`,
  estado_id: estado.id,
  codigo_ibge: estado.codigo_ibge,
  ano: 2024,
  populacao: estado.populacao_estimada,
  populacao_masculina: Math.round((estado.populacao_estimada || 0) * 0.49),
  populacao_feminina: Math.round((estado.populacao_estimada || 0) * 0.51),
  populacao_urbana: Math.round((estado.populacao_estimada || 0) * 0.85),
  populacao_rural: Math.round((estado.populacao_estimada || 0) * 0.15),
  expectativa_vida: 72 + Math.random() * 8,
  taxa_mortalidade: 5 + Math.random() * 3,
  mortalidade_infantil: 10 + Math.random() * 8,
  nascimentos: Math.round((estado.populacao_estimada || 0) * 0.012),
  taxa_natalidade: 11 + Math.random() * 4,
  fonte: 'mock-provider',
}));

// ============================================
// MOCK DATA - MUNICÍPIOS (Amostra representativa)
// ============================================

const MOCK_MUNICIPIOS: GeoMunicipioData[] = [
  // Capitais
  { id: 'm1', codigo_ibge: 3550308, nome: 'São Paulo', estado_id: '20', latitude: -23.5505, longitude: -46.6333, altitude_metros: 760, area_km2: 1521.11, eh_capital: true, gentilico: 'paulistano' },
  { id: 'm2', codigo_ibge: 3304557, nome: 'Rio de Janeiro', estado_id: '19', latitude: -22.9068, longitude: -43.1729, altitude_metros: 11, area_km2: 1200.18, eh_capital: true, gentilico: 'carioca' },
  { id: 'm3', codigo_ibge: 5300108, nome: 'Brasília', estado_id: '27', latitude: -15.7942, longitude: -47.8822, altitude_metros: 1172, area_km2: 5760.78, eh_capital: true, gentilico: 'brasiliense' },
  { id: 'm4', codigo_ibge: 2927408, nome: 'Salvador', estado_id: '16', latitude: -12.9714, longitude: -38.5014, altitude_metros: 8, area_km2: 693.45, eh_capital: true, gentilico: 'soteropolitano' },
  { id: 'm5', codigo_ibge: 2304400, nome: 'Fortaleza', estado_id: '10', latitude: -3.7172, longitude: -38.5433, altitude_metros: 21, area_km2: 312.41, eh_capital: true, gentilico: 'fortalezense' },
  { id: 'm6', codigo_ibge: 3106200, nome: 'Belo Horizonte', estado_id: '17', latitude: -19.9191, longitude: -43.9386, altitude_metros: 852, area_km2: 331.40, eh_capital: true, gentilico: 'belo-horizontino' },
  { id: 'm7', codigo_ibge: 1302603, nome: 'Manaus', estado_id: '3', latitude: -3.1190, longitude: -60.0217, altitude_metros: 92, area_km2: 11401.09, eh_capital: true, gentilico: 'manauara' },
  { id: 'm8', codigo_ibge: 4106902, nome: 'Curitiba', estado_id: '21', latitude: -25.4284, longitude: -49.2733, altitude_metros: 934, area_km2: 435.04, eh_capital: true, gentilico: 'curitibano' },
  { id: 'm9', codigo_ibge: 2611606, nome: 'Recife', estado_id: '13', latitude: -8.0476, longitude: -34.8770, altitude_metros: 4, area_km2: 218.84, eh_capital: true, gentilico: 'recifense' },
  { id: 'm10', codigo_ibge: 5208707, nome: 'Goiânia', estado_id: '26', latitude: -16.6869, longitude: -49.2648, altitude_metros: 749, area_km2: 728.84, eh_capital: true, gentilico: 'goianiense' },
  { id: 'm11', codigo_ibge: 1501402, nome: 'Belém', estado_id: '5', latitude: -1.4558, longitude: -48.4902, altitude_metros: 10, area_km2: 1059.46, eh_capital: true, gentilico: 'belenense' },
  { id: 'm12', codigo_ibge: 4314902, nome: 'Porto Alegre', estado_id: '23', latitude: -30.0346, longitude: -51.2177, altitude_metros: 10, area_km2: 496.68, eh_capital: true, gentilico: 'porto-alegrense' },
  // Cidades médias
  { id: 'm13', codigo_ibge: 3509502, nome: 'Campinas', estado_id: '20', latitude: -22.9099, longitude: -47.0626, altitude_metros: 680, area_km2: 795.70, eh_capital: false, gentilico: 'campineiro' },
  { id: 'm14', codigo_ibge: 3518800, nome: 'Guarulhos', estado_id: '20', latitude: -23.4538, longitude: -46.5333, altitude_metros: 759, area_km2: 318.68, eh_capital: false, gentilico: 'guarulhense' },
  { id: 'm15', codigo_ibge: 3303500, nome: 'Niterói', estado_id: '19', latitude: -22.8838, longitude: -43.1038, altitude_metros: 5, area_km2: 133.92, eh_capital: false, gentilico: 'niteroiense' },
  { id: 'm16', codigo_ibge: 3548708, nome: 'Santos', estado_id: '20', latitude: -23.9608, longitude: -46.3336, altitude_metros: 2, area_km2: 280.67, eh_capital: false, gentilico: 'santista' },
  { id: 'm17', codigo_ibge: 3170206, nome: 'Uberlândia', estado_id: '17', latitude: -18.9113, longitude: -48.2622, altitude_metros: 863, area_km2: 4115.21, eh_capital: false, gentilico: 'uberlandense' },
  { id: 'm18', codigo_ibge: 4205407, nome: 'Florianópolis', estado_id: '22', latitude: -27.5954, longitude: -48.5480, altitude_metros: 7, area_km2: 675.41, eh_capital: true, gentilico: 'florianopolitano' },
  { id: 'm19', codigo_ibge: 3136702, nome: 'Juiz de Fora', estado_id: '17', latitude: -21.7595, longitude: -43.3398, altitude_metros: 678, area_km2: 1435.66, eh_capital: false, gentilico: 'juiz-forano' },
  { id: 'm20', codigo_ibge: 3534401, nome: 'Osasco', estado_id: '20', latitude: -23.5325, longitude: -46.7917, altitude_metros: 716, area_km2: 64.95, eh_capital: false, gentilico: 'osasquense' },
];

const MOCK_POP_MUNICIPIOS: PopMunicipioData[] = [
  // Populações aproximadas (2024)
  { id: 'p1', cod_ibge: 3550308, nome_municipio: 'São Paulo', uf: 'SP', ano: 2024, populacao: 12400000, faixa_populacional: 'Metrópole', populacao_urbana: 12300000, populacao_rural: 100000, taxa_mortalidade: 6.2, mortalidade_infantil: 10.5, fonte: 'mock-provider' },
  { id: 'p2', cod_ibge: 3304557, nome_municipio: 'Rio de Janeiro', uf: 'RJ', ano: 2024, populacao: 6750000, faixa_populacional: 'Metrópole', populacao_urbana: 6700000, populacao_rural: 50000, taxa_mortalidade: 7.1, mortalidade_infantil: 11.2, fonte: 'mock-provider' },
  { id: 'p3', cod_ibge: 5300108, nome_municipio: 'Brasília', uf: 'DF', ano: 2024, populacao: 3055000, faixa_populacional: 'Metrópole', populacao_urbana: 2950000, populacao_rural: 105000, taxa_mortalidade: 4.8, mortalidade_infantil: 9.8, fonte: 'mock-provider' },
  { id: 'p4', cod_ibge: 2927408, nome_municipio: 'Salvador', uf: 'BA', ano: 2024, populacao: 2900000, faixa_populacional: 'Metrópole', populacao_urbana: 2880000, populacao_rural: 20000, taxa_mortalidade: 6.5, mortalidade_infantil: 14.2, fonte: 'mock-provider' },
  { id: 'p5', cod_ibge: 2304400, nome_municipio: 'Fortaleza', uf: 'CE', ano: 2024, populacao: 2700000, faixa_populacional: 'Metrópole', populacao_urbana: 2680000, populacao_rural: 20000, taxa_mortalidade: 6.8, mortalidade_infantil: 13.5, fonte: 'mock-provider' },
  { id: 'p6', cod_ibge: 3106200, nome_municipio: 'Belo Horizonte', uf: 'MG', ano: 2024, populacao: 2530000, faixa_populacional: 'Metrópole', populacao_urbana: 2520000, populacao_rural: 10000, taxa_mortalidade: 6.0, mortalidade_infantil: 10.8, fonte: 'mock-provider' },
  { id: 'p7', cod_ibge: 1302603, nome_municipio: 'Manaus', uf: 'AM', ano: 2024, populacao: 2250000, faixa_populacional: 'Metrópole', populacao_urbana: 2200000, populacao_rural: 50000, taxa_mortalidade: 5.2, mortalidade_infantil: 15.8, fonte: 'mock-provider' },
  { id: 'p8', cod_ibge: 4106902, nome_municipio: 'Curitiba', uf: 'PR', ano: 2024, populacao: 1960000, faixa_populacional: 'Grande', populacao_urbana: 1950000, populacao_rural: 10000, taxa_mortalidade: 5.8, mortalidade_infantil: 9.2, fonte: 'mock-provider' },
  { id: 'p9', cod_ibge: 2611606, nome_municipio: 'Recife', uf: 'PE', ano: 2024, populacao: 1660000, faixa_populacional: 'Grande', populacao_urbana: 1650000, populacao_rural: 10000, taxa_mortalidade: 7.2, mortalidade_infantil: 12.8, fonte: 'mock-provider' },
  { id: 'p10', cod_ibge: 5208707, nome_municipio: 'Goiânia', uf: 'GO', ano: 2024, populacao: 1555000, faixa_populacional: 'Grande', populacao_urbana: 1545000, populacao_rural: 10000, taxa_mortalidade: 5.5, mortalidade_infantil: 11.5, fonte: 'mock-provider' },
  { id: 'p11', cod_ibge: 1501402, nome_municipio: 'Belém', uf: 'PA', ano: 2024, populacao: 1510000, faixa_populacional: 'Grande', populacao_urbana: 1480000, populacao_rural: 30000, taxa_mortalidade: 6.3, mortalidade_infantil: 14.5, fonte: 'mock-provider' },
  { id: 'p12', cod_ibge: 4314902, nome_municipio: 'Porto Alegre', uf: 'RS', ano: 2024, populacao: 1490000, faixa_populacional: 'Grande', populacao_urbana: 1485000, populacao_rural: 5000, taxa_mortalidade: 7.5, mortalidade_infantil: 9.5, fonte: 'mock-provider' },
  { id: 'p13', cod_ibge: 3509502, nome_municipio: 'Campinas', uf: 'SP', ano: 2024, populacao: 1220000, faixa_populacional: 'Grande', populacao_urbana: 1200000, populacao_rural: 20000, taxa_mortalidade: 5.8, mortalidade_infantil: 9.8, fonte: 'mock-provider' },
  { id: 'p14', cod_ibge: 3518800, nome_municipio: 'Guarulhos', uf: 'SP', ano: 2024, populacao: 1400000, faixa_populacional: 'Grande', populacao_urbana: 1395000, populacao_rural: 5000, taxa_mortalidade: 6.2, mortalidade_infantil: 11.2, fonte: 'mock-provider' },
  { id: 'p15', cod_ibge: 3303500, nome_municipio: 'Niterói', uf: 'RJ', ano: 2024, populacao: 520000, faixa_populacional: 'Média', populacao_urbana: 518000, populacao_rural: 2000, taxa_mortalidade: 6.8, mortalidade_infantil: 8.5, fonte: 'mock-provider' },
  { id: 'p16', cod_ibge: 3548708, nome_municipio: 'Santos', uf: 'SP', ano: 2024, populacao: 435000, faixa_populacional: 'Média', populacao_urbana: 433000, populacao_rural: 2000, taxa_mortalidade: 8.2, mortalidade_infantil: 9.0, fonte: 'mock-provider' },
  { id: 'p17', cod_ibge: 3170206, nome_municipio: 'Uberlândia', uf: 'MG', ano: 2024, populacao: 720000, faixa_populacional: 'Média', populacao_urbana: 710000, populacao_rural: 10000, taxa_mortalidade: 5.2, mortalidade_infantil: 10.2, fonte: 'mock-provider' },
  { id: 'p18', cod_ibge: 4205407, nome_municipio: 'Florianópolis', uf: 'SC', ano: 2024, populacao: 516000, faixa_populacional: 'Média', populacao_urbana: 505000, populacao_rural: 11000, taxa_mortalidade: 5.5, mortalidade_infantil: 8.2, fonte: 'mock-provider' },
  { id: 'p19', cod_ibge: 3136702, nome_municipio: 'Juiz de Fora', uf: 'MG', ano: 2024, populacao: 580000, faixa_populacional: 'Média', populacao_urbana: 575000, populacao_rural: 5000, taxa_mortalidade: 6.5, mortalidade_infantil: 10.5, fonte: 'mock-provider' },
  { id: 'p20', cod_ibge: 3534401, nome_municipio: 'Osasco', uf: 'SP', ano: 2024, populacao: 700000, faixa_populacional: 'Média', populacao_urbana: 699000, populacao_rural: 1000, taxa_mortalidade: 6.0, mortalidade_infantil: 10.8, fonte: 'mock-provider' },
];

// Historical data (generate years 2020-2024)
function generateHistoricalData<T extends { ano: number; populacao?: number }>(
  baseData: T[],
  years: number[] = [2020, 2021, 2022, 2023, 2024]
): T[] {
  const result: T[] = [];

  for (const item of baseData) {
    for (const year of years) {
      const yearDiff = 2024 - year;
      const growthFactor = 1 - (yearDiff * 0.01); // ~1% growth per year

      result.push({
        ...item,
        ano: year,
        populacao: item.populacao ? Math.round(item.populacao * growthFactor) : undefined,
      } as T);
    }
  }

  return result;
}

// ============================================
// MOCK FUNCTIONS - MUNICÍPIOS
// ============================================

/**
 * Mock: Fetch municipality population data
 */
export async function mockFetchPopMunicipio(
  termo: string,
  uf?: string
): Promise<MunicipioResumo[] | null> {
  await simulateLatency();
  console.log('[MockProvider] fetchPopMunicipio:', termo, uf);

  // Search by IBGE code
  if (/^\d{7}$/.test(termo)) {
    const codigo = parseInt(termo);
    const mun = MOCK_POP_MUNICIPIOS.find(m => m.cod_ibge === codigo);

    if (mun) {
      return [{
        cod_ibge: mun.cod_ibge,
        nome_municipio: mun.nome_municipio,
        uf: mun.uf,
        populacao_atual: mun.populacao,
        ano_referencia: mun.ano,
        faixa_populacional: mun.faixa_populacional,
        populacao_urbana: mun.populacao_urbana,
        populacao_rural: mun.populacao_rural,
        taxa_mortalidade: mun.taxa_mortalidade,
        mortalidade_infantil: mun.mortalidade_infantil,
        fonte: 'mock-provider',
      }];
    }
    return null;
  }

  // Search by name
  const termoLower = termo.toLowerCase();
  let results = MOCK_POP_MUNICIPIOS.filter(m =>
    m.nome_municipio.toLowerCase().includes(termoLower)
  );

  if (uf) {
    results = results.filter(m => m.uf === uf.toUpperCase());
  }

  if (results.length === 0) return null;

  return results.slice(0, 10).map(mun => ({
    cod_ibge: mun.cod_ibge,
    nome_municipio: mun.nome_municipio,
    uf: mun.uf,
    populacao_atual: mun.populacao,
    ano_referencia: mun.ano,
    faixa_populacional: mun.faixa_populacional,
    populacao_urbana: mun.populacao_urbana,
    populacao_rural: mun.populacao_rural,
    taxa_mortalidade: mun.taxa_mortalidade,
    mortalidade_infantil: mun.mortalidade_infantil,
    fonte: 'mock-provider',
  }));
}

/**
 * Mock: Fetch municipality population history
 */
export async function mockFetchPopulacaoHistorico(
  codigoIbge: number,
  anos?: number[]
): Promise<PopMunicipioData[] | null> {
  await simulateLatency();
  console.log('[MockProvider] fetchPopulacaoHistorico:', codigoIbge);

  const baseMun = MOCK_POP_MUNICIPIOS.find(m => m.cod_ibge === codigoIbge);
  if (!baseMun) return null;

  const historico = generateHistoricalData([baseMun]);

  if (anos && anos.length > 0) {
    return historico.filter(h => anos.includes(h.ano));
  }

  return historico;
}

/**
 * Mock: Fetch geographic municipality data
 */
export async function mockFetchGeoMunicipio(
  termo: string,
  uf?: string
): Promise<GeoMunicipioData[] | null> {
  await simulateLatency();
  console.log('[MockProvider] fetchGeoMunicipio:', termo);

  // Search by IBGE code
  if (/^\d{7}$/.test(termo)) {
    const codigo = parseInt(termo);
    const mun = MOCK_MUNICIPIOS.find(m => m.codigo_ibge === codigo);
    return mun ? [mun] : null;
  }

  // Search by name
  const termoLower = termo.toLowerCase();
  const results = MOCK_MUNICIPIOS.filter(m =>
    m.nome.toLowerCase().includes(termoLower)
  );

  return results.length > 0 ? results.slice(0, 10) : null;
}

/**
 * Mock: Fetch complete municipality data
 */
export async function mockFetchMunicipioCompleto(
  codigoIbge: number
): Promise<MunicipioCompleto | null> {
  await simulateLatency();
  console.log('[MockProvider] fetchMunicipioCompleto:', codigoIbge);

  const geo = MOCK_MUNICIPIOS.find(m => m.codigo_ibge === codigoIbge);
  const pop = MOCK_POP_MUNICIPIOS.find(m => m.cod_ibge === codigoIbge);

  if (!geo && !pop) return null;

  return {
    codigo_ibge: codigoIbge,
    nome: geo?.nome || pop?.nome_municipio || '',
    uf: pop?.uf || '',
    latitude: geo?.latitude,
    longitude: geo?.longitude,
    altitude_metros: geo?.altitude_metros,
    area_km2: geo?.area_km2,
    eh_capital: geo?.eh_capital,
    gentilico: geo?.gentilico,
    populacao: pop?.populacao,
    populacao_urbana: pop?.populacao_urbana,
    populacao_rural: pop?.populacao_rural,
    faixa_populacional: pop?.faixa_populacional,
    ano_referencia: pop?.ano,
    taxa_mortalidade: pop?.taxa_mortalidade,
    mortalidade_infantil: pop?.mortalidade_infantil,
  };
}

/**
 * Mock: Fetch capitals
 */
export async function mockFetchCapitais(): Promise<GeoMunicipioData[] | null> {
  await simulateLatency();
  console.log('[MockProvider] fetchCapitais');

  return MOCK_MUNICIPIOS.filter(m => m.eh_capital === true);
}

// ============================================
// MOCK FUNCTIONS - ESTADOS
// ============================================

const ESTADO_IBGE_TO_UF: Record<number, string> = {
  11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO',
  21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA',
  31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP',
  41: 'PR', 42: 'SC', 43: 'RS',
  50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF',
};

const UF_TO_ESTADO_IBGE: Record<string, number> = Object.fromEntries(
  Object.entries(ESTADO_IBGE_TO_UF).map(([k, v]) => [v, parseInt(k)])
);

/**
 * Mock: Fetch state population data
 */
export async function mockFetchPopEstado(
  ufOrCodigo: string | number
): Promise<EstadoResumo | null> {
  await simulateLatency();
  console.log('[MockProvider] fetchPopEstado:', ufOrCodigo);

  let codigoIbge: number;
  let uf: string;

  if (typeof ufOrCodigo === 'string' && ufOrCodigo.length === 2) {
    uf = ufOrCodigo.toUpperCase();
    codigoIbge = UF_TO_ESTADO_IBGE[uf];
  } else {
    codigoIbge = typeof ufOrCodigo === 'string' ? parseInt(ufOrCodigo) : ufOrCodigo;
    uf = ESTADO_IBGE_TO_UF[codigoIbge] || '';
  }

  const pop = MOCK_POP_ESTADOS.find(e => e.codigo_ibge === codigoIbge);
  if (!pop) return null;

  return {
    codigo_ibge: pop.codigo_ibge,
    uf,
    populacao: pop.populacao || 0,
    populacao_masculina: pop.populacao_masculina,
    populacao_feminina: pop.populacao_feminina,
    populacao_urbana: pop.populacao_urbana,
    populacao_rural: pop.populacao_rural,
    expectativa_vida: pop.expectativa_vida,
    taxa_mortalidade: pop.taxa_mortalidade,
    mortalidade_infantil: pop.mortalidade_infantil,
    ano_referencia: pop.ano,
    fonte: 'mock-provider',
  };
}

/**
 * Mock: Fetch state population history
 */
export async function mockFetchPopEstadoHistorico(
  ufOrCodigo: string | number,
  anos?: number[]
): Promise<PopEstadoData[] | null> {
  await simulateLatency();
  console.log('[MockProvider] fetchPopEstadoHistorico:', ufOrCodigo);

  let codigoIbge: number;

  if (typeof ufOrCodigo === 'string' && ufOrCodigo.length === 2) {
    codigoIbge = UF_TO_ESTADO_IBGE[ufOrCodigo.toUpperCase()];
  } else {
    codigoIbge = typeof ufOrCodigo === 'string' ? parseInt(ufOrCodigo) : ufOrCodigo;
  }

  const baseEstado = MOCK_POP_ESTADOS.find(e => e.codigo_ibge === codigoIbge);
  if (!baseEstado) return null;

  const historico = generateHistoricalData([baseEstado]);

  if (anos && anos.length > 0) {
    return historico.filter(h => anos.includes(h.ano));
  }

  return historico;
}

/**
 * Mock: Fetch all states
 */
export async function mockFetchTodosEstados(): Promise<EstadoResumo[] | null> {
  await simulateLatency();
  console.log('[MockProvider] fetchTodosEstados');

  return MOCK_POP_ESTADOS.map(pop => ({
    codigo_ibge: pop.codigo_ibge,
    uf: ESTADO_IBGE_TO_UF[pop.codigo_ibge] || '',
    populacao: pop.populacao || 0,
    populacao_masculina: pop.populacao_masculina,
    populacao_feminina: pop.populacao_feminina,
    populacao_urbana: pop.populacao_urbana,
    populacao_rural: pop.populacao_rural,
    expectativa_vida: pop.expectativa_vida,
    taxa_mortalidade: pop.taxa_mortalidade,
    mortalidade_infantil: pop.mortalidade_infantil,
    ano_referencia: pop.ano,
    fonte: 'mock-provider',
  })).sort((a, b) => a.uf.localeCompare(b.uf));
}

/**
 * Mock: Fetch state ranking
 */
export async function mockFetchRankingEstados(
  indicador: 'populacao' | 'expectativa_vida' | 'taxa_mortalidade' | 'mortalidade_infantil',
  ordem: 'asc' | 'desc' = 'desc'
): Promise<EstadoResumo[] | null> {
  const estados = await mockFetchTodosEstados();
  if (!estados) return null;

  return estados.sort((a, b) => {
    const valA = a[indicador] ?? 0;
    const valB = b[indicador] ?? 0;
    return ordem === 'desc' ? valB - valA : valA - valB;
  });
}

/**
 * Mock: Fetch geographic state data
 */
export async function mockFetchGeoEstado(
  siglaOrCodigo: string | number
): Promise<GeoEstadoData | null> {
  await simulateLatency();
  console.log('[MockProvider] fetchGeoEstado:', siglaOrCodigo);

  if (typeof siglaOrCodigo === 'string' && siglaOrCodigo.length === 2) {
    return MOCK_ESTADOS.find(e => e.sigla === siglaOrCodigo.toUpperCase()) || null;
  }

  const codigo = typeof siglaOrCodigo === 'string' ? parseInt(siglaOrCodigo) : siglaOrCodigo;
  return MOCK_ESTADOS.find(e => e.codigo_ibge === codigo) || null;
}

/**
 * Mock: Fetch complete state data
 */
export async function mockFetchEstadoCompleto(
  siglaOrCodigo: string | number
): Promise<EstadoCompleto | null> {
  await simulateLatency();
  console.log('[MockProvider] fetchEstadoCompleto:', siglaOrCodigo);

  const geo = await mockFetchGeoEstado(siglaOrCodigo);
  const pop = await mockFetchPopEstado(siglaOrCodigo);

  if (!geo && !pop) return null;

  return {
    codigo_ibge: geo?.codigo_ibge || pop?.codigo_ibge || 0,
    sigla: geo?.sigla || pop?.uf || '',
    nome: geo?.nome || '',
    area_km2: geo?.area_km2,
    gentilico: geo?.gentilico,
    populacao: pop?.populacao,
    populacao_estimada: geo?.populacao_estimada,
    populacao_masculina: pop?.populacao_masculina,
    populacao_feminina: pop?.populacao_feminina,
    populacao_urbana: pop?.populacao_urbana,
    populacao_rural: pop?.populacao_rural,
    expectativa_vida: pop?.expectativa_vida,
    taxa_mortalidade: pop?.taxa_mortalidade,
    mortalidade_infantil: pop?.mortalidade_infantil,
    ano_referencia: pop?.ano_referencia,
  };
}

// ============================================
// SMART PROVIDER (Auto-switches between mock and real)
// ============================================

import * as realClient from './database-client';

/**
 * Get the appropriate data function based on mock mode
 */
export function getDataProvider() {
  if (MOCK_CONFIG.enabled) {
    console.log('[MockProvider] Using MOCK data');
    return {
      fetchPopMunicipio: mockFetchPopMunicipio,
      fetchPopulacaoHistorico: mockFetchPopulacaoHistorico,
      fetchGeoMunicipio: mockFetchGeoMunicipio,
      fetchMunicipioCompleto: mockFetchMunicipioCompleto,
      fetchCapitais: mockFetchCapitais,
      fetchPopEstado: mockFetchPopEstado,
      fetchPopEstadoHistorico: mockFetchPopEstadoHistorico,
      fetchTodosEstados: mockFetchTodosEstados,
      fetchRankingEstados: mockFetchRankingEstados,
      fetchGeoEstado: mockFetchGeoEstado,
      fetchEstadoCompleto: mockFetchEstadoCompleto,
    };
  }

  console.log('[MockProvider] Using REAL data');
  return {
    fetchPopMunicipio: realClient.fetchPopMunicipio,
    fetchPopulacaoHistorico: realClient.fetchPopulacaoHistorico,
    fetchGeoMunicipio: realClient.fetchGeoMunicipio,
    fetchMunicipioCompleto: realClient.fetchMunicipioCompleto,
    fetchCapitais: realClient.fetchCapitais,
    fetchPopEstado: realClient.fetchPopEstado,
    fetchPopEstadoHistorico: realClient.fetchPopEstadoHistorico,
    fetchTodosEstados: realClient.fetchTodosEstados,
    fetchRankingEstados: realClient.fetchRankingEstados,
    fetchGeoEstado: realClient.fetchGeoEstado,
    fetchEstadoCompleto: realClient.fetchEstadoCompleto,
  };
}

export default getDataProvider;
