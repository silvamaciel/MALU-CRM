import React from 'react';
import FileIcon from './FileIcon';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * @param {Object} props
 * @param {import('../../models/fileModel').Arquivo} props.file
 * @param {Function} props.onDelete
 */
export default function FileCard({ file, onDelete }) {
  const isImage = typeof file?.mimetype === 'string' && file.mimetype.startsWith('image/');

  return (
    <div className="file-card">
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="file-preview"
        title={file.nomeOriginal}
      >
        {isImage ? (
          <img src={file.url} alt={file.nomeOriginal} className="file-thumbnail" />
        ) : (
          <div className="file-icon-container">
            <FileIcon mimetype={file.mimetype} />
          </div>
        )}
      </a>

      <div className="file-info">
        <p className="file-name" title={file.nomeOriginal}>
          {file.nomeOriginal}
        </p>
        <p className="file-meta">{formatFileSize(file.size)}</p>
      </div>

      <div className="file-actions">
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
