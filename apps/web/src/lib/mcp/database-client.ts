/**
 * MCP Database Client - Multi-Database Connection Manager
 * @version 1.0.0
 * @date 2026-01-26
 *
 * Manages connections to multiple Supabase/PostgreSQL databases via MCP pattern.
 * Supports:
 * - brasil-data-hub: Geographic/demographic data
 * - fiscal-municipal: Fiscal system data (iconsai-core)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// DATABASE CONFIGURATION
// ============================================

export interface DatabaseConfig {
  name: string;
  displayName: string;
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  description: string;
}

// Database registry - configured via environment variables
export const DATABASE_CONFIGS: Record<string, DatabaseConfig> = {
  'brasil-data-hub': {
    name: 'brasil-data-hub',
    displayName: 'Brasil Data Hub',
    url: process.env.NEXT_PUBLIC_BRASIL_DATA_HUB_URL || '',
    anonKey: process.env.NEXT_PUBLIC_BRASIL_DATA_HUB_ANON_KEY || '',
    serviceRoleKey: process.env.BRASIL_DATA_HUB_SERVICE_KEY,
    description: 'Dados geográficos e demográficos do Brasil (geo_municipios, pop_municipios, pop_estados)',
  },
  'fiscal-municipal': {
    name: 'fiscal-municipal',
    displayName: 'Fiscal Municipal',
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    description: 'Sistema fiscal municipal (diagnosticos, indicadores, municipios)',
  },
};

// ============================================
// MCP DATABASE CLIENT
// ============================================

class MCPDatabaseClient {
  private clients: Map<string, SupabaseClient> = new Map();
  private initialized = false;

  /**
   * Initialize database connections
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    for (const [name, config] of Object.entries(DATABASE_CONFIGS)) {
      if (config.url && config.anonKey) {
        try {
          const client = createClient(config.url, config.anonKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });
          this.clients.set(name, client);
          console.log(`[MCPDatabaseClient] Connected to ${name}`);
        } catch (error) {
          console.warn(`[MCPDatabaseClient] Failed to connect to ${name}:`, error);
        }
      } else {
        console.warn(`[MCPDatabaseClient] Missing config for ${name}`);
      }
    }

    this.initialized = true;
  }

  /**
   * Get a database client by name
   */
  getClient(dbName: string): SupabaseClient | null {
    return this.clients.get(dbName) || null;
  }

  /**
   * Get the brasil-data-hub client
   */
  getBrasilDataHub(): SupabaseClient | null {
    return this.clients.get('brasil-data-hub');
  }

  /**
   * Get the fiscal-municipal (main) client
   */
  getFiscalMunicipal(): SupabaseClient | null {
    return this.clients.get('fiscal-municipal');
  }

  /**
   * Check if a database is connected
   */
  isConnected(dbName: string): boolean {
    return this.clients.has(dbName);
  }

  /**
   * Get list of connected databases
   */
  getConnectedDatabases(): string[] {
    return Array.from(this.clients.keys());
  }
}

// Singleton instance
export const mcpDatabaseClient = new MCPDatabaseClient();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Initialize MCP database connections
 * Call this early in the app lifecycle
 */
export async function initializeMCPDatabases(): Promise<void> {
  await mcpDatabaseClient.initialize();
}

/**
 * Get brasil-data-hub client for geographic/demographic queries
 */
export function getBrasilDataHubClient(): SupabaseClient | null {
  return mcpDatabaseClient.getBrasilDataHub();
}

/**
 * Get fiscal-municipal client for fiscal system queries
 */
export function getFiscalMunicipalClient(): SupabaseClient | null {
  return mcpDatabaseClient.getFiscalMunicipal();
}

// ============================================
// DATA ACCESS FUNCTIONS
// ============================================

/**
 * Population data from brasil-data-hub.pop_municipios
 * Time series table with demographic data per year
 */
