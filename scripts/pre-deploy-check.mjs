#!/usr/bin/env node
/**
 * ============================================
 * PRE-DEPLOY VALIDATION SCRIPT
 * ============================================
 * Versão: 1.0.0
 * Data: 2026-01-23
 *
 * Executa verificações de integridade antes do deploy
 *
 * Uso: node scripts/pre-deploy-check.mjs
 * ============================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}`),
};

const results = [];

// ============================================
// 1. VERIFICAR EDGE FUNCTIONS
// ============================================
function checkEdgeFunctions() {
  log.header('EDGE FUNCTIONS');

  const functionsDir = path.join(ROOT, 'supabase/functions');

  if (!fs.existsSync(functionsDir)) {
    results.push({
      name: 'Edge Functions Directory',
      passed: false,
      message: 'Diretório supabase/functions não encontrado',
      severity: 'error',
    });
    return;
  }

  const functions = fs.readdirSync(functionsDir).filter(f => {
    const stat = fs.statSync(path.join(functionsDir, f));
    return stat.isDirectory() && !f.startsWith('_');
  });

  log.info(`Encontradas ${functions.length} Edge Functions`);

  for (const func of functions) {
    const indexPath = path.join(functionsDir, func, 'index.ts');

    if (!fs.existsSync(indexPath)) {
      results.push({
        name: `Edge Function: ${func}`,
        passed: false,
        message: `index.ts não encontrado`,
        severity: 'error',
      });
      continue;
    }

    const content = fs.readFileSync(indexPath, 'utf-8');

    // Check 1: CORS handling
    const hasCorsImport = content.includes('corsHeaders') || content.includes('handleCors');
    const hasOptionsHandler = content.includes('OPTIONS');
    const hasExplicitStatus = content.includes('status: 204') || content.includes('status: 200');

    if (!hasCorsImport) {
      results.push({
        name: `CORS Import: ${func}`,
        passed: false,
        message: `Não importa corsHeaders`,
        severity: 'warning',
      });
    }

    if (hasOptionsHandler && content.includes('new Response(null') && !hasExplicitStatus) {
      results.push({
        name: `CORS Status: ${func}`,
        passed: false,
        message: `Response OPTIONS sem status explícito - usar status: 204`,
        severity: 'warning',
      });
    } else if (hasOptionsHandler && hasCorsImport) {
      log.success(`CORS OK: ${func}`);
    }

    // Check 2: Error handling
    const hasTryCatch = content.includes('try {') && content.includes('catch');
    if (!hasTryCatch) {
      results.push({
        name: `Error Handling: ${func}`,
        passed: false,
        message: `Sem try/catch`,
        severity: 'warning',
      });
    }

    // Check 3: Version header
    const hasVersion = content.includes('VERSAO:') || content.includes('VERSION') || content.includes('FUNCTION_VERSION');
    if (!hasVersion) {
      results.push({
        name: `Versionamento: ${func}`,
        passed: false,
        message: `Sem header de versão`,
        severity: 'info',
      });
    }
  }
}

// ============================================
// 2. VERIFICAR QUERIES PROBLEMÁTICAS
// ============================================
function checkProblematicQueries() {
  log.header('QUERIES PROBLEMÁTICAS');

  const srcDir = path.join(ROOT, 'src');

  // Known problematic patterns
  const problematicPatterns = [
    { pattern: /\.select\([^)]*first_opened_at[^)]*\)/g, message: 'Usa first_opened_at (verificar se coluna existe)' },
    { pattern: /\.select\([^)]*platform_first_opened_at[^)]*\)/g, message: 'Usa platform_first_opened_at (verificar se coluna existe)' },
  ];

  function findFiles(dir) {
    const files = [];
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && !item.includes('node_modules')) {
          files.push(...findFiles(fullPath));
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          files.push(fullPath);
        }
      }
    } catch (e) {
      // ignore
    }
    return files;
  }

  const files = findFiles(srcDir);
  let issuesFound = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    for (const { pattern, message } of problematicPatterns) {
      if (pattern.test(content)) {
        const relPath = file.replace(ROOT, '');
        results.push({
          name: `Query: ${relPath}`,
          passed: false,
          message,
          severity: 'warning',
        });
        issuesFound++;
      }
    }
  }

  if (issuesFound === 0) {
    log.success('Nenhuma query problemática conhecida encontrada');
  }
}

// ============================================
// 3. VERIFICAR .ENV
// ============================================
function checkEnvVariables() {
  log.header('VARIÁVEIS DE AMBIENTE');

  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const envPath = path.join(ROOT, '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
    log.success('.env encontrado');
  } else {
    results.push({
      name: 'Env File',
      passed: false,
      message: '.env não encontrado',
      severity: 'error',
    });
    return;
  }

  for (const envVar of requiredEnvVars) {
    const exists = envContent.includes(envVar);
    if (exists) {
      log.success(`${envVar} configurada`);
    } else {
      results.push({
        name: `Env: ${envVar}`,
        passed: false,
        message: 'Não definida',
        severity: 'error',
      });
    }
  }
}

// ============================================
// 4. VERIFICAR MIGRATIONS PENDENTES
// ============================================
function checkMigrations() {
  log.header('MIGRATIONS');

  const migrationsDir = path.join(ROOT, 'supabase/migrations');

  if (!fs.existsSync(migrationsDir)) {
    log.warn('Diretório de migrations não encontrado');
    return;
  }

  const migrations = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  log.info(`${migrations.length} migrations encontradas`);

  // Check for recent migrations (last 7 days based on filename)
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentMigrations = migrations.filter(m => {
    const dateStr = m.substring(0, 8); // YYYYMMDD
    if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1;
      const day = parseInt(dateStr.substring(6, 8));
      const migrationDate = new Date(year, month, day);
      return migrationDate >= sevenDaysAgo;
    }
    return false;
  });

  if (recentMigrations.length > 0) {
    log.warn(`${recentMigrations.length} migrations recentes (últimos 7 dias):`);
    for (const m of recentMigrations) {
      console.log(`   - ${m}`);
    }
    results.push({
      name: 'Migrations Recentes',
      passed: true,
      message: `${recentMigrations.length} migrations nos últimos 7 dias - VERIFICAR se foram aplicadas`,
      severity: 'warning',
    });
  }
}

// ============================================
// 5. VERIFICAR BUILD
// ============================================
function checkBuild() {
  log.header('BUILD');

  const nextBuildPath = path.join(ROOT, 'apps/web/.next');

  if (!fs.existsSync(nextBuildPath)) {
    results.push({
      name: 'Build',
      passed: false,
      message: 'apps/web/.next/ nao existe - execute: npm run build',
      severity: 'warning',
    });
  } else {
    log.success('apps/web/.next/ existe');
  }
}

// ============================================
// MAIN
// ============================================
function main() {
  console.log(`
${colors.cyan}╔════════════════════════════════════════════╗
║     PRE-DEPLOY VALIDATION SCRIPT v1.0      ║
╚════════════════════════════════════════════╝${colors.reset}
  `);

  checkEdgeFunctions();
  checkProblematicQueries();
  checkEnvVariables();
  checkMigrations();
  checkBuild();

  // Summary
  log.header('RESUMO');

  const errors = results.filter(r => !r.passed && r.severity === 'error');
  const warnings = results.filter(r => !r.passed && r.severity === 'warning');

  console.log(`
  ${colors.green}✓ Checks passaram${colors.reset}
  ${colors.yellow}⚠ Avisos: ${warnings.length}${colors.reset}
  ${colors.red}✗ Erros:  ${errors.length}${colors.reset}
  `);

  if (errors.length > 0) {
    log.header('ERROS (BLOQUEIAM DEPLOY)');
    for (const err of errors) {
      log.error(`${err.name}: ${err.message}`);
    }
  }

  if (warnings.length > 0) {
    log.header('AVISOS (VERIFICAR)');
    for (const warn of warnings) {
      log.warn(`${warn.name}: ${warn.message}`);
    }
  }

  // Exit code
  if (errors.length > 0) {
    console.log(`\n${colors.red}❌ DEPLOY NÃO RECOMENDADO${colors.reset}\n`);
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠️ DEPLOY COM RESSALVAS${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.green}✅ PRONTO PARA DEPLOY${colors.reset}\n`);
    process.exit(0);
  }
}

main();
