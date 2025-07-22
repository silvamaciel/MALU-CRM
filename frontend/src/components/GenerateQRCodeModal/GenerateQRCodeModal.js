import React, { useState, useEffect } from 'react';
import { getEvolutionInstanceStatusApi } from '../../api/integrations';

function GenerateQRCodeModal({ isOpen, onClose, instance }) {
 const [qrCode, setQrCode] = useState(null);
    const [status, setStatus] = useState('INICIAL'); // INICIAL, CARREGANDO, QR_CODE, CONECTADO
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStatus('INICIAL');
            setQrCode(null);
            setError('');
        }
    }, [isOpen]);

    const fetchQRCode = async () => {
        if (!instance) return;
        setStatus('CARREGANDO');
        setError('');
        try {
            const state = await getEvolutionInstanceStatusApi(instance._id);
            if (state.status === 'CONECTADO') {
                setStatus('CONECTADO');
                setQrCode(null);
                setTimeout(() => { // Dá um tempo para o usuário ver a mensagem
                    onConnected();
                }, 1500);
            } else if (state.status === 'AGUARDANDO_QR_CODE' && state.qrcode) {
                setStatus('QR_CODE');
                setQrCode(state.qrcode);
            } else {
                throw new Error("Não foi possível gerar o QR Code. A instância pode estar em um estado inesperado. Tente novamente em alguns instantes.");
            }
        } catch (err) {
            setError(err.message || 'Falha ao buscar status.');
            setStatus('ERRO');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="qr-modal-overlay" onClick={onClose}>
            <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Conectar WhatsApp à Instância: {instance.instanceName}</h3>
                <div className="qr-modal-body">
                    {status === 'INICIAL' && (
                        <>
                            <p>Clique no botão abaixo para gerar um novo QR Code.</p>
                            <button onClick={fetchQRCode} className="button primary-button">Gerar QR Code</button>
                        </>
                    )}
                    {status === 'CARREGANDO' && <p>Gerando QR Code...</p>}
                    {status === 'CONECTADO' && <div className="qr-success">✅<p>Conectado com sucesso!</p></div>}
                    {status === 'ERRO' && <p className="error-message">{error}</p>}
                    {status === 'QR_CODE' && (
                        <>
                            <p>Escaneie o QR Code abaixo com seu celular. Ele é válido por cerca de 30 segundos.</p>
                            {qrCode && <img src={`data:image/png;base64,${qrCode}`} alt="QR Code para conectar WhatsApp" />}
                            <button onClick={fetchQRCode} className="button outline-button" style={{marginTop: '15px'}}>Gerar Novo QR Code</button>
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
export default GenerateQRCodeModal;