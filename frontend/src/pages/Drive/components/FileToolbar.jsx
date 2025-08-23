import React, { useRef } from 'react';

export default function FileToolbar({
  title,
  uploading,
  uploadProgress,
  onPickFile,
  accept = undefined,
}) {
  const inputRef = useRef(null);

  const handleClick = () => {
    if (inputRef.current) inputRef.current.click();
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onPickFile) onPickFile(file);
    // Limpa o input para permitir re-upload do mesmo arquivo
    e.target.value = null;
  };

  return (
    <div className="drive-content-header">
      <h2>{title}</h2>
      <button
        onClick={handleClick}
        className="button primary-button"
        disabled={uploading}
      >
        {uploading ? `A enviar... ${uploadProgress}%` : `+ Upload em ${title}`}
      </button>
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept={accept}
        style={{ display: 'none' }}
      />
    </div>
  );
}