export interface PopMunicipioData {
  id: string;
  cod_ibge: number;
  nome_municipio: string;
  uf: string;
  ano: number;
  populacao: number;
  faixa_populacional?: string;
  fonte?: string;
  data_referencia?: string;
  data_coleta?: string;
  atualizado_em?: string;
  // Demographic breakdown
  populacao_urbana?: number;
  populacao_rural?: number;
  // Mortality data
  obitos_total?: number;
  obitos_masculinos?: number;
  obitos_femininos?: number;
  taxa_mortalidade?: number;
  mortalidade_infantil?: number;
  // Birth data
  nascimentos?: number;
}

/**
 * Aggregated municipality data with latest year
 */
export interface MunicipioResumo {
  cod_ibge: number;
  nome_municipio: string;
  uf: string;
  populacao_atual: number;
  ano_referencia: number;
  faixa_populacional?: string;
  populacao_urbana?: number;
  populacao_rural?: number;
  taxa_mortalidade?: number;
  mortalidade_infantil?: number;
  fonte?: string;
}

/**
 * Fetch latest municipality data from brasil-data-hub
 * Gets the most recent year for each municipality
 */
export async function fetchPopMunicipio(
  termo: string,
  uf?: string
): Promise<MunicipioResumo[] | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchPopMunicipio] brasil-data-hub not connected');
    return null;
  }

  try {
    // Check if it's IBGE code (7 digits)
    if (/^\d{7}$/.test(termo)) {
      const { data, error } = await client
        .from('pop_municipios')
        .select('*')
        .eq('cod_ibge', parseInt(termo))
        .order('ano', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('[fetchPopMunicipio] Error:', error);
        return null;
      }

      if (data) {
        return [{
          cod_ibge: data.cod_ibge,
          nome_municipio: data.nome_municipio,
          uf: data.uf,
          populacao_atual: data.populacao,
          ano_referencia: data.ano,
          faixa_populacional: data.faixa_populacional,
          populacao_urbana: data.populacao_urbana,
          populacao_rural: data.populacao_rural,
          taxa_mortalidade: data.taxa_mortalidade,
          mortalidade_infantil: data.mortalidade_infantil,
          fonte: data.fonte,
        }];
      }
      return null;
    }

    // Search by name - get latest year for each matching municipality
    // Using distinct on cod_ibge ordered by ano desc
    let query = client
      .from('pop_municipios')
      .select('cod_ibge, nome_municipio, uf, ano, populacao, faixa_populacional, populacao_urbana, populacao_rural, taxa_mortalidade, mortalidade_infantil, fonte')
      .ilike('nome_municipio', `%${termo}%`)
      .order('ano', { ascending: false });

    if (uf) {
      query = query.eq('uf', uf.toUpperCase());
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.error('[fetchPopMunicipio] Error:', error);
      return null;
    }

    if (!data || data.length === 0) return null;

    // Group by cod_ibge and take only the most recent year
    const latestByMunicipio = new Map<number, MunicipioResumo>();

    for (const row of data) {
      if (!latestByMunicipio.has(row.cod_ibge)) {
        latestByMunicipio.set(row.cod_ibge, {
          cod_ibge: row.cod_ibge,
          nome_municipio: row.nome_municipio,
          uf: row.uf,
          populacao_atual: row.populacao,
          ano_referencia: row.ano,
          faixa_populacional: row.faixa_populacional,
          populacao_urbana: row.populacao_urbana,
          populacao_rural: row.populacao_rural,
          taxa_mortalidade: row.taxa_mortalidade,
          mortalidade_infantil: row.mortalidade_infantil,
          fonte: row.fonte,
        });
      }
    }

    return Array.from(latestByMunicipio.values()).slice(0, 10);
  } catch (error) {
    console.error('[fetchPopMunicipio] Exception:', error);
    return null;
  }
}

/**
 * Fetch population time series for a municipality
 * Returns all years available for the given municipality
 */
