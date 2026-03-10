/**
 * Home Agent Handlers
 * @version 2.0.0
 * @date 2026-01-26
 *
 * Implementation of tools defined in mcp-config.ts
 * Uses MCP multi-database pattern for data access:
 * - brasil-data-hub: Geographic/demographic data (pop_municipios)
 * - fiscal-municipal: Fiscal system data (iconsai-core)
 */

import type { ToolHandler, ExecutionContext } from '@/lib/mcp/types';
import { supabase } from '@/integrations/supabase/client';
import {
  // Real data functions (for fallback/specific use)
  fetchIndicadoresDemograficos,
  getBrasilDataHubClient,
  // Types
  type PopMunicipioData,
  type MunicipioResumo,
  type GeoMunicipioData,
  type MunicipioCompleto,
  type PopEstadoData,
  type EstadoResumo,
  type GeoEstadoData,
  type EstadoCompleto,
} from '@/lib/mcp/database-client';

// Smart provider - auto-switches between mock and real data
import { getDataProvider, MOCK_CONFIG } from '@/lib/mcp/mock-provider';

// Get the appropriate data functions based on environment
const dataProvider = getDataProvider();
const {
  fetchPopMunicipio,
  fetchPopulacaoHistorico,
  fetchGeoMunicipio,
  fetchMunicipioCompleto,
  fetchPopEstado,
  fetchPopEstadoHistorico,
  fetchTodosEstados,
  fetchRankingEstados,
  fetchGeoEstado,
  fetchEstadoCompleto,
} = dataProvider;

// ============================================
// SQL HANDLERS (Dados Estruturados via MCP)
// ============================================

/**
 * Busca município por nome ou código IBGE
 * Fonte: brasil-data-hub (geo_municipios + pop_municipios via MCP)
 * Retorna dados combinados: geográficos + populacionais
 */
export const buscarMunicipio: ToolHandler<
  { termo: string; uf?: string; completo?: boolean },
  unknown
> = async (input, context) => {
  const { termo, uf, completo = false } = input;

  // If complete data requested and we have IBGE code, fetch combined data
  if (completo && /^\d{7}$/.test(termo)) {
    const municipioCompleto = await fetchMunicipioCompleto(parseInt(termo));
    if (municipioCompleto) {
      console.log('[buscarMunicipio] Found complete data for:', termo);
      return municipioCompleto;
    }
  }

  // Try brasil-data-hub population data first
  const popResult = await fetchPopMunicipio(termo, uf);

  if (popResult && popResult.length > 0) {
    console.log('[buscarMunicipio] Found in pop_municipios:', popResult.length);

    // Enrich with geo data if single result
    if (popResult.length === 1) {
      const geoData = await fetchGeoMunicipio(String(popResult[0].cod_ibge));
      if (geoData && geoData.length > 0) {
        const geo = geoData[0];
        return {
          ...popResult[0],
          latitude: geo.latitude,
          longitude: geo.longitude,
          altitude_metros: geo.altitude_metros,
          area_km2: geo.area_km2,
          eh_capital: geo.eh_capital,
          gentilico: geo.gentilico,
        };
      }
    }

    return popResult;
  }

  // Try geo_municipios as fallback
  const geoResult = await fetchGeoMunicipio(termo);
  if (geoResult && geoResult.length > 0) {
    console.log('[buscarMunicipio] Found in geo_municipios:', geoResult.length);
    return geoResult;
  }

  // Final fallback to local municipios table
  console.log('[buscarMunicipio] Fallback to local municipios table');

  if (/^\d{7}$/.test(termo)) {
    const { data, error } = await (supabase
      .from('municipios') as any)
      .select('*')
      .eq('codigo_ibge', parseInt(termo))
      .single();

    if (error) {
      console.error('[buscarMunicipio] Error:', error);
      return null;
    }
    return data ? [data] : null;
  }

  let query = (supabase
    .from('municipios') as any)
    .select('*')
    .ilike('nome', `%${termo}%`);

  if (uf) {
    query = query.eq('uf', uf.toUpperCase());
  }

  const { data, error } = await query.limit(10);

  if (error) {
    console.error('[buscarMunicipio] Error:', error);
    return null;
  }

  return data;
};

/**
 * Busca dados populacionais completos
 * Fonte: brasil-data-hub.pop_municipios (via MCP)
 * Inclui: população atual, urbana/rural, mortalidade, nascimentos, série histórica
 */
export const buscarPopulacao: ToolHandler<
  { codigo_ibge?: string; municipio?: string; incluir_historico?: boolean; ano?: number },
  unknown
