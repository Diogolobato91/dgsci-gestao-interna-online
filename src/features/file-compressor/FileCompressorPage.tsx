import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Download, FileArchive, FileImage, HardDrive, ImageDown, LoaderCircle, ShieldCheck, Upload, X } from 'lucide-react';
import { PageHeader } from '@/components/workspace/Workspace';
import './file-compressor.css';
import './file-compressor-layout.css';

type Mode = 'image' | 'file';
type Result = { url: string; name: string; size: number; originalSize: number; mimeType: string };
type WorkerMessage = { type: 'progress'; value: number; label: string } | { type: 'result'; buffer: ArrayBuffer; mimeType: string; extension: string } | { type: 'error'; message: string };
const MAX_FILE_SIZE = 200 * 1024 * 1024;
const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

export default function FileCompressorPage() {
  const [mode, setMode] = useState<Mode>('image');
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'image/webp' | 'image/jpeg'>('image/webp');
  const [quality, setQuality] = useState(82);
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
    if (!/\.(tif|tiff)$/i.test(candidate.name) && !candidate.type.startsWith('image/')) setMode('file');
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
      worker.postMessage({ buffer, fileName: file.name, fileType: file.type, format, quality: quality / 100 }, [buffer]);
    }
    catch { setError('Não foi possível ler este arquivo.'); setBusy(false); worker.terminate(); }
  };

  const compressFile = async () => {
    if (!file) return;
    if (!('CompressionStream' in window)) { setError('A compactação geral requer um navegador atualizado (Chrome, Edge, Firefox ou Safari recentes).'); return; }
    setBusy(true); setError(''); setProgress(0); setProgressLabel('Compactando localmente…');
    let bytesRead = 0;
    let lastUpdate = 0;
    const countedStream = new TransformStream<Uint8Array, Uint8Array>({ transform(chunk, controller) { bytesRead += chunk.byteLength; if (bytesRead - lastUpdate > 2 * 1024 * 1024) { lastUpdate = bytesRead; setProgress(Math.min(95, Math.round((bytesRead / file.size) * 95))); } controller.enqueue(chunk); } });
    try {
      const compressedStream = file.stream().pipeThrough(countedStream).pipeThrough(new CompressionStream('gzip'));
      const blob = await new Response(compressedStream).blob();
      saveResult(blob, `${file.name}.gz`, file.size, 'application/gzip');
      setProgress(100);
    } catch {
      setError('A compactação foi interrompida pelo navegador. Confira a memória disponível e tente novamente.'); setBusy(false);
    }
  };

  const compress = () => mode === 'image' ? compressImage() : compressFile();
  const savings = result ? Math.round((1 - result.size / result.originalSize) * 100) : 0;
  const isTiff = file ? /\.(tif|tiff)$/i.test(file.name) || /tiff/i.test(file.type) : false;

  return <section className="workspace-page file-compressor-page">
    <PageHeader eyebrow="Consulta compartilhada" title="Compressor de Arquivos" description="Escolha um arquivo, defina como quer recebê-lo e baixe a versão compactada." icon={FileArchive} />
    <div className="compressor-privacy"><ShieldCheck size={19}/><div><strong>Seu arquivo fica no seu dispositivo</strong><span>Ele não é enviado ao sistema nem salvo no banco de dados.</span></div></div>

    <div className="compressor-layout">
      <div className="compressor-card">
        <div className="compressor-card-heading"><span className="compressor-step">1</span><div><h2>1. Escolha um arquivo</h2><p>Selecione ou arraste um arquivo para esta área. Limite: 200 MB.</p></div></div>
        <input ref={inputRef} type="file" className="compressor-hidden-input" onChange={(event) => chooseFile(event.target.files?.[0])} />
        <button type="button" className="compressor-dropzone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }} aria-label="Selecionar ou soltar arquivo">
          <span className="compressor-upload-icon"><Upload size={22}/></span><strong>{file ? 'Trocar arquivo' : 'Clique para escolher ou solte aqui'}</strong><span>{file ? 'Você pode selecionar outro arquivo a qualquer momento.' : 'Imagens, documentos, arquivos compactados e outros formatos'}</span>
        </button>
        {file && <div className="compressor-file-row"><span className="compressor-file-icon">{mode === 'image' ? <FileImage size={19}/> : <HardDrive size={19}/>}</span><div><strong title={file.name}>{file.name}</strong><span>{formatBytes(file.size)} · {file.type || 'tipo não identificado'}</span></div><button type="button" aria-label="Remover arquivo" onClick={() => { setFile(null); clearResult(); setError(''); if (inputRef.current) inputRef.current.value = ''; }}><X size={17}/></button></div>}
      </div>

      <div className="compressor-card">
        <div className="compressor-card-heading"><span className="compressor-step">2</span><div><h2>2. Escolha como quer o resultado</h2><p>Para imagens, escolha um formato. Para outros arquivos, use compactação GZIP.</p></div></div>
        <div className="compressor-settings">
          <label>Quero<select value={mode} onChange={(event) => { setMode(event.target.value as Mode); setError(''); clearResult(); }}><option value="image">Reduzir uma imagem</option><option value="file">Compactar outro tipo de arquivo (GZIP)</option></select></label>
        </div>
        {mode === 'image' ? <div className="compressor-settings">
          <label>Formato de saída<select value={format} onChange={(event) => setFormat(event.target.value as 'image/webp' | 'image/jpeg')}><option value="image/webp">WebP — recomendado, costuma gerar menor arquivo</option><option value="image/jpeg">JPEG — compatibilidade ampla</option></select></label>
          <label className="compressor-quality">Qualidade <strong>{quality}%</strong><input type="range" min="50" max="95" step="1" value={quality} onChange={(event) => setQuality(Number(event.target.value))}/><span>Menor qualidade tende a reduzir mais o arquivo.</span></label>
          <p className="compressor-note"><AlertCircle size={16}/><span>A conversão de imagem é com perda. Cores, transparência e metadados podem mudar; em JPEG, áreas transparentes ficam brancas. TIFFs multipágina são convertidos em imagens dentro de um ZIP.</span></p>
        </div> : <div className="compressor-settings">
          <div className="compressor-gzip-badge"><FileArchive size={24}/><div><strong>GZIP sem perda</strong><span>Gera um arquivo .gz que precisa ser descompactado para recuperar o original.</span></div></div>
          <p className="compressor-note"><AlertCircle size={16}/><span>Imagens JPEG/WebP, PDFs e outros formatos já comprimidos podem ficar do mesmo tamanho ou maiores. O sistema compara os tamanhos depois do processamento.</span></p>
        </div>}
      </div>
    </div>

    {isTiff && mode === 'image' && <p className="compressor-memory"><HardDrive size={16}/> TIFF é aberto localmente. A memória usada pode ser várias vezes maior que os 60 MB do arquivo; mantenha outras abas pesadas fechadas. Há um limite de 32 megapixels para proteger o dispositivo.</p>}
    {error && <div className="compressor-alert" role="alert"><AlertCircle size={18}/><span>{error}</span></div>}
    {busy && <div className="compressor-progress" role="status"><div><LoaderCircle size={18} className="compressor-spin"/><span>{progressLabel}</span><strong>{progress}%</strong></div><progress value={progress} max="100"/></div>}

    <div className="compressor-actions"><span>O arquivo original não será alterado.</span><button type="button" className="workspace-button workspace-button-primary" disabled={!file || busy} onClick={compress}>{busy ? <><LoaderCircle size={16} className="compressor-spin"/>Processando…</> : mode === 'image' ? <><ImageDown size={16}/>Otimizar imagem</> : <><FileArchive size={16}/>Tentar compactar</>}</button></div>

    {result && <section className="compressor-result" aria-live="polite"><div className="compressor-result-title"><span><Check size={18}/></span><div><h2>Arquivo pronto</h2><p>Processamento concluído localmente.</p></div></div><div className="compressor-result-stats"><div><span>Original</span><strong>{formatBytes(result.originalSize)}</strong></div><div><span>Resultado</span><strong>{formatBytes(result.size)}</strong></div><div className={savings > 0 ? 'has-savings' : 'no-savings'}><span>{savings > 0 ? 'Redução' : 'Variação'}</span><strong>{savings > 0 ? `${savings}% menor` : `${Math.abs(savings)}% maior`}</strong></div></div>{savings <= 0 && <p className="compressor-no-gain">Este formato não reduziu com as configurações escolhidas. Tente diminuir a qualidade da imagem ou use o arquivo original.</p>}<a className="workspace-button workspace-button-primary" href={result.url} download={result.name}><Download size={16}/>Baixar {result.name}</a></section>}
  </section>;
}
