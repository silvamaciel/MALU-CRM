import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Document, Page, pdfjs } from 'react-pdf';
import { enviarParaAssinaturaApi } from '../../api/propostaContratoApi';
import './PrepararAssinaturaModal.css';

// Configuração do worker do PDF.js (necessário para a biblioteca funcionar)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

function PrepararAssinaturaModal({ isOpen, onClose, contrato, arquivoContrato, onSendSuccess }) {
    const [signers, setSigners] = useState([]);
    const [selectedSignerId, setSelectedSignerId] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [isSending, setIsSending] = useState(false);

    // Inicializa os signatários a partir dos adquirentes do contrato
    useEffect(() => {
        if (contrato?.adquirentesSnapshot) {
            const initialSigners = contrato.adquirentesSnapshot.map((aq, index) => ({
                id: `temp_${index}`, // ID temporário
                name: aq.nome,
                email: aq.email,
                pos_x: null,
                pos_y: null,
                page: null,
            }));
            setSigners(initialSigners);
            if (initialSigners.length > 0) {
                setSelectedSignerId(initialSigners[0].id); // Seleciona o primeiro por defeito
            }
        }
    }, [contrato, isOpen]);

    const handleDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    // A função mágica para posicionar a assinatura
    const handlePageClick = (event, pageNumber) => {
        if (!selectedSignerId) {
            toast.warn("Por favor, selecione um signatário na lista primeiro.");
            return;
        }

        const pageElement = event.currentTarget;
        const rect = pageElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Converte as coordenadas de pixels para percentagem (0 a 100)
        const posX = (x / rect.width) * 100;
        const posY = (y / rect.height) * 100;

        setSigners(prevSigners => prevSigners.map(signer => 
            signer.id === selectedSignerId 
                ? { ...signer, pos_x: posX.toFixed(2), pos_y: posY.toFixed(2), page: pageNumber }
                : signer
        ));

        toast.info(`Posição da assinatura de ${signers.find(s=>s.id === selectedSignerId).name} definida na página ${pageNumber}!`);
    };

    const handleSend = async () => {
        // Validação: verifica se todos os signatários têm uma posição definida
        const unpositionedSigner = signers.find(s => s.pos_x === null);
        if (unpositionedSigner) {
            toast.error(`Por favor, defina uma posição de assinatura para ${unpositionedSigner.name}.`);
            return;
        }

        setIsSending(true);
        try {
            await enviarParaAssinaturaApi(contrato._id, signers);
            toast.success("Contrato enviado para assinatura com sucesso!");
            onSendSuccess();
        } catch (error) {
            toast.error(error.message || "Falha ao enviar contrato.");
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay signature-modal-overlay">
            <div className="modal-content signature-modal-content">
                <div className="signature-sidebar">
                    <h4>Signatários</h4>
                    <ul className="signers-list">
                        {signers.map(signer => (
                            <li 
                                key={signer.id} 
                                className={signer.id === selectedSignerId ? 'active' : ''}
                                onClick={() => setSelectedSignerId(signer.id)}
                            >
                                <span className="signer-name">{signer.name}</span>
                                <span className={`signer-position-status ${signer.pos_x ? 'positioned' : ''}`}>
                                    {signer.pos_x ? `Página ${signer.page}` : 'Posicionar'}
                                </span>
                            </li>
                        ))}
                    </ul>
                    {/* Botão para adicionar mais signatários (testemunhas, etc.) pode ser adicionado aqui */}
                    <div className="modal-actions">
                        <button onClick={onClose} className="button cancel-button" disabled={isSending}>Cancelar</button>
                        <button onClick={handleSend} className="button submit-button" disabled={isSending}>
                            {isSending ? 'A enviar...' : 'Enviar para Assinatura'}
                        </button>
                    </div>
                </div>
                <div className="pdf-preview-container">
                    <Document
                        file={arquivoContrato.url}
                        onLoadSuccess={handleDocumentLoadSuccess}
                        onLoadError={console.error}
                    >
                        {Array.from(new Array(numPages), (el, index) => (
                            <div key={`page_${index + 1}`} className="pdf-page-wrapper" onClick={(e) => handlePageClick(e, index + 1)}>
                                <Page pageNumber={index + 1} />
                                {signers.map(signer => (
                                    signer.page === (index + 1) && (
                                        <div 
                                            key={`pos_${signer.id}`}
                                            className="signature-box" 
                                            style={{ top: `${signer.pos_y}%`, left: `${signer.pos_x}%` }}
                                            title={`Assinatura de ${signer.name}`}
                                        >
                                            {signer.name.substring(0, 1)}
                                        </div>
                                    )
                                ))}
                            </div>
                        ))}
                    </Document>
                </div>
            </div>
        </div>
    );
}
export default PrepararAssinaturaModal;