> = async (input, context) => {
  const { codigo_ibge, municipio, incluir_historico = false, ano } = input;

  const termo = codigo_ibge || municipio;
  if (!termo) {
    return { error: 'Informe código IBGE ou nome do município' };
  }

  // Fetch from brasil-data-hub
  const brasilDataResult = await fetchPopMunicipio(termo);

  if (brasilDataResult && brasilDataResult.length > 0) {
    const mun = brasilDataResult[0];

    // Format rich response with real pop_municipios structure
    const response: Record<string, unknown> = {
      municipio: {
        cod_ibge: mun.cod_ibge,
        nome: mun.nome_municipio,
        uf: mun.uf,
      },
      populacao: {
        total: mun.populacao_atual,
        urbana: mun.populacao_urbana,
        rural: mun.populacao_rural,
        faixa: mun.faixa_populacional,
        ano_referencia: mun.ano_referencia,
      },
      indicadores_saude: {
        taxa_mortalidade: mun.taxa_mortalidade,
        mortalidade_infantil: mun.mortalidade_infantil,
      },
      fonte: mun.fonte || 'brasil-data-hub',
    };

    // Include historical data if requested
    if (incluir_historico && mun.cod_ibge) {
      const historico = await fetchPopulacaoHistorico(mun.cod_ibge);
      if (historico && historico.length > 0) {
        response.serie_historica = historico.map(h => ({
          ano: h.ano,
          populacao: h.populacao,
          populacao_urbana: h.populacao_urbana,
          populacao_rural: h.populacao_rural,
          obitos_total: h.obitos_total,
          nascimentos: h.nascimentos,
          taxa_mortalidade: h.taxa_mortalidade,
        }));
      }
    }

    // If specific year requested, fetch detailed indicators
    if (ano && mun.cod_ibge) {
      const indicadores = await fetchIndicadoresDemograficos(mun.cod_ibge, ano);
      if (indicadores) {
        response.dados_ano_especifico = {
          ano: indicadores.ano,
          populacao: indicadores.populacao,
          obitos_total: indicadores.obitos_total,
          obitos_masculinos: indicadores.obitos_masculinos,
          obitos_femininos: indicadores.obitos_femininos,
          nascimentos: indicadores.nascimentos,
          taxa_mortalidade: indicadores.taxa_mortalidade,
          mortalidade_infantil: indicadores.mortalidade_infantil,
        };
      }
    }

    return response;
  }

  // Fallback to local table
  let query = supabase
    .from('municipios')
    .select('codigo_ibge, nome, uf, populacao_2022, regiao, lat, lng, pib_2021_milhoes');

  if (codigo_ibge) {
    query = query.eq('codigo_ibge', parseInt(codigo_ibge));
  } else if (municipio) {
    query = query.ilike('nome', `%${municipio}%`);
  }

  const { data, error } = await query.limit(5);

  if (error) {
    console.error('[buscarPopulacao] Error:', error);
    return null;
  }

  // Format fallback response
  if (data && data.length > 0) {
    const mun = data[0];
    return {
      municipio: {
        cod_ibge: mun.codigo_ibge,
        nome: mun.nome,
        uf: mun.uf,
        regiao: mun.regiao,
      },
      populacao: {
        total: mun.populacao_2022,
        ano_referencia: 2022,
      },
      territorio: {
        latitude: mun.lat,
        longitude: mun.lng,
      },
      economia: {
        pib_milhoes: mun.pib_2021_milhoes,
      },
      fonte: 'local-fallback',
    };
  }

  return null;
};

/**
 * Busca estabelecimentos de saúde
 */
export const buscarEstabelecimentoSaude: ToolHandler<
  { municipio: string; tipo?: string; limite?: number },
  unknown
> = async (input, context) => {
  const { municipio, tipo = 'TODOS', limite = 10 } = input;

  // Primeiro, encontrar o município
  const { data: mun } = await supabase
    .from('municipios')
    .select('codigo_ibge, nome')
    .ilike('nome', `%${municipio}%`)
    .limit(1)
    .single();

  if (!mun) {
    return { error: 'Município não encontrado', municipio };
  }

  // Buscar estabelecimentos
  let query = supabase
    .from('estabelecimentos_saude')
    .select('cnes, nome_fantasia, tipo_estabelecimento, endereco, bairro, telefone, atendimento_urgencia')
    .eq('codigo_ibge', mun.codigo_ibge);

  if (tipo !== 'TODOS') {
    query = query.eq('tipo_estabelecimento', tipo);
  }

  const { data, error } = await query.limit(limite);

  if (error) {
    // Table might not exist yet or no data
    console.warn('[buscarEstabelecimentoSaude] Query error:', error.message);
    return {
      municipio: mun.nome,
      message: 'Dados de estabelecimentos de saúde ainda não disponíveis para este município',
      total: 0,
      estabelecimentos: [],
    };
  }

  return {
    municipio: mun.nome,
    total: data?.length || 0,
    estabelecimentos: data,
  };
};

/**
 * Busca escolas
 */