export async function fetchPopulacaoHistorico(
  codigoIbge: number,
  anos?: number[]
): Promise<PopMunicipioData[] | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchPopulacaoHistorico] brasil-data-hub not connected');
    return null;
  }

  try {
    let query = client
      .from('pop_municipios')
      .select('*')
      .eq('cod_ibge', codigoIbge)
      .order('ano', { ascending: false });

    if (anos && anos.length > 0) {
      query = query.in('ano', anos);
    }

    const { data, error } = await query.limit(30);

    if (error) {
      console.warn('[fetchPopulacaoHistorico] Error:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[fetchPopulacaoHistorico] Exception:', error);
    return null;
  }
}

/**
 * Fetch demographic indicators for a municipality
 * Includes mortality rates and birth data
 */
export async function fetchIndicadoresDemograficos(
  codigoIbge: number,
  ano?: number
): Promise<PopMunicipioData | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchIndicadoresDemograficos] brasil-data-hub not connected');
    return null;
  }

  try {
    let query = client
      .from('pop_municipios')
      .select('*')
      .eq('cod_ibge', codigoIbge);

    if (ano) {
      query = query.eq('ano', ano);
    } else {
      query = query.order('ano', { ascending: false }).limit(1);
    }

    const { data, error } = await query.single();

    if (error) {
      console.warn('[fetchIndicadoresDemograficos] Error:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[fetchIndicadoresDemograficos] Exception:', error);
    return null;
  }
}

// ============================================
// GEO_MUNICIPIOS - Geographic Data
// ============================================

/**
 * Geographic data from brasil-data-hub.geo_municipios
 */
export interface GeoMunicipioData {
  id: string;
  codigo_ibge: number;
  nome: string;
  estado_id: string;
  latitude?: number;
  longitude?: number;
  altitude_metros?: number;
  area_km2?: number;
  densidade_demografica?: number;
  eh_capital?: boolean;
  codigo_siafi?: number;
  gentilico?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Combined municipality data (geo + population)
 */
export interface MunicipioCompleto {
  // Identification
  codigo_ibge: number;
  nome: string;
  uf: string;
  // Geographic
  latitude?: number;
  longitude?: number;
  altitude_metros?: number;
  area_km2?: number;
  eh_capital?: boolean;
  gentilico?: string;
  // Demographic (from pop_municipios)
  populacao?: number;
  populacao_urbana?: number;
  populacao_rural?: number;
  densidade_demografica?: number;
  faixa_populacional?: string;
  ano_referencia?: number;
  // Health indicators
  taxa_mortalidade?: number;
  mortalidade_infantil?: number;
}

/**
 * Fetch geographic data for a municipality
 */
export async function fetchGeoMunicipio(
  termo: string,
  uf?: string
): Promise<GeoMunicipioData[] | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchGeoMunicipio] brasil-data-hub not connected');
    return null;
  }

  try {
    // Check if it's IBGE code (7 digits)
    if (/^\d{7}$/.test(termo)) {
      const { data, error } = await client
        .from('geo_municipios')
        .select('*')
        .eq('codigo_ibge', parseInt(termo))
        .single();

      if (error) {
        console.error('[fetchGeoMunicipio] Error:', error);
        return null;
      }

      return data ? [data] : null;
    }

    // Search by name
    let query = client
      .from('geo_municipios')
      .select('*')
      .ilike('nome', `%${termo}%`);

    // Note: geo_municipios doesn't have UF directly, it has estado_id
    // We'll need to join or filter differently if UF is needed

    const { data, error } = await query.limit(10);

    if (error) {
      console.error('[fetchGeoMunicipio] Error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[fetchGeoMunicipio] Exception:', error);
    return null;
  }
}

/**
 * Fetch complete municipality data combining geo and population
 */
