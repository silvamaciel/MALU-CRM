import { useCallback, useEffect, useRef, useState } from 'react';
import { listarArquivosApi } from '../../../api/fileApi';
import { toast } from 'react-toastify';

/**
 * Hook de listagem com filtros para arquivos.
 * @param {object} params
 * @param {string} params.categoria
 * @param {object} [params.filters] - Outros filtros (ex: associations)
 */
export default function useFiles({ categoria, filters = {} }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const payload = { categoria, ...filters };
      const data = await listarArquivosApi(payload);
      if (!mountedRef.current) return;
      setFiles(Array.isArray(data) ? data : []);
    } catch (error) {
      if (!mountedRef.current) return;
      toast.error(`Erro ao carregar arquivos da categoria ${categoria}.`);
      setFiles([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [categoria, JSON.stringify(filters)]); // stringify para evitar deps profundas

  useEffect(() => {
    mountedRef.current = true;
    fetchFiles();
    return () => { mountedRef.current = false; };
  }, [fetchFiles]);

  return { files, loading, refetch: fetchFiles, setFiles };
}
