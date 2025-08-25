import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { Document, Page, pdfjs } from 'react-pdf';
import { enviarParaAssinaturaApi } from '../../api/propostaContratoApi';

import './PrepararAssinaturaModal.css';

// worker correto (pdfjs 5.x): HTTPS + .mjs
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function PrepararAssinaturaModal({ isOpen, onClose, contrato, arquivoContrato, onSendSuccess }) {
  const [signers, setSigners] = useState([]);
  const [selectedSignerId, setSelectedSignerId] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [isSending, setIsSending] = useState(false);

  // NOVO: mede a largura do container para aplicar a mesma em todas as páginas
  const [pageWidth, setPageWidth] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width); // arredonda para evitar reflows
      setPageWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  useEffect(() => {
    if (contrato?.adquirentesSnapshot) {
      const initialSigners = contrato.adquirentesSnapshot.map((aq, index) => ({
        id: `temp_${index}`,
        name: aq.nome,
        email: aq.email,
        pos_x: null, pos_y: null, page: null,
      }));
      setSigners(initialSigners);
      if (initialSigners.length > 0) setSelectedSignerId(initialSigners[0].id);
    }
  }, [contrato, isOpen]);

  const handleDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);

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

    setSigners(prev => prev.map(s =>
      s.id === selectedSignerId
        ? { ...s, pos_x: posX.toFixed(2), pos_y: posY.toFixed(2), page: pageNumber }
        : s
    ));
  };

  const handleSend = async () => {
    const unpositioned = signers.find(s => s.pos_x === null);
    if (unpositioned) {
      toast.error(`Por favor, defina uma posição de assinatura para ${unpositioned.name}.`);
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
          <p>Gere o documento novamente na página de detalhes antes de enviar para assinatura.</p>
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

        {/* Container que define a largura para TODAS as páginas */}
        <div className="pdf-preview-container" ref={containerRef}>
          <Document
            file={arquivoContrato.url}
            onLoadSuccess={handleDocumentLoadSuccess}
            onLoadError={(e) => { console.error(e); toast.error('Falha ao carregar PDF.'); }}
          >
            {Array.from(new Array(numPages || 0), (el, index) => (
              <div
                key={`page_${index + 1}`}
                className="pdf-page-wrapper"
                onClick={(e) => handlePageClick(e, index + 1)}
              >
                <Page
                  pageNumber={index + 1}
                  width={pageWidth || undefined}   // mesma largura em todas as páginas
                  renderTextLayer={false}          // sem camadas adicionais
                  renderAnnotationLayer={false}
                  renderMode="canvas"
                />
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