export async function fetchMunicipioCompleto(
  codigoIbge: number
): Promise<MunicipioCompleto | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchMunicipioCompleto] brasil-data-hub not connected');
    return null;
  }

  try {
    // Fetch geo data
    const { data: geo, error: geoError } = await client
      .from('geo_municipios')
      .select('*')
      .eq('codigo_ibge', codigoIbge)
      .single();

    if (geoError) {
      console.warn('[fetchMunicipioCompleto] Geo error:', geoError.message);
    }

    // Fetch latest population data
    const { data: pop, error: popError } = await client
      .from('pop_municipios')
      .select('*')
      .eq('cod_ibge', codigoIbge)
      .order('ano', { ascending: false })
      .limit(1)
      .single();

    if (popError) {
      console.warn('[fetchMunicipioCompleto] Pop error:', popError.message);
    }

    // Combine data
    if (!geo && !pop) {
      return null;
    }

    return {
      codigo_ibge: codigoIbge,
      nome: geo?.nome || pop?.nome_municipio || '',
      uf: pop?.uf || '',
      // Geographic
      latitude: geo?.latitude,
      longitude: geo?.longitude,
      altitude_metros: geo?.altitude_metros,
      area_km2: geo?.area_km2,
      eh_capital: geo?.eh_capital,
      gentilico: geo?.gentilico,
      // Demographic
      populacao: pop?.populacao,
      populacao_urbana: pop?.populacao_urbana,
      populacao_rural: pop?.populacao_rural,
      densidade_demografica: geo?.densidade_demografica || undefined,
      faixa_populacional: pop?.faixa_populacional,
      ano_referencia: pop?.ano,
      // Health
      taxa_mortalidade: pop?.taxa_mortalidade,
      mortalidade_infantil: pop?.mortalidade_infantil,
    };
  } catch (error) {
    console.error('[fetchMunicipioCompleto] Exception:', error);
    return null;
  }
}

/**
 * Fetch municipalities by geographic bounds (bounding box)
 */
export async function fetchMunicipiosPorRegiao(
  latMin: number,
  latMax: number,
  lngMin: number,
  lngMax: number,
  limite = 50
): Promise<GeoMunicipioData[] | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchMunicipiosPorRegiao] brasil-data-hub not connected');
    return null;
  }

  try {
    const { data, error } = await client
      .from('geo_municipios')
      .select('*')
      .gte('latitude', latMin)
      .lte('latitude', latMax)
      .gte('longitude', lngMin)
      .lte('longitude', lngMax)
      .limit(limite);

    if (error) {
      console.error('[fetchMunicipiosPorRegiao] Error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[fetchMunicipiosPorRegiao] Exception:', error);
    return null;
  }
}

/**
 * Fetch capitals only
 */
export async function fetchCapitais(): Promise<GeoMunicipioData[] | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchCapitais] brasil-data-hub not connected');
    return null;
  }

  try {
    const { data, error } = await client
      .from('geo_municipios')
      .select('*')
      .eq('eh_capital', true)
      .order('nome');

    if (error) {
      console.error('[fetchCapitais] Error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[fetchCapitais] Exception:', error);
    return null;
  }
}

// ============================================
// POP_ESTADOS - State Population Data
// ============================================

/**
 * State population data from brasil-data-hub.pop_estados
 * Time series with demographic breakdown by gender
 */
