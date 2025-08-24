import React, { useEffect, useMemo, useState } from 'react';
import { getPreviewBlobApi } from '../../../api/fileApi';

export default function PreviewModal({ open, file, onClose }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [mime, setMime] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const isImage = useMemo(() => mime.startsWith('image/'), [mime]);
  const isPdf   = useMemo(() => mime === 'application/pdf', [mime]);
  const isVideo = useMemo(() => mime.startsWith('video/'), [mime]);
  const isAudio = useMemo(() => mime.startsWith('audio/'), [mime]);

  useEffect(() => {
    let url;
    const fetchBlob = async () => {
      if (!open || !file?._id) return;
      setLoading(true);
      setErr('');
      try {
        const { blob, contentType } = await getPreviewBlobApi(file._id);
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
        setMime(contentType);
      } catch (e) {
        setErr('Não foi possível carregar a pré-visualização.');
      } finally {
        setLoading(false);
      }
    };
    fetchBlob();
    return () => {
      if (url) URL.revokeObjectURL(url);
      setObjectUrl(null);
      setMime('');
      setErr('');
      setLoading(false);
    };
  }, [open, file?._id]);

  if (!open || !file) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: 900, width: '96%' }}>
        <header className="modal-header">
          <h3 style={{ marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file.nomeOriginal}
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a className="button" href={file.url} target="_blank" rel="noopener noreferrer">Abrir em nova aba</a>
            <a className="button" href={file.url} download>Baixar</a>
            <button className="button-link" onClick={onClose} aria-label="Fechar">×</button>
          </div>
        </header>

        <div className="modal-body">
          {loading && <p>Carregando pré-visualização…</p>}
          {!loading && err && (
            <div className="no-data-message">{err}</div>
          )}

          {!loading && !err && objectUrl && (
            <>
              {isImage && (
                <img
                  src={objectUrl}
                  alt={file.nomeOriginal}
                  style={{ maxWidth: '100%', maxHeight: '72vh', display: 'block', margin: '0 auto' }}
                />
              )}

              {isPdf && (
                <iframe
                  src={objectUrl}
                  title={file.nomeOriginal}
                  style={{ width: '100%', height: '72vh', border: 0 }}
                />
              )}

              {isVideo && (
                <video
                  src={objectUrl}
                  controls
                  style={{ width: '100%', maxHeight: '72vh', display: 'block' }}
                />
              )}

              {isAudio && (
                <audio
                  src={objectUrl}
                  controls
                  style={{ width: '100%' }}
                />
              )}

              {!isImage && !isPdf && !isVideo && !isAudio && (
                <div className="no-data-message">
                  Pré-visualização não suportada para este tipo de arquivo.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
