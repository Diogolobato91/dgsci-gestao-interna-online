import { useEffect, useState } from 'react';

export function usePrivateSnapshot<T>(name: 'efetivo' | 'diarias') {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError('');
    fetch(`/private-data/${name}.json`, { signal: controller.signal, credentials: 'same-origin', cache: 'no-store' })
      .then(async response => {
        if (!response.ok || !response.headers.get('content-type')?.includes('json')) throw new Error('A base privada ainda não está disponível neste ambiente.');
        return response.json();
      }).then(setData).catch(reason => { if (reason.name !== 'AbortError') setError(reason.message); });
    return () => controller.abort();
  }, [name]);
  return { data, error };
}
