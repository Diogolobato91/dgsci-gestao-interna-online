const bytesEqual = (bytes: Uint8Array, expected: number[], offset = 0) => expected.every((value, index) => bytes[offset + index] === value);

export async function validateFileContent(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, Math.min(file.size, 8192)).arrayBuffer());
  if (file.type === 'application/pdf') {
    if (!bytesEqual(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return false;
    const header = new TextDecoder('latin1').decode(bytes);
    return !/\/(JavaScript|JS|Launch|EmbeddedFile)\b/i.test(header);
  }
  if (file.type === 'image/png') return bytesEqual(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (file.type === 'image/jpeg') return bytesEqual(bytes, [0xff, 0xd8, 0xff]);
  if (file.type === 'image/webp') return bytesEqual(bytes, [0x52, 0x49, 0x46, 0x46]) && bytesEqual(bytes, [0x57, 0x45, 0x42, 0x50], 8);
  return false;
}

export async function downloadFile(url: string, fileName: string) {
  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) throw new Error('download');
  const objectUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
