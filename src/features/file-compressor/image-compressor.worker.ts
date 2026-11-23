import UTIF from 'utif';
import { zipSync } from 'fflate';

type WorkerRequest = {
  buffer: ArrayBuffer;
  fileName: string;
  fileType: string;
  format: 'image/webp' | 'image/jpeg';
  quality: number;
};

type WorkerScope = {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
};
const workerScope = self as unknown as WorkerScope;
const MAX_PIXELS = 100_000_000;

function getTagNumber(value: unknown): number {
  if (Array.isArray(value)) return Number(value[0] || 0);
  return Number(value || 0);
}

async function canvasBlob(canvas: OffscreenCanvas, format: string, quality: number) {
  try {
    return await canvas.convertToBlob({ type: format, quality });
  } catch {
    throw new Error('Este navegador não conseguiu gerar o formato escolhido. Tente JPEG ou use outro navegador.');
  }
}

workerScope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { buffer, fileName, fileType, format, quality } = event.data;
  try {
    const isTiff = /\.(tif|tiff)$/i.test(fileName) || /tiff/i.test(fileType);
    if (isTiff) {
      const ifds = UTIF.decode(buffer);
      if (!ifds.length) throw new Error('Não encontrei páginas TIFF legíveis nesse arquivo.');
      const dimensions = ifds.map((ifd) => ({
        width: getTagNumber(ifd.t256) || Number(ifd.width),
        height: getTagNumber(ifd.t257) || Number(ifd.height),
      }));
      const totalPixels = dimensions.reduce((sum, page) => sum + page.width * page.height, 0);
      if (dimensions.some((page) => !page.width || !page.height) || totalPixels > MAX_PIXELS) {
        throw new Error('A imagem excede o limite de segurança de 100 megapixels deste navegador.');
      }
      const pages: Record<string, Uint8Array> = {};
      let firstPageBlob: Blob | null = null;
      for (let index = 0; index < ifds.length; index += 1) {
        workerScope.postMessage({ type: 'progress', value: Math.round((index / ifds.length) * 80), label: `Lendo página ${index + 1} de ${ifds.length}` });
        const ifd = ifds[index];
        UTIF.decodeImage(buffer, ifd);
        const pixels = UTIF.toRGBA8(ifd);
        ifd.data = undefined;
        const { width, height } = dimensions[index];
        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Não foi possível preparar a imagem para conversão.');
        if (format === 'image/jpeg') {
          context.fillStyle = '#fff';
          context.fillRect(0, 0, width, height);
        }
        context.putImageData(new ImageData(new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.byteLength), width, height), 0, 0);
        const blob = await canvasBlob(canvas, format, quality);
        if (blob.type !== format) throw new Error('O navegador não oferece suporte ao formato de imagem escolhido.');
        if (ifds.length === 1) firstPageBlob = blob;
        else pages[`${fileName.replace(/\.tiff?$/i, '')}-pagina-${String(index + 1).padStart(2, '0')}.${format === 'image/webp' ? 'webp' : 'jpg'}`] = new Uint8Array(await blob.arrayBuffer());
        workerScope.postMessage({ type: 'progress', value: Math.round(((index + 1) / ifds.length) * 90), label: `Otimizando página ${index + 1} de ${ifds.length}` });
      }
      if (firstPageBlob) {
        const result = await firstPageBlob.arrayBuffer();
        workerScope.postMessage({ type: 'result', buffer: result, mimeType: format, extension: format === 'image/webp' ? 'webp' : 'jpg' }, [result]);
      } else {
        const result = zipSync(pages, { level: 0 });
        workerScope.postMessage({ type: 'result', buffer: result.buffer, mimeType: 'application/zip', extension: 'zip' }, [result.buffer]);
      }
      return;
    }

    const bitmap = await createImageBitmap(new Blob([buffer], { type: fileType }));
    if (bitmap.width * bitmap.height > MAX_PIXELS) {
      bitmap.close();
      throw new Error('A imagem excede o limite de segurança de 100 megapixels deste navegador.');
    }
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a imagem para conversão.');
    if (format === 'image/jpeg') {
      context.fillStyle = '#fff';
      context.fillRect(0, 0, bitmap.width, bitmap.height);
    }
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    workerScope.postMessage({ type: 'progress', value: 65, label: 'Otimizando imagem' });
    const blob = await canvasBlob(canvas, format, quality);
    if (blob.type !== format) throw new Error('O navegador não oferece suporte ao formato de imagem escolhido.');
    const result = await blob.arrayBuffer();
    workerScope.postMessage({ type: 'result', buffer: result, mimeType: format, extension: format === 'image/webp' ? 'webp' : 'jpg' }, [result]);
  } catch (error) {
    workerScope.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível processar este arquivo.' });
  }
};
