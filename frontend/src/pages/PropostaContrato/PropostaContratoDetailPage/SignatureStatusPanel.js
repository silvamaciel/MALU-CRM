import React from 'react';
import './SignatureStatusPanel.css';

// Adicionamos um valor padrão para a prop 'status'
function SignatureStatusPanel({ status = "Não Enviado", signatarios = [] }) {
    // Agora, mesmo que 'status' seja undefined, ele usará "Não Enviado" como fallback.
    const statusClassName = String(status).toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="signature-status-panel card">
            <h4>Status da Assinatura</h4>
            <div className="status-header">
                <span className={`status-badge status-${statusClassName}`}>
                    {status}
                </span>
            </div>
            <h5>Signatários</h5>
            <ul className="signatarios-list">
                {signatarios.length > 0 ? signatarios.map((signer, index) => (
                    <li key={index} className={`signer-item status-${signer.status.toLowerCase()}`}>
                        <span className="signer-email">{signer.email}</span>
                        <span className="signer-status">{signer.status}</span>
                    </li>
                )) : <p>Nenhum signatário definido.</p>}
            </ul>
        </div>
    );
}

export default SignatureStatusPanel;