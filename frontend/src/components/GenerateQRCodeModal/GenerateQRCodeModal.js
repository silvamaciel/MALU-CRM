import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { getEvolutionInstanceStatusApi, getQrCodeFromApi } from '../../api/integrations';
import './QRCodeModal.css';

function GenerateQRCodeModal({ isOpen, onClose, instance, onConnected }) {
    const [qrCode, setQrCode] = useState(null);
    const [status, setStatus] = useState('INICIAL');
    const [error, setError] = useState('');

    const pollingQrRef = useRef(null);
    const pollingStatusRef = useRef(null);

    const stopAllPolling = () => {
        if (pollingQrRef.current) {
            clearInterval(pollingQrRef.current);
            pollingQrRef.current = null;
        }
        if (pollingStatusRef.current) {
            clearInterval(pollingStatusRef.current);
            pollingStatusRef.current = null;
        }
    };

    useEffect(() => stopAllPolling, []);

    useEffect(() => {
        if (isOpen) {
            setStatus('INICIAL');
            setQrCode(null);
            setError('');
            stopAllPolling();
        }
    }, [isOpen]);

    const startPollingForStatusConnected = () => {
        pollingStatusRef.current = setInterval(async () => {
            try {
                const response = await getEvolutionInstanceStatusApi(instance._id);
                if (response?.status === 'connected' || response?.status === 'CONECTADO') {
                    stopAllPolling();
                    setStatus('CONECTADO');
                    toast.success(`Instância '${instance.instanceName}' conectada!`);
                    onConnected?.();
                }
            } catch (err) {
                console.warn("Erro ao verificar status da instância:", err);
            }
        }, 5000);
    };

    const fetchQRCode = async () => {
        if (!instance) return;
        setStatus('GERANDO');
        setError('');
        stopAllPolling();

        try {
            await getEvolutionInstanceStatusApi(instance._id); // força a criação do QR

            setStatus('AGUARDANDO');

            pollingQrRef.current = setInterval(async () => {
                try {
                    const result = await getQrCodeFromApi(instance.instanceName);
                    if (result && result.qrcode) {
                        stopAllPolling();
                        setQrCode(result.qrcode);
                        setStatus('QR_CODE');
                        startPollingForStatusConnected();
                    }
                } catch (err) {
                    console.error("Erro ao buscar QR Code:", err);
                }
            }, 3000);

            // Timeout para evitar polling infinito
            setTimeout(() => {
                if (status !== 'CONECTADO') {
                    stopAllPolling();
                    if (status === 'AGUARDANDO' || status === 'QR_CODE') {
                        setError('QR Code não recebido ou conexão não confirmada. Tente novamente.');
                        setStatus('ERRO');
                    }
                }
            }, 60000);
        } catch (err) {
            setError(err.message || 'Erro ao iniciar a conexão.');
            setStatus('ERRO');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Conectar WhatsApp à Instância: {instance.instanceName}</h3>
                <div className="modal-body text-center">
                    {status === 'INICIAL' && (
                        <>
                            <p>Clique para gerar um QR Code e conectar seu celular.</p>
                            <button onClick={fetchQRCode} className="button primary-button">Gerar QR Code</button>
                        </>
                    )}
                    {status === 'GERANDO' && <p>Iniciando instância e solicitando QR Code...</p>}
                    {status === 'AGUARDANDO' && <p>Aguardando o QR Code do backend...</p>}
                    {status === 'QR_CODE' && (
                        <>
                            <p>Escaneie com o WhatsApp. Estamos monitorando a conexão...</p>
                            {qrCode && <img src={qrCode} alt="QR Code" className="qr-code-image" />}
                        </>
                    )}
                    {status === 'CONECTADO' && (
                        <div className="qr-success">✅<p>Conectado com sucesso!</p></div>
                    )}
                    {status === 'ERRO' && (
                        <p className="error-message">{error}</p>
                    )}
                </div>
                <div className="modal-actions">
                    <button className="button cancel-button" onClick={onClose}>Fechar</button>
                </div>
            </div>
        </div>
    );
}

export default GenerateQRCodeModal;
