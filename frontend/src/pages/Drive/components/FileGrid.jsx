import React from 'react';
import FileCard from './FileCard';


export default function FileGrid({ files, loading, onDelete, onPreview }) {
  if (loading) return <p>A carregar arquivos...</p>;
  if (!files || files.length === 0) return <p className="no-data-message">Nenhum arquivo nesta categoria.</p>;


  return (
    <div className="files-grid">
      {files.map((f) => (<FileCard key={f._id} file={f} onDelete={onDelete} onPreview={onPreview} />))}
    </div>
  );
}