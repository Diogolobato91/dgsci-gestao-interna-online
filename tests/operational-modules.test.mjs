import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20261108090000_security_publications_operational_modules.sql', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const operations = fs.readFileSync('src/features/operations/OperationalCasesPage.tsx', 'utf8');

test('módulos operacionais usam tabela versionada, RLS e auditoria', () => {
  assert.match(migration, /create table if not exists public\.operational_cases/i);
  assert.match(migration, /alter table public\.operational_cases enable row level security/i);
  assert.match(migration, /create policy operational_cases_read/i);
  assert.match(migration, /create policy operational_cases_insert/i);
  assert.match(migration, /create policy operational_cases_update/i);
  assert.match(migration, /new\.version := old\.version \+ 1/i);
  assert.match(migration, /private\.capture_audit_event\(\)/i);
  assert.doesNotMatch(migration, /grant (?:all|delete).*operational_cases.*authenticated/i);
});

test('publicações têm leitura pública e edição continua restrita pelo RLS existente', () => {
  assert.match(migration, /grant select on table public\.publications to anon, authenticated/i);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete).*publications to anon/i);
});

test('rotas pendentes foram substituídas por módulos funcionais e autorizados', () => {
  assert.doesNotMatch(app, /PendingModule/);
  for (const path of ['projetos', 'gestao-autos', 'relatorios', 'comissao-tecnica']) {
    assert.match(app, new RegExp(`path="${path}"`));
  }
  assert.match(app, /AuthorizedRoute/);
  assert.match(operations, /from\('operational_cases'\)/);
  assert.match(operations, /\.eq\('version', editing\.version\)/);
});
