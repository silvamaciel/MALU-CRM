import React from 'react';
import FileIcon from './FileIcon';


const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};


export default function FileCard({ file, onDelete, onPreview }) {
  const isImage = typeof file?.mimetype === 'string' && file.mimetype.startsWith('image/');


  return (
    <div className="file-card">
      <button
        type="button"
        className="file-preview"
        title={file.nomeOriginal}
        onClick={() => onPreview?.(file)}
        style={{ cursor: 'pointer' }}
      >
        {isImage ? (
          <img src={file.url} alt={file.nomeOriginal} className="file-thumbnail" />
        ) : (
          <div className="file-icon-container">
            <FileIcon mimetype={file.mimetype} />
          </div>
        )}
      </button>


      <div className="file-info">
        <p className="file-name" title={file.nomeOriginal}>
          {file.nomeOriginal}
        </p>
        <p className="file-meta">{formatFileSize(file.size)}</p>

      </div>


      <div className="file-actions">
        <a className="button" href={file.url} download title="Baixar">Baixar</a>
        <button
          onClick={() => onDelete?.(file)}
          className="button-link delete-link-file"
          title="Excluir Arquivo"
        >
          &times;
        </button>
      </div>
    </div>
  );
}