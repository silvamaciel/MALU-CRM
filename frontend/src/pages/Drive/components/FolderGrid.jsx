import React from 'react';


/**
* Grid de "pastas" (cards) para seleção de Empreendimentos
* @param {Object} props
* @param {Array<{_id: string, nome: string}>} props.items
* @param {(item: { _id: string, nome: string }) => void} props.onOpen
*/
export default function FolderGrid({ items, onOpen }) {
if (!items?.length) return <p className="no-data-message">Nenhum empreendimento encontrado.</p>;


return (
<div className="files-grid">
{items.map((it) => (
<div key={it._id} className="file-card folder-card" onClick={() => onOpen(it)}>
<div className="file-icon-container" style={{ fontSize: 36 }}>
<i className="fas fa-folder"></i>
</div>
<div className="file-info">
<p className="file-name" title={it.nome}>{it.nome}</p>
</div>
</div>
))}
</div>
);
}