import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const desk = fs.readFileSync('src/features/support-desk/SupportDesk.tsx', 'utf8');

test('atualização periódica da caixa não apaga respostas rápidas', () => {
  const loadInbox = desk.slice(desk.indexOf('const loadInbox='), desk.indexOf('const loadMessages='));
  assert.doesNotMatch(loadInbox, /setQuickReplies/);
  assert.doesNotMatch(loadInbox, /Promise\.resolve\(\{data:\[\]/);
  assert.match(desk, /get_support_quick_replies_for_ticket/);
});
