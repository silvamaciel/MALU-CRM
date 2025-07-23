//src/components/StatusBadge/StatusBadge.js e StatusBadge.css
import React from 'react';
import './StatusBadge.css';

function StatusBadge({ status }) {
    // Mapeia os status da API para classes CSS e texto amigável
    const statusMap = {
        open: { text: 'Conectado', className: 'success' },
        connecting: { text: 'Conectando', className: 'warning' },
        close: { text: 'Desconectado', className: 'danger' },
    };
    const currentStatus = statusMap[status] || { text: status || 'Desconhecido', className: 'default' };

    return (
        <span className={`status-badge ${currentStatus.className}`}>
            {currentStatus.text}
        </span>
    );
}
export default StatusBadge;