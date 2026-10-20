import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const bundle = await build({
  stdin: {
    contents: `export { MILITARY_RANKS, normalizeRank, compareStaffMembers } from './src/lib/rankHierarchy';`,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});

const { MILITARY_RANKS, normalizeRank, compareStaffMembers } = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);

test('ordem dos postos e graduações atende estritamente à especificação institucional', () => {
  const expected = [
    'CEL',
    'TCEL',
    'MAJ',
    'CAP',
    '1º TEN',
    '2º TEN',
    'SUB TEN RR',
    'SUB TEN',
    '1º SGT',
    '2º SGT',
    '3º SGT',
    'CB',
    'SD',
    'VC',
  ];
  assert.deepEqual(MILITARY_RANKS, expected);
});

test('normaliza variações comuns de abreviação, diacríticos e espaços', () => {
  assert.equal(normalizeRank('CEL').canonical, 'CEL');
  assert.equal(normalizeRank('Coronel').canonical, 'CEL');

  assert.equal(normalizeRank('TCEL').canonical, 'TCEL');
  assert.equal(normalizeRank('TEN CEL').canonical, 'TCEL');
  assert.equal(normalizeRank('Tenente-Coronel').canonical, 'TCEL');

  assert.equal(normalizeRank('MAJ').canonical, 'MAJ');
  assert.equal(normalizeRank('Major').canonical, 'MAJ');

  assert.equal(normalizeRank('CAP').canonical, 'CAP');
  assert.equal(normalizeRank('Capitão').canonical, 'CAP');

  assert.equal(normalizeRank('1º TEN').canonical, '1º TEN');
  assert.equal(normalizeRank('1° TEN').canonical, '1º TEN');
  assert.equal(normalizeRank('1 TEN').canonical, '1º TEN');
  assert.equal(normalizeRank('1ºTEN').canonical, '1º TEN');
  assert.equal(normalizeRank('1º Tenente').canonical, '1º TEN');

  assert.equal(normalizeRank('2º TEN').canonical, '2º TEN');
  assert.equal(normalizeRank('2° TEN').canonical, '2º TEN');
  assert.equal(normalizeRank('2 TEN').canonical, '2º TEN');

  assert.equal(normalizeRank('SUB TEN RR').canonical, 'SUB TEN RR');
  assert.equal(normalizeRank('SUBTEN RR').canonical, 'SUB TEN RR');
  assert.equal(normalizeRank('SUB-TEN RR').canonical, 'SUB TEN RR');
  assert.equal(normalizeRank('Subtenente RR').canonical, 'SUB TEN RR');

  assert.equal(normalizeRank('SUB TEN').canonical, 'SUB TEN');
  assert.equal(normalizeRank('SUBTEN').canonical, 'SUB TEN');
  assert.equal(normalizeRank('Subtenente').canonical, 'SUB TEN');

  assert.equal(normalizeRank('1º SGT').canonical, '1º SGT');
  assert.equal(normalizeRank('1° SGT').canonical, '1º SGT');
  assert.equal(normalizeRank('1 SGT').canonical, '1º SGT');

  assert.equal(normalizeRank('2º SGT').canonical, '2º SGT');
  assert.equal(normalizeRank('2° SGT').canonical, '2º SGT');

  assert.equal(normalizeRank('3º SGT').canonical, '3º SGT');
  assert.equal(normalizeRank('3° SGT').canonical, '3º SGT');

  assert.equal(normalizeRank('CB').canonical, 'CB');
  assert.equal(normalizeRank('Cabo').canonical, 'CB');

  assert.equal(normalizeRank('SD').canonical, 'SD');
  assert.equal(normalizeRank('Soldado').canonical, 'SD');
  assert.equal(normalizeRank('SD 1C').canonical, 'SD');

  assert.equal(normalizeRank('VC').canonical, 'VC');
  assert.equal(normalizeRank('Voluntário Civil').canonical, 'VC');
});

test('graduações desconhecidas ficam ao final e são sinalizadas sem conversão indevida para VC', () => {
  const unknown = normalizeRank('Civil Externo Convidado');
  assert.equal(unknown.order, 999);
  assert.equal(unknown.isUnknownRank, true);
  assert.equal(unknown.canonical, 'Civil Externo Convidado');
  assert.notEqual(unknown.canonical, 'VC');
});

test('ordenação do efetivo respeita hierarquia de postos e ordem alfabética dentro do mesmo posto', () => {
  const input = [
    { nome: 'Carlos Silva', postoGraduacao: 'SD' },
    { nome: 'Ana Souza', postoGraduacao: 'CEL' },
    { nome: 'Bruno Rocha', postoGraduacao: '1º TEN' },
    { nome: 'Zilda Lima', postoGraduacao: '1º TEN' },
    { nome: 'Alberto Nunes', postoGraduacao: '1º TEN' },
    { nome: 'Xavier Pinto', postoGraduacao: 'SUB TEN RR' },
    { nome: 'Wellington Moraes', postoGraduacao: 'SUB TEN' },
    { nome: 'Desconhecido', postoGraduacao: 'Especialista' },
    { nome: 'Tatiana Dias', postoGraduacao: 'VC' },
  ];

  const sorted = [...input].sort(compareStaffMembers);

  assert.deepEqual(
    sorted.map(s => `${s.postoGraduacao} - ${s.nome}`),
    [
      'CEL - Ana Souza',
      '1º TEN - Alberto Nunes',
      '1º TEN - Bruno Rocha',
      '1º TEN - Zilda Lima',
      'SUB TEN RR - Xavier Pinto',
      'SUB TEN - Wellington Moraes',
      'SD - Carlos Silva',
      'VC - Tatiana Dias',
      'Especialista - Desconhecido',
    ]
  );
});
