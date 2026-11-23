import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Download, FileArchive, FileImage, HardDrive, ImageDown, LoaderCircle, ShieldCheck, Upload, X } from 'lucide-react';
import { PageHeader } from '@/components/workspace/Workspace';
import './file-compressor.css';
import './file-compressor-layout.css';

type Result = { url: string; name: string; size: number; originalSize: number; mimeType: string };
type WorkerMessage = { type: 'progress'; value: number; label: string } | { type: 'result'; buffer: ArrayBuffer; mimeType: string; extension: string } | { type: 'error'; message: string };
type PdfWorkerMessage = WorkerMessage;
const MAX_FILE_SIZE = 200 * 1024 * 1024;
const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

export default function FileCompressorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Preparando…');
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultUrlRef = useRef<string | null>(null);

  useEffect(() => () => { if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current); }, []);

  const clearResult = () => {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
    setResult(null);
  };

  const chooseFile = (candidate?: File) => {
    if (!candidate) return;
    setError('');
    clearResult();
    if (candidate.size > MAX_FILE_SIZE) { setFile(null); setError('O limite por arquivo é 200 MB para evitar falta de memória no dispositivo.'); return; }
    setFile(candidate);
  };

  const saveResult = (blob: Blob, name: string, originalSize: number, mimeType: string) => {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    const url = URL.createObjectURL(blob);
    resultUrlRef.current = url;
    setResult({ url, name, size: blob.size, originalSize, mimeType });
    setBusy(false);
  };

  const compressImage = async () => {
    if (!file) return;
    setBusy(true); setError(''); setProgress(0); setProgressLabel('Lendo imagem…');
    const worker = new Worker(new URL('./image-compressor.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (message.type === 'progress') { setProgress(message.value); setProgressLabel(message.label); return; }
      if (message.type === 'error') { setError(message.message); setBusy(false); worker.terminate(); return; }
      const blob = new Blob([message.buffer], { type: message.mimeType });
      const basename = file.name.replace(/\.[^.]+$/, '') || 'imagem';
      saveResult(blob, `${basename}-compactado.${message.extension}`, file.size, message.mimeType);
      worker.terminate();
    };
    worker.onerror = () => { setError('O navegador não conseguiu processar esta imagem. Tente novamente ou use outro navegador.'); setBusy(false); worker.terminate(); };
    try {
      const buffer = await file.arrayBuffer();
      worker.postMessage({ buffer, fileName: file.name, fileType: file.type, format: 'image/webp', quality: 0.82 }, [buffer]);
    }
    catch { setError('Não foi possível ler este arquivo.'); setBusy(false); worker.terminate(); }
  };

  const compressPdf = async () => {
    if (!file) return;
    setBusy(true); setError(''); setProgress(0); setProgressLabel('Lendo PDF…');
    const worker = new Worker(new URL('./pdf-compressor.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<PdfWorkerMessage>) => {
      const message = event.data;
      if (message.type === 'progress') { setProgress(message.value); setProgressLabel(message.label); return; }
      if (message.type === 'error') { setError(message.message); setBusy(false); worker.terminate(); return; }
      const blob = new Blob([message.buffer], { type: message.mimeType });
      const basename = file.name.replace(/\.pdf$/i, '') || 'documento';
      saveResult(blob, `${basename}-compactado.pdf`, file.size, 'application/pdf');
      worker.terminate();
    };
    worker.onerror = () => { setError('Não foi possível otimizar este PDF neste navegador.'); setBusy(false); worker.terminate(); };
    try {
      const buffer = await file.arrayBuffer();
      worker.postMessage({ buffer }, [buffer]);
    } catch { setError('Não foi possível ler este PDF.'); setBusy(false); worker.terminate(); }
  };

  const isImage = (candidate: File) => candidate.type.startsWith('image/') || /\.(tif|tiff|jpe?g|png|webp|gif|bmp|avif)$/i.test(candidate.name);
  const isPdf = (candidate: File) => candidate.type === 'application/pdf' || /\.pdf$/i.test(candidate.name);
  const compress = () => {
    if (!file) return;
    if (isImage(file)) void compressImage();
    else if (isPdf(file)) void compressPdf();
    else setError('Este formato ainda não tem um otimizador próprio. Para preservar o arquivo, ele não será convertido para .gz.');
  };
  const savings = result ? Math.round((1 - result.size / result.originalSize) * 100) : 0;
  const isTiff = file ? /\.(tif|tiff)$/i.test(file.name) || /tiff/i.test(file.type) : false;

  return <section className="workspace-page file-compressor-page">
    <PageHeader eyebrow="Consulta compartilhada" title="Compressor de Arquivos" description="Escolha um arquivo e clique em otimizar. O sistema identifica o formato automaticamente." icon={FileArchive} />
    <div className="compressor-privacy"><ShieldCheck size={19}/><div><strong>Seu arquivo fica no seu dispositivo</strong><span>Ele não é enviado ao sistema nem salvo no banco de dados.</span></div></div>

    <div className="compressor-layout">
      <div className="compressor-card">
        <div className="compressor-card-heading"><span className="compressor-step">1</span><div><h2>Escolha um arquivo</h2><p>Selecione ou arraste o arquivo aqui. Limite: 200 MB.</p></div></div>
        <input ref={inputRef} type="file" className="compressor-hidden-input" onChange={(event) => chooseFile(event.target.files?.[0])} />
        <button type="button" className="compressor-dropzone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }} aria-label="Selecionar ou soltar arquivo">
          <span className="compressor-upload-icon"><Upload size={22}/></span><strong>{file ? 'Trocar arquivo' : 'Clique para escolher ou solte aqui'}</strong><span>{file ? 'Você pode selecionar outro arquivo a qualquer momento.' : 'Imagens, documentos, arquivos compactados e outros formatos'}</span>
        </button>
        {file && <div className="compressor-file-row"><span className="compressor-file-icon">{isImage(file) ? <FileImage size={19}/> : <HardDrive size={19}/>}</span><div><strong title={file.name}>{file.name}</strong><span>{formatBytes(file.size)} · {file.type || 'tipo não identificado'}</span></div><button type="button" aria-label="Remover arquivo" onClick={() => { setFile(null); clearResult(); setError(''); if (inputRef.current) inputRef.current.value = ''; }}><X size={17}/></button></div>}
      </div>

      <div className="compressor-card compressor-how-card">
        <div className="compressor-card-heading"><span className="compressor-step"><HardDrive size={15}/></span><div><h2>Otimização automática</h2><p>O arquivo continua no formato original.</p></div></div>
        <div className="compressor-auto-options"><div><FileImage size={21}/><span><strong>Imagens</strong> são otimizadas como WebP.</span></div><div><FileArchive size={21}/><span><strong>PDFs</strong> são reorganizados e continuam PDF.</span></div></div>
        <p className="compressor-note"><AlertCircle size={16}/><span>Arquivos que já têm compressão podem não diminuir. Se não houver ganho, você verá os tamanhos antes de baixar.</span></p>
      </div>
    </div>

    {isTiff && <p className="compressor-memory"><HardDrive size={16}/> Imagens grandes podem usar várias vezes o tamanho do arquivo em memória. Para TIFF, o limite é 100 megapixels; se faltar memória, tente fechar outros programas.</p>}
    {error && <div className="compressor-alert" role="alert"><AlertCircle size={18}/><span>{error}</span></div>}
    {busy && <div className="compressor-progress" role="status"><div><LoaderCircle size={18} className="compressor-spin"/><span>{progressLabel}</span><strong>{progress}%</strong></div><progress value={progress} max="100"/></div>}

    <div className="compressor-actions"><span>O arquivo original não será alterado.</span><button type="button" className="workspace-button workspace-button-primary" disabled={!file || busy} onClick={compress}>{busy ? <><LoaderCircle size={16} className="compressor-spin"/>Otimizando…</> : <><ImageDown size={16}/>Otimizar arquivo</>}</button></div>

    {result && <section className="compressor-result" aria-live="polite"><div className="compressor-result-title"><span><Check size={18}/></span><div><h2>Arquivo pronto</h2><p>Processamento concluído localmente.</p></div></div><div className="compressor-result-stats"><div><span>Original</span><strong>{formatBytes(result.originalSize)}</strong></div><div><span>Resultado</span><strong>{formatBytes(result.size)}</strong></div><div className={savings > 0 ? 'has-savings' : 'no-savings'}><span>{savings > 0 ? 'Redução' : 'Variação'}</span><strong>{savings > 0 ? `${savings}% menor` : `${Math.abs(savings)}% maior`}</strong></div></div>{savings <= 0 && <p className="compressor-no-gain">Este formato não reduziu com as configurações escolhidas. Tente diminuir a qualidade da imagem ou use o arquivo original.</p>}<a className="workspace-button workspace-button-primary" href={result.url} download={result.name}><Download size={16}/>Baixar {result.name}</a></section>}
  </section>;
}
