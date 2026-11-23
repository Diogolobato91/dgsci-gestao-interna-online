import { PDFDocument } from 'pdf-lib';

type WorkerScope = {
  onmessage: ((event: MessageEvent<{ buffer: ArrayBuffer }>) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
};
const workerScope = self as unknown as WorkerScope;

workerScope.onmessage = async ({ data }: MessageEvent<{ buffer: ArrayBuffer }>) => {
  try {
    const pdf = await PDFDocument.load(data.buffer, { ignoreEncryption: false, updateMetadata: false });
    workerScope.postMessage({ type: 'progress', value: 55, label: 'Otimizando estrutura do PDF…' });
    const bytes = await pdf.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 50 });
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    workerScope.postMessage({ type: 'result', buffer, mimeType: 'application/pdf', extension: 'pdf' }, [buffer]);
  } catch (error) {
    const encrypted = error instanceof Error && /encrypt/i.test(error.message);
    workerScope.postMessage({ type: 'error', message: encrypted ? 'Este PDF está protegido por senha e não pode ser otimizado sem desbloqueá-lo.' : 'Não foi possível ler este PDF. Ele pode estar danificado ou usar um recurso não compatível.' });
  }
};
