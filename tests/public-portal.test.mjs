import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = await build({
  entryPoints: ['src/features/public/publicPortal.ts'],
  absWorkingDir: root,
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const portal = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);

test('catálogo direciona cada serviço para uma única fila', () => {
  assert.deepEqual(portal.PUBLIC_QUEUES.map(queue => queue.id), ['inspection', 'fines', 'projects', 'accreditation', 'access']);
  assert.equal(portal.PUBLIC_SERVICES.filter(service => service.id === 'password-reset')[0].queue, 'access');
  assert.equal(portal.PUBLIC_QUEUES.find(queue => queue.id === 'access').universal, true);
  for (const service of portal.PUBLIC_SERVICES) {
    assert.ok(portal.PUBLIC_QUEUES.some(queue => queue.id === service.queue), `Fila ausente para ${service.id}`);
  }
});

test('CNPJ é formatado e validado antes da triagem', () => {
  assert.equal(portal.formatCnpj('11222333000181'), '11.222.333/0001-81');
  assert.equal(portal.isValidCnpj('11.222.333/0001-81'), true);
  assert.equal(portal.isValidCnpj('11.111.111/1111-11'), false);
  assert.equal(portal.isValidCnpj('00.299.220/0001-00'), false);
});