export const buscarEscola: ToolHandler<
  { municipio: string; tipo?: string; limite?: number },
  unknown
> = async (input, context) => {
  const { municipio, tipo = 'TODOS', limite = 10 } = input;

  // Primeiro, encontrar o município
  const { data: mun } = await supabase
    .from('municipios')
    .select('codigo_ibge, nome')
    .ilike('nome', `%${municipio}%`)
    .limit(1)
    .single();

  if (!mun) {
    return { error: 'Município não encontrado', municipio };
  }

  // Buscar escolas
  let query = supabase
    .from('escolas')
    .select('codigo_inep, nome, dependencia_administrativa, endereco, bairro, telefone, etapas_ensino')
    .eq('codigo_ibge', mun.codigo_ibge);

  if (tipo !== 'TODOS') {
    query = query.contains('etapas_ensino', [tipo]);
  }

  const { data, error } = await query.limit(limite);

  if (error) {
    // Table might not exist yet or no data
    console.warn('[buscarEscola] Query error:', error.message);
    return {
      municipio: mun.nome,
      message: 'Dados de escolas ainda não disponíveis para este município',
      total: 0,
      escolas: [],
    };
  }

  return {
    municipio: mun.nome,
    total: data?.length || 0,
    escolas: data,
  };
};

/**
 * Busca dados de estado brasileiro
 * Fonte: brasil-data-hub (geo_estados + pop_estados via MCP)
 * Inclui: nome, área, gentílico, população por gênero, urbana/rural, mortalidade, expectativa de vida
 */
export const buscarEstado: ToolHandler<
  { uf?: string; codigo_ibge?: number; incluir_historico?: boolean; comparar?: boolean; indicador?: string; completo?: boolean },
  unknown
> = async (input, context) => {
  const { uf, codigo_ibge, incluir_historico = false, comparar = false, indicador, completo = false } = input;

  // If comparing all states
  if (comparar) {
    const validIndicador = indicador as 'populacao' | 'expectativa_vida' | 'taxa_mortalidade' | 'mortalidade_infantil' || 'populacao';
    const ranking = await fetchRankingEstados(validIndicador, 'desc');
    if (ranking) {
      return {
        tipo: 'ranking_estados',
        indicador: validIndicador,
        estados: ranking.map((e, i) => ({
          posicao: i + 1,
          uf: e.uf,
          valor: e[validIndicador],
          populacao: e.populacao,
          ano_referencia: e.ano_referencia,
        })),
        total: ranking.length,
      };
    }
    return { error: 'Não foi possível obter ranking dos estados' };
  }

  // Get specific state
  const termo = uf || (codigo_ibge ? String(codigo_ibge) : null);
  if (!termo) {
    // Return all states
    const todos = await fetchTodosEstados();
    if (todos) {
      return {
        tipo: 'lista_estados',
        estados: todos,
        total: todos.length,
      };
    }
    return { error: 'Informe UF ou código IBGE do estado' };
  }

  // If complete data requested, use combined fetch
  if (completo) {
    const estadoCompleto = await fetchEstadoCompleto(termo);
    if (estadoCompleto) {
      console.log('[buscarEstado] Found complete data for:', termo);

      const response: Record<string, unknown> = {
        estado: {
          codigo_ibge: estadoCompleto.codigo_ibge,
          sigla: estadoCompleto.sigla,
          nome: estadoCompleto.nome,
          gentilico: estadoCompleto.gentilico,
        },
        territorio: {
          area_km2: estadoCompleto.area_km2,
        },
        populacao: {
          total: estadoCompleto.populacao,
          estimada: estadoCompleto.populacao_estimada,
          masculina: estadoCompleto.populacao_masculina,
          feminina: estadoCompleto.populacao_feminina,
          urbana: estadoCompleto.populacao_urbana,
          rural: estadoCompleto.populacao_rural,
          ano_referencia: estadoCompleto.ano_referencia,
        },
        indicadores: {
          expectativa_vida: estadoCompleto.expectativa_vida,
          taxa_mortalidade: estadoCompleto.taxa_mortalidade,
          mortalidade_infantil: estadoCompleto.mortalidade_infantil,
          taxa_natalidade: estadoCompleto.taxa_natalidade,
        },
        fonte: 'brasil-data-hub',
      };

      // Include historical data if requested
      if (incluir_historico) {
        const historico = await fetchPopEstadoHistorico(termo);
        if (historico && historico.length > 0) {
          response.serie_historica = historico.map(h => ({
            ano: h.ano,
            populacao: h.populacao,
            populacao_masculina: h.populacao_masculina,
            populacao_feminina: h.populacao_feminina,
            populacao_urbana: h.populacao_urbana,
            populacao_rural: h.populacao_rural,
            expectativa_vida: h.expectativa_vida,
            taxa_mortalidade: h.taxa_mortalidade,
            mortalidade_infantil: h.mortalidade_infantil,
            obitos_total: h.obitos_total,
            nascimentos: h.nascimentos,
          }));
        }
      }

      return response;
    }
  }

  // Default: fetch population data only
  const estado = await fetchPopEstado(termo);
  if (!estado) {
    return { error: `Estado não encontrado: ${termo}` };
  }

  // Enrich with geo data
  const geoData = await fetchGeoEstado(termo);

  const response: Record<string, unknown> = {
    estado: {
      codigo_ibge: estado.codigo_ibge,
      uf: estado.uf,
      nome: geoData?.nome,
      gentilico: geoData?.gentilico,
    },
    territorio: geoData ? {
      area_km2: geoData.area_km2,
    } : undefined,
    populacao: {
      total: estado.populacao,
      estimada: geoData?.populacao_estimada,
      masculina: estado.populacao_masculina,
      feminina: estado.populacao_feminina,
      urbana: estado.populacao_urbana,
      rural: estado.populacao_rural,
      ano_referencia: estado.ano_referencia,
    },
    indicadores: {
      expectativa_vida: estado.expectativa_vida,
      taxa_mortalidade: estado.taxa_mortalidade,
      mortalidade_infantil: estado.mortalidade_infantil,
    },
    fonte: estado.fonte || 'brasil-data-hub',
  };

  // Include historical data if requested
  if (incluir_historico) {
    const historico = await fetchPopEstadoHistorico(termo);
    if (historico && historico.length > 0) {
      response.serie_historica = historico.map(h => ({
        ano: h.ano,
        populacao: h.populacao,
        populacao_masculina: h.populacao_masculina,
        populacao_feminina: h.populacao_feminina,
        populacao_urbana: h.populacao_urbana,
        populacao_rural: h.populacao_rural,
        expectativa_vida: h.expectativa_vida,
        taxa_mortalidade: h.taxa_mortalidade,
        mortalidade_infantil: h.mortalidade_infantil,
        obitos_total: h.obitos_total,
        nascimentos: h.nascimentos,
      }));
    }
  }

  return response;
};

