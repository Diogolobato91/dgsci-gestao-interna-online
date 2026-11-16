import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync(
  'supabase/migrations/20261116193000_security_publications_and_legacy_attachments.sql',
  'utf8',
);

test('visitante mantém somente leitura na biblioteca pública', () => {
  assert.match(migration, /revoke insert, update, delete, truncate, references, trigger[\s\S]*public\.publications[\s\S]*from anon/i);
  assert.match(migration, /grant select on table public\.publications to anon/i);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete|truncate).*public\.publications to anon/i);
});

test('anexos legados são vinculados sem apagar arquivos ou mensagens', () => {
  assert.match(migration, /update public\.support_attachments/i);
  assert.match(migration, /set message_id/i);
  assert.match(migration, /message\.ticket_id = attachment\.ticket_id/i);
  assert.match(migration, /where message_id is null/i);
  assert.match(migration, /insert into public\.support_messages/i);
  assert.doesNotMatch(migration, /\bdelete\s+from\s+public\.support_(?:attachments|messages)/i);
});
