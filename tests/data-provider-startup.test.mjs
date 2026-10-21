import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

// Render the actual provider tree before any asynchronous staff request resolves.
test('portal renderiza sem efetivo carregado antes do login', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const result = await build({
    stdin: {
      contents: `import React from 'react';
        import {renderToString} from 'react-dom/server';
        import {AuthProvider} from './src/contexts/AuthContext';
        import {DataProvider, useData} from './src/contexts/DataContext';
        function InitialScreen() {
          const {servidores, escalas} = useData();
          return <p>Login disponível: {servidores.length} pessoas, {escalas.length} escalas</p>;
        }
        export default renderToString(<AuthProvider><DataProvider><InitialScreen /></DataProvider></AuthProvider>);`,
      resolveDir: root, loader: 'tsx',
    },
    bundle: true, jsx: 'automatic', platform: 'node', format: 'esm', write: false,
    define: { 'import.meta.env': '{}' },
    banner: { js: `import {createRequire} from 'node:module'; const require=createRequire(${JSON.stringify(root + 'package.json')});` },
  });
  let markup;
  try {
    markup = (await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'))).default;
  } catch (error) {
    assert.fail(`Falha na primeira renderização: ${error.message}`);
  }
  assert.match(markup, /Login disponível/);
  assert.match(markup, /0<!-- --> pessoas/);
  assert.match(markup, /0<!-- --> escalas/);
});
