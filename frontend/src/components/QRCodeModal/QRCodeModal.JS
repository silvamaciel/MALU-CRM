import React, { useState, useEffect } from 'react';
import { getEvolutionInstanceStatusApi } from '../../api/integrations'; // Adicionaremos esta função na API
import './QRCodeModal.css';

function QRCodeModal({ isOpen, onClose, instance, onConnected }) {
    const [qrCode, setQrCode] = useState(null);
    const [status, setStatus] = useState('CARREGANDO'); // CARREGANDO, AGUARDANDO_QR_CODE, CONECTADO
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen || !instance) return;

        // Inicia o "polling": verifica o status a cada 5 segundos
        const intervalId = setInterval(async () => {
            try {
                const state = await getEvolutionInstanceStatusApi(instance._id);
                setStatus(state.status);

                if (state.status === 'CONECTADO') {
                    setQrCode(null);
                    clearInterval(intervalId); // Para o polling
                    onConnected(); // Avisa o pai que conectou
                } else if (state.status === 'AGUARDANDO_QR_CODE') {
                    setQrCode(state.qrcode);
                }
            } catch (err) {
                setError(err.message || 'Falha ao buscar status.');
                clearInterval(intervalId); // Para o polling em caso de erro
            }
        }, 5000); // a cada 5 segundos

        // Limpa o intervalo quando o modal é fechado ou o componente desmontado
        return () => clearInterval(intervalId);

    }, [isOpen, instance, onConnected]);

    if (!isOpen) return null;

    return (
        <div className="qr-modal-overlay" onClick={onClose}>
            <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Conectar WhatsApp à Instância: {instance.instanceName}</h3>
                <div className="qr-modal-body">
                    {status === 'CARREGANDO' && <p>Buscando status da conexão...</p>}
                    {status === 'CONECTADO' && <div className="qr-success">✅<p>Conectado com sucesso!</p></div>}
                    {error && <p className="error-message">{error}</p>}

                    {status === 'AGUARDANDO_QR_CODE' && (
                        <>
                            <p>Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie o QR Code abaixo.</p>
                            {qrCode ? (
                                <img src={`data:image/png;base64,${qrCode}`} alt="QR Code para conectar WhatsApp" />
                            ) : (
                                <p>Gerando QR Code...</p>
                            )}
                        </>
                    )}
                </div>
                <div className="qr-modal-footer">
                    <button className="button cancel-button" onClick={onClose}>Fechar</button>
                </div>
            </div>
        </div>
    );
}

export default QRCodeModal;