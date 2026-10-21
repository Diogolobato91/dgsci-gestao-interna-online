import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const bundle = await build({
  stdin: {
    contents: `export { maskCpf, validateCpf, validateBirthDate, validateRegistrationForm } from './src/lib/userValidation';`,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});

const { maskCpf, validateCpf, validateBirthDate, validateRegistrationForm } = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);

test('máscara de CPF aplica formatação progressiva 000.000.000-00', () => {
  assert.equal(maskCpf('123'), '123');
  assert.equal(maskCpf('1234'), '123.4');
  assert.equal(maskCpf('123456'), '123.456');
  assert.equal(maskCpf('1234567'), '123.456.7');
  assert.equal(maskCpf('123456789'), '123.456.789');
  assert.equal(maskCpf('12345678901'), '123.456.789-01');
  assert.equal(maskCpf('123.456.789-01 extra'), '123.456.789-01');
});

test('validação de CPF rejeita inválidos e dígitos repetidos e aceita CPFs válidos', () => {
  assert.equal(validateCpf('00000000000'), false);
  assert.equal(validateCpf('11111111111'), false);
  assert.equal(validateCpf('12345678900'), false);
  assert.equal(validateCpf('123'), false);

  // CPFs válidos de teste
  assert.equal(validateCpf('52998224725'), true);
  assert.equal(validateCpf('529.982.247-25'), true);
  assert.equal(validateCpf('11144477735'), true);
});

test('validação de data de nascimento barra datas futuras e inválidas e aceita datas válidas no passado', () => {
  assert.equal(validateBirthDate('').valid, false);
  assert.equal(validateBirthDate('2099-01-01').valid, false);
  assert.equal(validateBirthDate('1850-01-01').valid, false);
  assert.equal(validateBirthDate('1990-05-15').valid, true);
  assert.equal(validateBirthDate('2015-08-20').valid, true);
});

test('validação do formulário de cadastro checa todos os campos obrigatórios', () => {
  const emptyResult = validateRegistrationForm({
    nome: '',
    postoGraduacao: '',
    matricula: '',
    cpf: '',
    dataNascimento: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  assert(emptyResult.nome);
  assert(emptyResult.postoGraduacao);
  assert(emptyResult.matricula);
  assert(emptyResult.cpf);
  assert(emptyResult.dataNascimento);
  assert(emptyResult.email);
  assert(emptyResult.password);

  const mismatchResult = validateRegistrationForm({
    nome: 'Tenente Silva',
    postoGraduacao: '1º TEN',
    matricula: '123456',
    cpf: '529.982.247-25',
    dataNascimento: '1992-04-10',
    email: 'silva@cbmpa.pa.gov.br',
    password: 'password123',
    confirmPassword: 'differentPassword',
  });
  assert.equal(mismatchResult.confirmPassword, 'A confirmação de senha não coincide com a senha digitada.');
  assert.equal(Object.keys(mismatchResult).length, 1);
});
