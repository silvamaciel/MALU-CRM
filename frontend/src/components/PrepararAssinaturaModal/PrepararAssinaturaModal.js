import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Document, Page, pdfjs } from 'react-pdf';
import { enviarParaAssinaturaApi } from '../../api/propostaContratoApi';

import './PrepararAssinaturaModal.css';

// >>> FIX do worker: usar HTTPS e .mjs no pdfjs-dist@5.x
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function PrepararAssinaturaModal({ isOpen, onClose, contrato, arquivoContrato, onSendSuccess }) {
  const [signers, setSigners] = useState([]);
  const [selectedSignerId, setSelectedSignerId] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (contrato?.adquirentesSnapshot) {
      const initialSigners = contrato.adquirentesSnapshot.map((aq, index) => ({
        id: `temp_${index}`,
        name: aq.nome,
        email: aq.email,
        pos_x: null, pos_y: null, page: null,
      }));
      setSigners(initialSigners);
      if (initialSigners.length > 0) {
        setSelectedSignerId(initialSigners[0].id);
      }
    }
  }, [contrato, isOpen]);

  const handleDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handlePageClick = (event, pageNumber) => {
    if (!selectedSignerId) {
      toast.warn("Por favor, selecione um signatário na lista primeiro.");
      return;
    }

    const pageElement = event.currentTarget;
    const rect = pageElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const posX = (x / rect.width) * 100;
    const posY = (y / rect.height) * 100;

    setSigners(prevSigners => prevSigners.map(signer =>
      signer.id === selectedSignerId
        ? { ...signer, pos_x: posX.toFixed(2), pos_y: posY.toFixed(2), page: pageNumber }
        : signer
    ));
  };

  const handleSend = async () => {
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

  if (!arquivoContrato || !arquivoContrato.url) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Erro: Ficheiro Não Encontrado</h2>
          <p>O ficheiro PDF deste contrato não foi encontrado no Drive. Por favor, gere o documento novamente na página de detalhes do contrato antes de o enviar para assinatura.</p>
          <div className="modal-actions">
            <button onClick={onClose} className="button cancel-button">Fechar</button>
          </div>
        </div>
      </div>
    );
  }

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
              <div
                key={`page_${index + 1}`}
                className="pdf-page-wrapper"
                onClick={(e) => handlePageClick(e, index + 1)}
              >
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