export interface PopEstadoData {
  id: string;
  estado_id?: string;
  codigo_ibge: number;  // 2-digit state code (e.g., 35 for SP)
  ano: number;
  populacao?: number;
  populacao_masculina?: number;
  populacao_feminina?: number;
  populacao_urbana?: number;
  populacao_rural?: number;
  // Mortality
  obitos_total?: number;
  obitos_masculinos?: number;
  obitos_femininos?: number;
  taxa_mortalidade?: number;
  mortalidade_infantil?: number;
  expectativa_vida?: number;
  // Births
  nascimentos?: number;
  taxa_natalidade?: number;
  // Metadata
  fonte?: string;
  tipo?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * State summary with latest year data
 */
export interface EstadoResumo {
  codigo_ibge: number;
  uf: string;
  populacao: number;
  populacao_masculina?: number;
  populacao_feminina?: number;
  populacao_urbana?: number;
  populacao_rural?: number;
  expectativa_vida?: number;
  taxa_mortalidade?: number;
  mortalidade_infantil?: number;
  ano_referencia: number;
  fonte?: string;
}

// Map state IBGE codes to UF
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
 * Fetch state population data (latest year)
 */
export async function fetchPopEstado(
  ufOrCodigo: string | number
): Promise<EstadoResumo | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchPopEstado] brasil-data-hub not connected');
    return null;
  }

  try {
    // Convert UF to codigo_ibge if needed
    let codigoIbge: number;
    let uf: string;

    if (typeof ufOrCodigo === 'string' && ufOrCodigo.length === 2) {
      uf = ufOrCodigo.toUpperCase();
      codigoIbge = UF_TO_ESTADO_IBGE[uf];
      if (!codigoIbge) {
        console.error('[fetchPopEstado] Invalid UF:', uf);
        return null;
      }
    } else {
      codigoIbge = typeof ufOrCodigo === 'string' ? parseInt(ufOrCodigo) : ufOrCodigo;
      uf = ESTADO_IBGE_TO_UF[codigoIbge] || '';
    }

    const { data, error } = await client
      .from('pop_estados')
      .select('*')
      .eq('codigo_ibge', codigoIbge)
      .order('ano', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('[fetchPopEstado] Error:', error);
      return null;
    }

    if (!data) return null;

    return {
      codigo_ibge: data.codigo_ibge,
      uf,
      populacao: data.populacao,
      populacao_masculina: data.populacao_masculina,
      populacao_feminina: data.populacao_feminina,
      populacao_urbana: data.populacao_urbana,
      populacao_rural: data.populacao_rural,
      expectativa_vida: data.expectativa_vida,
      taxa_mortalidade: data.taxa_mortalidade,
      mortalidade_infantil: data.mortalidade_infantil,
      ano_referencia: data.ano,
      fonte: data.fonte,
    };
  } catch (error) {
    console.error('[fetchPopEstado] Exception:', error);
    return null;
  }
}

/**
 * Fetch state population time series
 */
export async function fetchPopEstadoHistorico(
  ufOrCodigo: string | number,
  anos?: number[]
): Promise<PopEstadoData[] | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchPopEstadoHistorico] brasil-data-hub not connected');
    return null;
  }

  try {
    let codigoIbge: number;

    if (typeof ufOrCodigo === 'string' && ufOrCodigo.length === 2) {
      codigoIbge = UF_TO_ESTADO_IBGE[ufOrCodigo.toUpperCase()];
      if (!codigoIbge) return null;
    } else {
      codigoIbge = typeof ufOrCodigo === 'string' ? parseInt(ufOrCodigo) : ufOrCodigo;
    }

    let query = client
      .from('pop_estados')
      .select('*')
      .eq('codigo_ibge', codigoIbge)
      .order('ano', { ascending: false });

    if (anos && anos.length > 0) {
      query = query.in('ano', anos);
    }

    const { data, error } = await query.limit(30);

    if (error) {
      console.error('[fetchPopEstadoHistorico] Error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[fetchPopEstadoHistorico] Exception:', error);
    return null;
  }
}

/**
 * Fetch all states (latest year for each)
 */
