import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { getEvolutionInstanceStatusApi } from '../../api/integrations';
import './QRCodeModal.css';

function GenerateQRCodeModal({ isOpen, onClose, instance, onConnected }) {
    const [qrCode, setQrCode] = useState(null);
    const [status, setStatus] = useState('INICIAL'); // INICIAL, CARREGANDO, QR_CODE, CONECTADO, ERRO
    const [error, setError] = useState('');
    const pollingRef = useRef(null);

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            setStatus('INICIAL');
            setQrCode(null);
            setError('');
            stopPolling(); // Limpa intervalos antigos
        }
    }, [isOpen]);

    const checkConnectionStatus = async () => {
        if (!instance) return;
        try {
            const state = await getEvolutionInstanceStatusApi(instance._id);
            if (state.status === 'open') {
                setStatus('CONECTADO');
                stopPolling();
                toast.success(`Instância '${instance.instanceName}' conectada com sucesso!`);
                setTimeout(() => {
                    if (onConnected) onConnected();
                }, 1500);
            }
        } catch (err) {
            console.error("Erro no polling de status:", err.message);
        }
    };

    const fetchQRCode = async () => {
        if (!instance || !instance._id) {
            toast.warn('Instância inválida. Não é possível gerar QR Code.');
            return;
        }

        setStatus('CARREGANDO');
        setError('');
        stopPolling(); // Evita múltiplos polls simultâneos

        try {
            const state = await getEvolutionInstanceStatusApi(instance._id);
            if (state.status === 'open') {
                setStatus('CONECTADO');
                toast.success(`Instância '${instance.instanceName}' já está conectada.`);
            } else if (state.status === 'connecting' || (state.status === 'close' && state.qrcode)) {
                setStatus('QR_CODE');
                setQrCode(state.qrcode);
                pollingRef.current = setInterval(checkConnectionStatus, 7000);
            } else {
                throw new Error("Instância em estado inesperado. Tente novamente.");
            }
        } catch (err) {
            const errorMsg = err.message || 'Falha ao buscar QR Code.';
            setError(errorMsg);
            setStatus('ERRO');
            toast.error(errorMsg);
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
                            <p>Clique no botão abaixo para gerar um QR Code e conectar seu celular.</p>
                            <button onClick={fetchQRCode} className="button primary-button">Gerar QR Code</button>
                        </>
                    )}
                    {status === 'CARREGANDO' && <p>Gerando QR Code...</p>}
                    {status === 'CONECTADO' && (
                        <div className="qr-success">
                            ✅<p>Conectado com sucesso!</p>
                        </div>
                    )}
                    {status === 'ERRO' && (
                        <>
                            <p className="error-message">{error}</p>
                            <button onClick={fetchQRCode} className="button outline-button">Tentar Novamente</button>
                        </>
                    )}
                    {status === 'QR_CODE' && (
                        <>
                            <p>Escaneie o QR Code abaixo com seu celular. O código será atualizado automaticamente.</p>
                            {qrCode && <img src={qrCode} alt="QR Code para conectar WhatsApp" className="qr-code-image" />}
                            <p style={{ fontSize: '0.8em', color: '#6c757d', marginTop: '15px' }}>Verificando conexão automaticamente...</p>
                            <button onClick={fetchQRCode} className="button outline-button" style={{ marginTop: '15px' }}>
                                Gerar Novo QR Code
                            </button>
                        </>
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
