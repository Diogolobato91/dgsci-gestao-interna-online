import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

test('execução e validação da migration e suíte de testes SQL em PostgreSQL com rollback', async () => {
  const db = new PGlite();

  // 1. Mock do ambiente Supabase Auth e Roles
  await db.exec(`
    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key default gen_random_uuid(),
      email text,
      aud text default 'authenticated',
      role text default 'authenticated',
      raw_user_meta_data jsonb default '{}'::jsonb,
      email_confirmed_at timestamptz,
      last_sign_in_at timestamptz,
      deleted_at timestamptz,
      created_at timestamptz default now()
    );

    do $$begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated;
      end if;
    end$$;

    do $$begin if not exists(select 1 from pg_roles where rolname='service_role')then create role service_role;end if;end$$;

    create or replace function auth.uid() returns uuid language sql stable as $$
      select coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        nullif((coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb)->>'sub', '')
      )::uuid;
    $$;

    create or replace function auth.role() returns text language sql stable as $$
      select coalesce(
        nullif(current_setting('request.jwt.claim.role', true), ''),
        (coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb)->>'role',
        current_user
      );
    $$;

    create or replace function public.rls_auto_enable() returns event_trigger language plpgsql as $$ begin end; $$;
  `);

  // 2. Baselines anteriores
  const schemaSql = fs.readFileSync(path.join(root, 'supabase', 'schema.sql'), 'utf-8');
  await db.exec(schemaSql);

  const userMgmtSql = fs.readFileSync(path.join(root, 'supabase', 'user_management.sql'), 'utf-8');
  await db.exec(userMgmtSql);

  // 3. Aplicação da migration corrigida
  const migrationSql = fs.readFileSync(path.join(root, 'supabase', 'open_registration_and_approval.sql'), 'utf-8');
  await db.exec(migrationSql);

  // 4. Execução da suíte completa de testes SQL
  const testSql = fs.readFileSync(path.join(root, 'tests', 'open-registration-rls.sql'), 'utf-8');
  await db.exec(testSql);

  // Escalas e contatos usam os mesmos gatilhos reais de cadastro e papéis RLS.
  await db.exec('grant usage on schema auth to authenticated, anon;');
  const rosterBaseline = fs.readFileSync(path.join(root, 'supabase', 'library_and_roster.sql'), 'utf-8');
  await db.exec(rosterBaseline.match(/create or replace function private\.stamp_roster\(\)[\s\S]*?\$\$;/)[0]);
  await db.exec(fs.readFileSync(path.join(root, 'supabase', 'roster_planning_contacts.sql'), 'utf-8'));
  await db.exec(testSql); // O novo gatilho de contato preserva todo o fluxo de aprovação existente.
  await db.exec(fs.readFileSync(path.join(root, 'tests', 'roster-planning-rls.sql'), 'utf-8'));
  const staffMigration = fs.readdirSync(path.join(root,'supabase','migrations')).find(f=>f.endsWith('_staff_management.sql'));
  await db.exec(fs.readFileSync(path.join(root,'supabase','migrations',staffMigration),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'tests','roster-planning-rls.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'tests','staff-management-rls.sql'),'utf-8'));
  // Estruturas mínimas do Storage: as regras de leitura/escrita da migration são reais.
  await db.exec(`create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated,anon;
    grant select,insert,update,delete on storage.objects to authenticated,anon;`);
  const financeMigration=fs.readdirSync(path.join(root,'supabase','migrations')).find(f=>f.endsWith('_authorization_workflow.sql'));
  await db.exec(fs.readFileSync(path.join(root,'supabase','migrations',financeMigration),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'tests','authorization-workflow-rls.sql'),'utf-8'));

  const dailyMigration=fs.readdirSync(path.join(root,'supabase','migrations')).find(f=>f.endsWith('_dashboard_daily_roster.sql'));
  await db.exec(fs.readFileSync(path.join(root,'supabase','migrations',dailyMigration),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'tests','dashboard-duty-rls.sql'),'utf-8'));

  await db.exec(fs.readFileSync(path.join(root,'supabase','cleaning_roster.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'tests','cleaning-roster-rls.sql'),'utf-8'));

  // Estruturas e políticas reais de SATs, portarias, biblioteca e arquivos.
  await db.exec(fs.readFileSync(path.join(root,'supabase','sat_portarias.sql'),'utf-8'));
  await db.exec(`create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;`);
  await db.exec(fs.readFileSync(path.join(root,'supabase','sector_permissions.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'supabase','library_and_roster.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'supabase','notices_and_personal_data.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'tests','notices-personal-data-rls.sql'),'utf-8'));

  await db.exec(fs.readFileSync(path.join(root,'supabase','unified_user_edit.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'tests','unified-user-edit-rls.sql'),'utf-8'));

  await db.exec(fs.readFileSync(path.join(root,'supabase','account_and_notification_center.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'tests','account-notification-center-rls.sql'),'utf-8'));

  await db.exec(fs.readFileSync(path.join(root,'supabase','archive_and_audit.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'tests','archive-audit-rls.sql'),'utf-8'));

  await db.exec(fs.readFileSync(path.join(root,'supabase','record_quality.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'supabase','sat_regions_crb_risp.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'tests','permissions-matrix-rls.sql'),'utf-8'));

  await db.exec(fs.readFileSync(path.join(root,'supabase','password_management.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'tests','password-management-rls.sql'),'utf-8'));

  await db.exec(fs.readFileSync(path.join(root,'supabase','accreditation.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'supabase','accreditation_source_import.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'tests','accreditation-rls.sql'),'utf-8'));

  await db.exec(fs.readFileSync(path.join(root,'supabase','cleaning_week_and_locations.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'tests','cleaning-week-locations-rls.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'supabase','cleaning_week_editor.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'tests','cleaning-week-editor-rls.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'supabase','establishments.sql'),'utf-8'));
  await db.exec(fs.readFileSync(path.join(root,'tests','establishments-rls.sql'),'utf-8'));
  assert.ok(true, 'Todos os testes SQL foram executados com sucesso');
});
