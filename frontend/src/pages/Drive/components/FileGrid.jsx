import React from 'react';
import FileCard from './FileCard';

/**
 * @param {Object} props
 * @param {Array<import('../../models/fileModel').Arquivo>} props.files
 * @param {boolean} props.loading
 * @param {Function} props.onDelete
 */
export default function FileGrid({ files, loading, onDelete }) {
  if (loading) return <p>A carregar arquivos...</p>;

  if (!files || files.length === 0) {
    return <p className="no-data-message">Nenhum arquivo nesta categoria.</p>;
  }

  return (
    <div className="files-grid">
      {files.map((f) => (
        <FileCard key={f._id} file={f} onDelete={onDelete} />
      ))}
    </div>
  );
}