// ============================================
// RAG HANDLERS (Busca Semântica)
// ============================================

/**
 * Busca protocolos clínicos (placeholder - será implementado com RAG)
 */
export const buscarProtocolo: ToolHandler<
  { query: string; categoria?: string; limite?: number },
  unknown
> = async (input, context) => {
  const { query, categoria = 'todos', limite = 5 } = input;

  // TODO: Implementar busca vetorial quando RAG estiver pronto
  // Por enquanto, retorna placeholder

  console.log('[buscarProtocolo] RAG não implementado ainda. Query:', query);

  return {
    message: 'Busca em protocolos será implementada em breve',
    query,
    categoria,
  };
};

/**
 * Busca documentos (placeholder - será implementado com RAG)
 */
export const buscarDocumento: ToolHandler<
  { query: string; categoria?: string; limite?: number },
  unknown
> = async (input, context) => {
  const { query, categoria, limite = 5 } = input;

  // TODO: Implementar busca vetorial quando RAG estiver pronto

  console.log('[buscarDocumento] RAG não implementado ainda. Query:', query);

  return {
    message: 'Busca em documentos será implementada em breve',
    query,
    categoria,
  };
};

// ============================================
// API HANDLERS (Dados Externos)
// ============================================

/**
 * Busca atualidades via Perplexity (placeholder)
 */
export const buscarAtualidades: ToolHandler<
  { query: string; foco?: string; recencia?: string },
  unknown
> = async (input, context) => {
  const { query, foco = 'geral', recencia = 'semana' } = input;

  // TODO: Implementar chamada à API Perplexity

  console.log('[buscarAtualidades] Perplexity não implementado ainda. Query:', query);

  return {
    message: 'Busca de atualidades será implementada em breve',
    query,
    foco,
    recencia,
  };
};

// ============================================
// LLM HANDLERS
// ============================================

/**
 * Gera resposta geral usando LLM
 */
export const respostaGeral: ToolHandler<
  { pergunta: string; contexto?: string },
  unknown
> = async (input, context) => {
  const { pergunta, contexto } = input;

  // Este handler é chamado como fallback
  // A geração real é feita pelo orchestrator

  return {
    pergunta,
    contexto,
    needsLLMGeneration: true,
  };
};

// ============================================
// EXPORT ALL HANDLERS
// ============================================

export const homeHandlers: Record<string, ToolHandler> = {
  buscarMunicipio,
  buscarPopulacao,
  buscarEstabelecimentoSaude,
  buscarEscola,
  buscarEstado,
  buscarProtocolo,
  buscarDocumento,
  buscarAtualidades,
  respostaGeral,
};

export default homeHandlers;
