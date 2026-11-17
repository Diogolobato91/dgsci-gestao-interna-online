import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration=fs.readFileSync('supabase/migrations/20261117173000_duty_log_book.sql','utf8');
const page=fs.readFileSync('src/features/duty-log/DutyLogPage.tsx','utf8');
const navigation=fs.readFileSync('src/config/navigation.ts','utf8');
const superadminMigration=fs.readFileSync('supabase/migrations/20261117193000_duty_log_superadmin_controls.sql','utf8');

test('livro numera a Parte pelo dia do ano e impede duplicidade diária',()=>{
  assert.match(migration,/service_date date not null unique/i);
  assert.match(migration,/extract\(doy from service_date\)/i);
  assert.match(migration,/status in \('draft','closed','reviewed'\)/i);
});

test('operações sensíveis são autorizadas no banco e possuem auditoria',()=>{
  assert.match(migration,/private\.duty_log_team_role/i);
  assert.match(migration,/Somente o Chefe do Plantão pode encerrar/i);
  assert.match(migration,/Visto restrito à Administração/i);
  assert.match(migration,/insert into private\.duty_log_events/i);
  assert.match(migration,/revoke all on public\.duty_log_parts from public,anon,authenticated/i);
});

test('interface contempla as treze seções sem oferecer anexos',()=>{
  for(const title of ['Recebimento do serviço','Escala, permutas e substituições','Faxina','Ronda e monitoramento','Pavilhão Nacional','Consumo de energia elétrica','Abastecimento e alterações de viaturas','Cautela de materiais','Juntada de documentos','Perícia de incêndio','Participações e ocorrências','Passagem do serviço']) assert.match(page,new RegExp(title,'i'));
  assert.doesNotMatch(page,/type=["']file["']/i);
  assert.match(navigation,/Livro do Plantão/);
});

test('edição e exclusão excepcionais pertencem somente ao superadministrador',()=>{
  assert.match(superadminMigration,/member\.role='administrator'/i);
  assert.match(superadminMigration,/A edição excepcional é exclusiva do superadministrador/i);
  assert.match(superadminMigration,/A exclusão é exclusiva do superadministrador/i);
  assert.match(superadminMigration,/admin_deleted/i);
  assert.match(page,/EXCLUIR PARTE/);
});
