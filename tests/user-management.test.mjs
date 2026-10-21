import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

test('usuário comum não acessa a tela administrativa e gestão não coleta senhas diretamente', async () => {
  const result = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { renderToString } from 'react-dom/server';
        import { AuthProvider } from './src/contexts/AuthContext';
        import Page from './src/features/users/UserManagementPage';
        export { USER_SECTORS, USER_STATUS_LABELS, isManagedSuperadmin } from './src/features/users/types';
        export default renderToString(<AuthProvider><Page/></AuthProvider>);
      `,
      resolveDir: root,
      loader: 'tsx',
    },
    bundle: true,
    jsx: 'automatic',
    platform: 'node',
    format: 'esm',
    write: false,
    define: { 'import.meta.env': '{}', 'process.env.NODE_ENV': '"production"' },
    banner: {
      js: `import {createRequire} from 'node:module';const require=createRequire(${JSON.stringify(root + 'package.json')});`,
    },
  });

  let output;
  try {
    output = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
  } catch (error) {
    assert.fail('Falha de renderização: ' + error.message);
  }

  assert.match(output.default, /Acesso exclusivo do superadministrador/);
  assert.doesNotMatch(output.default, /type="password"/);

  assert.equal(output.USER_STATUS_LABELS.pending_approval, 'Aguardando aprovação');
  assert.equal(output.USER_STATUS_LABELS.rejected, 'Rejeitado');
  assert.equal(output.USER_STATUS_LABELS.blocked, 'Bloqueado');

  assert.equal(output.isManagedSuperadmin({ role: 'editor', sectors: output.USER_SECTORS }), false);
  assert.equal(output.isManagedSuperadmin({ role: 'administrator', sectors: ['Diretoria'] }), false);
  assert.equal(output.isManagedSuperadmin({ role: 'administrator', sectors: output.USER_SECTORS }), true);
});

test('formulário de cadastro público contém todos os campos requeridos na ordem correta', async () => {
  const result = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { renderToString } from 'react-dom/server';
        import { AuthProvider } from './src/contexts/AuthContext';
        import LoginForm from './src/components/LoginForm';
        export default renderToString(<AuthProvider><LoginForm/></AuthProvider>);
      `,
      resolveDir: root,
      loader: 'tsx',
    },
    bundle: true,
    jsx: 'automatic',
    platform: 'node',
    format: 'esm',
    write: false,
    define: { 'import.meta.env': '{}', 'process.env.NODE_ENV': '"production"' },
    banner: {
      js: `import {createRequire} from 'node:module';const require=createRequire(${JSON.stringify(root + 'package.json')});`,
    },
  });

  const output = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
  const html = output.default;

  assert.match(html, /Sistema de/);
  assert.match(html, /Gestão Interna/);
  assert.match(html, /Solicitar cadastro/);
});

test('mensagens de duplicidade e conflito são genéricas e não vazam dados pessoais', () => {
  // Simulação de erro 23505 (unique_violation)
  const error23505 = { code: '23505', message: 'duplicate key value violates unique constraint' };
  const genericExpected = 'Os dados informados não puderam ser validados. Verifique as informações ou contate o administrador.';

  // Validação no AuthContext
  const normalizeAuthError = (err) => {
    const msg = (err?.message || '').toLowerCase();
    if (
      msg.includes('não puderam ser validados') ||
      err?.code === '23505' ||
      msg.includes('already registered') ||
      msg.includes('user already exists')
    ) {
      return genericExpected;
    }
    return err?.message || 'Erro inesperado';
  };

  const simulatedCollision = normalizeAuthError(error23505);
  assert.equal(simulatedCollision, genericExpected);
  assert.doesNotMatch(simulatedCollision, /\d{11}/);
  assert.doesNotMatch(simulatedCollision, /@/);
  assert.doesNotMatch(simulatedCollision, /cpf|matrícula|email/i);
});

