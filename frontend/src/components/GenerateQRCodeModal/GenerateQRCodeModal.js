import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
// Garanta que você tenha estas duas funções na sua API
import { getEvolutionInstanceStatusApi, getQrCodeFromApi } from '../../api/integrations'; 
import './QRCodeModal.css'; // Use o nome do seu arquivo CSS

function GenerateQRCodeModal({ isOpen, onClose, instance, onConnected }) {
    const [qrCode, setQrCode] = useState(null);
    const [status, setStatus] = useState('INICIAL'); // INICIAL, GERANDO, AGUARDANDO, QR_CODE, CONECTADO, ERRO
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
            stopPolling();
        }
    }, [isOpen]);

    /**
     * Função principal chamada pelo botão "Gerar QR Code".
     * Ela inicia o processo no backend e depois começa a verificar se o QR Code chegou.
     */
    const fetchQRCode = async () => {
        if (!instance) return;
        setStatus('GERANDO');
        setError('');
        stopPolling();

        try {
            // 1. Pede ao backend para "acordar" a instância e forçar a geração do QR Code.
            // O backend chamará a Evolution API, que enviará o QR Code para o nosso webhook.
            await getEvolutionInstanceStatusApi(instance._id);

            // 2. Agora que o processo foi iniciado, mudamos o status e começamos a verificar.
            setStatus('AGUARDANDO');
            
            // 3. Inicia o "polling": a cada 3 segundos, pergunta ao backend se o QR Code já chegou no cache.
            pollingRef.current = setInterval(async () => {
                console.log("Verificando se o QR Code chegou no cache do backend...");
                try {
                    // Chama a API que lê o QR Code do cache
                    const result = await getQrCodeFromApi(instance.instanceName);
                    
                    if (result && result.qrcode) {
                        // SUCESSO! O QR Code chegou.
                        stopPolling();
                        setQrCode(result.qrcode);
                        setStatus('QR_CODE');
                    }
                    // Se não chegou, ele continuará tentando nas próximas verificações.
                } catch (pollError) {
                    // Não para o polling por um erro de busca, apenas loga
                    console.error("Erro durante o polling:", pollError);
                }
            }, 3000); // Tenta a cada 3 segundos

            // Adiciona um timeout para parar de tentar após um tempo (ex: 45 segundos)
            setTimeout(() => {
                if (pollingRef.current) {
                    stopPolling();
                    // Se ainda estiver aguardando, significa que o QR Code nunca chegou.
                    if (status === 'AGUARDANDO') {
                        setError("O QR Code não foi recebido a tempo. A instância pode estar com problemas ou o webhook não foi entregue. Tente novamente.");
                        setStatus('ERRO');
                    }
                }
            }, 45000);

        } catch (err) {
            setError(err.message || 'Falha ao iniciar a conexão.');
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
                    {status === 'GERANDO' && <p>Iniciando conexão e solicitando QR Code...</p>}
                    {status === 'AGUARDANDO' && <p>Aguardando o QR Code ser recebido do WhatsApp...</p>}
                    {status === 'CONECTADO' && <div className="qr-success">✅<p>Conectado com sucesso!</p></div>}
                    {status === 'ERRO' && <p className="error-message">{error}</p>}
                    {status === 'QR_CODE' && (
                        <>
                            <p>Escaneie o QR Code abaixo com seu celular. Ele é válido por cerca de 30 segundos.</p>
                            {qrCode && <img src={qrCode} alt="QR Code para conectar WhatsApp" className="qr-code-image" />}
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