export async function fetchTodosEstados(): Promise<EstadoResumo[] | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchTodosEstados] brasil-data-hub not connected');
    return null;
  }

  try {
    const { data, error } = await client
      .from('pop_estados')
      .select('*')
      .order('ano', { ascending: false });

    if (error) {
      console.error('[fetchTodosEstados] Error:', error);
      return null;
    }

    if (!data || data.length === 0) return null;

    // Group by codigo_ibge and take latest year
    const latestByEstado = new Map<number, EstadoResumo>();

    for (const row of data) {
      if (!latestByEstado.has(row.codigo_ibge)) {
        latestByEstado.set(row.codigo_ibge, {
          codigo_ibge: row.codigo_ibge,
          uf: ESTADO_IBGE_TO_UF[row.codigo_ibge] || '',
          populacao: row.populacao,
          populacao_masculina: row.populacao_masculina,
          populacao_feminina: row.populacao_feminina,
          populacao_urbana: row.populacao_urbana,
          populacao_rural: row.populacao_rural,
          expectativa_vida: row.expectativa_vida,
          taxa_mortalidade: row.taxa_mortalidade,
          mortalidade_infantil: row.mortalidade_infantil,
          ano_referencia: row.ano,
          fonte: row.fonte,
        });
      }
    }

    return Array.from(latestByEstado.values()).sort((a, b) => a.uf.localeCompare(b.uf));
  } catch (error) {
    console.error('[fetchTodosEstados] Exception:', error);
    return null;
  }
}

/**
 * Compare states by a specific indicator
 */
export async function fetchRankingEstados(
  indicador: 'populacao' | 'expectativa_vida' | 'taxa_mortalidade' | 'mortalidade_infantil',
  ordem: 'asc' | 'desc' = 'desc',
  ano?: number
): Promise<EstadoResumo[] | null> {
  const estados = await fetchTodosEstados();

  if (!estados) return null;

  // Sort by indicator
  return estados.sort((a, b) => {
    const valA = a[indicador] ?? 0;
    const valB = b[indicador] ?? 0;
    return ordem === 'desc' ? valB - valA : valA - valB;
  });
}

// Legacy function for backward compatibility
export async function fetchEstado(uf: string): Promise<EstadoResumo | null> {
  return fetchPopEstado(uf);
}

// ============================================
// GEO_ESTADOS - State Geographic Data
// ============================================

/**
 * Geographic data from brasil-data-hub.geo_estados
 */
export interface GeoEstadoData {
  id: string;
  codigo_ibge: number;  // 2-digit state code
  nome: string;         // Full state name (e.g., "São Paulo")
  sigla: string;        // State abbreviation (e.g., "SP")
  regiao_id?: string;
  capital_municipio_id?: string;
  populacao_estimada?: number;
  area_km2?: number;
  gentilico?: string;   // Demonym (e.g., "paulista")
  created_at?: string;
  updated_at?: string;
}

/**
 * Combined state data (geo + population)
 */
export interface EstadoCompleto {
  // Identification
  codigo_ibge: number;
  sigla: string;
  nome: string;
  // Geographic
  area_km2?: number;
  gentilico?: string;
  regiao_id?: string;
  capital_municipio_id?: string;
  // Demographic (from pop_estados)
  populacao?: number;
  populacao_estimada?: number;
  populacao_masculina?: number;
  populacao_feminina?: number;
  populacao_urbana?: number;
  populacao_rural?: number;
  // Health indicators
  expectativa_vida?: number;
  taxa_mortalidade?: number;
  mortalidade_infantil?: number;
  // Births
  nascimentos?: number;
  taxa_natalidade?: number;
  // Reference
  ano_referencia?: number;
}

/**
 * Fetch geographic data for a state
 */
export async function fetchGeoEstado(
  siglaOrCodigo: string | number
): Promise<GeoEstadoData | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchGeoEstado] brasil-data-hub not connected');
    return null;
  }

  try {
    let query = client.from('geo_estados').select('*');

    if (typeof siglaOrCodigo === 'string' && siglaOrCodigo.length === 2) {
      // Search by sigla (UF)
      query = query.eq('sigla', siglaOrCodigo.toUpperCase());
    } else {
      // Search by codigo_ibge
      const codigo = typeof siglaOrCodigo === 'string' ? parseInt(siglaOrCodigo) : siglaOrCodigo;
      query = query.eq('codigo_ibge', codigo);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('[fetchGeoEstado] Error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[fetchGeoEstado] Exception:', error);
    return null;
  }
}

/**
 * Fetch all states geographic data
 */
