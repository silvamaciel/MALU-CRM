import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { getEvolutionInstanceStatusApi } from '../../api/integrations'; // Garanta que esta API exista
import './GenerateQRCodeModal.css'; // Use o nome do seu arquivo CSS

function GenerateQRCodeModal({ isOpen, onClose, instance, onConnected }) {
    const [qrCode, setQrCode] = useState(null);
    const [status, setStatus] = useState('INICIAL'); // INICIAL, CARREGANDO, QR_CODE, CONECTADO, ERRO
    const [error, setError] = useState('');
    
    // Usamos useRef para guardar o ID do intervalo e poder limpá-lo corretamente
    const pollingRef = useRef(null);

    // Função para parar o polling
    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    // Efeito para limpar o polling quando o modal for fechado
    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, []);
    
    // Reseta o estado quando o modal é aberto
    useEffect(() => {
        if (isOpen) {
            setStatus('INICIAL');
            setQrCode(null);
            setError('');
            stopPolling(); // Garante que polls anteriores sejam limpos
        }
    }, [isOpen]);

    const checkConnectionStatus = async () => {
        if (!instance) return;
        try {
            const state = await getEvolutionInstanceStatusApi(instance._id);
            console.log("Status da instância verificado:", state.status);
            if (state.status === 'open') {
                setStatus('CONECTADO');
                stopPolling(); // Para de verificar
                toast.success(`Instância '${instance.instanceName}' conectada com sucesso!`);
                setTimeout(() => {
                    if (onConnected) onConnected(); // Notifica o pai sobre o sucesso
                }, 1500); // Espera 1.5s para o usuário ver a mensagem de sucesso
            }
        } catch (err) {
            // Não mostra erro no polling, apenas continua tentando
            console.error("Erro no polling de status:", err.message);
        }
    };


    const fetchQRCode = async () => {
        if (!instance) return;
        setStatus('CARREGANDO');
        setError('');
        stopPolling(); // Para qualquer polling antigo antes de iniciar um novo

        try {
            const state = await getEvolutionInstanceStatusApi(instance._id);
            if (state.status === 'open') {
                setStatus('CONECTADO');
            } else if (state.status === 'connecting' || (state.status === 'close' && state.qrcode)) {
                setStatus('QR_CODE');
                setQrCode(state.qrcode);
                // Inicia o polling para verificar a conexão a cada 7 segundos
                pollingRef.current = setInterval(checkConnectionStatus, 7000); 
            } else {
                throw new Error("Não foi possível gerar o QR Code. A instância pode estar em um estado inesperado.");
            }
        } catch (err) {
            setError(err.message || 'Falha ao buscar QR Code.');
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
                            <p>Clique no botão abaixo para gerar um QR Code e conectar seu celular.</p>
                            <button onClick={fetchQRCode} className="button primary-button">Gerar QR Code</button>
                        </>
                    )}
                    {status === 'CARREGANDO' && <p>Gerando QR Code...</p>}
                    {status === 'CONECTADO' && <div className="qr-success">✅<p>Conectado com sucesso!</p></div>}
                    {status === 'ERRO' && <p className="error-message">{error}</p>}
                    {status === 'QR_CODE' && (
                        <>
                            <p>Escaneie o QR Code abaixo com seu celular. O código será atualizado automaticamente.</p>
                            {qrCode && <img src={qrCode} alt="QR Code para conectar WhatsApp" className="qr-code-image" />}
                            <p style={{fontSize: '0.8em', color: '#6c757d', marginTop: '15px'}}>Verificando conexão...</p>
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