export async function fetchTodosGeoEstados(): Promise<GeoEstadoData[] | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchTodosGeoEstados] brasil-data-hub not connected');
    return null;
  }

  try {
    const { data, error } = await client
      .from('geo_estados')
      .select('*')
      .order('sigla');

    if (error) {
      console.error('[fetchTodosGeoEstados] Error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[fetchTodosGeoEstados] Exception:', error);
    return null;
  }
}

/**
 * Fetch complete state data combining geo and population
 */
export async function fetchEstadoCompleto(
  siglaOrCodigo: string | number
): Promise<EstadoCompleto | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchEstadoCompleto] brasil-data-hub not connected');
    return null;
  }

  try {
    // Determine codigo_ibge
    let codigoIbge: number;
    let sigla: string;

    if (typeof siglaOrCodigo === 'string' && siglaOrCodigo.length === 2) {
      sigla = siglaOrCodigo.toUpperCase();
      codigoIbge = UF_TO_ESTADO_IBGE[sigla];
      if (!codigoIbge) {
        console.error('[fetchEstadoCompleto] Invalid UF:', sigla);
        return null;
      }
    } else {
      codigoIbge = typeof siglaOrCodigo === 'string' ? parseInt(siglaOrCodigo) : siglaOrCodigo;
      sigla = ESTADO_IBGE_TO_UF[codigoIbge] || '';
    }

    // Fetch geo data
    const { data: geo, error: geoError } = await client
      .from('geo_estados')
      .select('*')
      .eq('codigo_ibge', codigoIbge)
      .single();

    if (geoError) {
      console.warn('[fetchEstadoCompleto] Geo error:', geoError.message);
    }

    // Fetch latest population data
    const { data: pop, error: popError } = await client
      .from('pop_estados')
      .select('*')
      .eq('codigo_ibge', codigoIbge)
      .order('ano', { ascending: false })
      .limit(1)
      .single();

    if (popError) {
      console.warn('[fetchEstadoCompleto] Pop error:', popError.message);
    }

    // Combine data
    if (!geo && !pop) {
      return null;
    }

    return {
      codigo_ibge: codigoIbge,
      sigla: geo?.sigla || sigla,
      nome: geo?.nome || '',
      // Geographic
      area_km2: geo?.area_km2,
      gentilico: geo?.gentilico,
      regiao_id: geo?.regiao_id,
      capital_municipio_id: geo?.capital_municipio_id,
      // Demographic
      populacao: pop?.populacao,
      populacao_estimada: geo?.populacao_estimada,
      populacao_masculina: pop?.populacao_masculina,
      populacao_feminina: pop?.populacao_feminina,
      populacao_urbana: pop?.populacao_urbana,
      populacao_rural: pop?.populacao_rural,
      // Health
      expectativa_vida: pop?.expectativa_vida,
      taxa_mortalidade: pop?.taxa_mortalidade,
      mortalidade_infantil: pop?.mortalidade_infantil,
      // Births
      nascimentos: pop?.nascimentos,
      taxa_natalidade: pop?.taxa_natalidade,
      // Reference
      ano_referencia: pop?.ano,
    };
  } catch (error) {
    console.error('[fetchEstadoCompleto] Exception:', error);
    return null;
  }
}

/**
 * Fetch states by region
 */
export async function fetchEstadosPorRegiao(
  regiaoId: string
): Promise<GeoEstadoData[] | null> {
  const client = getBrasilDataHubClient();

  if (!client) {
    console.warn('[fetchEstadosPorRegiao] brasil-data-hub not connected');
    return null;
  }

  try {
    const { data, error } = await client
      .from('geo_estados')
      .select('*')
      .eq('regiao_id', regiaoId)
      .order('sigla');

    if (error) {
      console.error('[fetchEstadosPorRegiao] Error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[fetchEstadosPorRegiao] Exception:', error);
    return null;
  }
}

export default mcpDatabaseClient;
