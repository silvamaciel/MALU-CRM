import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ReactQuill, { Quill } from 'react-quill';
import Table from 'quill-table-ui';
import 'react-quill/dist/quill.snow.css';
import 'quill-table-ui/dist/index.css';
import './quill-fonts.css'; // Importa as fontes customizadas
import { CustomToolbar } from './CustomToolbar';

import { getModelosContrato } from '../../api/modeloContratoApi';
import { gerarDocumentoApi, updatePropostaContratoApi } from '../../api/propostaContratoApi';
import './GerarContratoModal.css';

import { Font } from 'quill/formats/font';

const Font = Quill.import('formats/font');
Font.whitelist = ['sans-serif', 'serif', 'monospace', 'arial', 'times-new-roman', 'comic-sans'];
Quill.register(Font, true);

Quill.register({ 'modules/tableUI': Table }, true);

const modules = {
  toolbar: {
    container: '#toolbar',
    handlers: {
      placeholder: function () {
        const cursor = this.quill.getSelection();
        if (cursor) {
          this.quill.insertText(cursor.index, '{{placeholder}}');
        }
      }
    }
  },
  tableUI: true
};

const formats = [
  'header', 'font', 'size',
  'bold', 'italic', 'underline', 'strike', 'clean',
  'list', 'bullet', 'indent',
  'align', 'blockquote', 'code-block',
  'color', 'background',
  'link', 'video',
  'table'
];

function GerarContratoModal({ isOpen, onClose, proposta, onSaveSuccess }) {
  const [modelos, setModelos] = useState([]);
  const [selectedModelo, setSelectedModelo] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');

  useEffect(() => {
    if (isOpen) {
      setHtmlContent(proposta.corpoContratoHTMLGerado || '');
      setSelectedModelo(proposta.modeloContratoUtilizado || '');

      const fetchModelos = async () => {
        try {
          const data = await getModelosContrato();
          setModelos(data.modelos || []);
        } catch (error) {
          toast.error("Falha ao carregar modelos de contrato.");
        }
      };
      fetchModelos();
    }
  }, [isOpen, proposta]);

  const handleModeloChange = async (e) => {
    const modeloId = e.target.value;
    setSelectedModelo(modeloId);
    if (!modeloId) {
      setHtmlContent('<p>Selecione um modelo para gerar o documento.</p>');
      return;
    }

    setLoading(true);
    toast.info("Gerando pré-visualização do contrato...");
    try {
      const generatedHtml = await gerarDocumentoApi(proposta._id, modeloId);
      setHtmlContent(generatedHtml);
      toast.success("Contrato gerado com sucesso!");
    } catch (error) {
      toast.error(error.message || "Falha ao gerar o contrato.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContrato = async () => {
    setIsSaving(true);
    try {
      await updatePropostaContratoApi(proposta._id, {
        corpoContratoHTMLGerado: htmlContent,
        modeloContratoUtilizado: selectedModelo
      });
      toast.success("Documento do contrato salvo com sucesso!");
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (error) {
      toast.error(error.message || "Falha ao salvar o documento.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="form-modal-overlay" onClick={onClose}>
      <div className="form-modal-content large" onClick={e => e.stopPropagation()}>
        <h2>Gerar/Editar Documento do Contrato</h2>

        <div className="form-group">
          <label htmlFor="modeloContratoSelect">Usar Modelo de Contrato</label>
          <select
            id="modeloContratoSelect"
            value={selectedModelo}
            onChange={handleModeloChange}
            disabled={loading || isSaving}
          >
            <option value="">Selecione para gerar ou alterar o modelo...</option>
            {modelos.map(mod => (
              <option key={mod._id} value={mod._id}>{mod.nomeModelo}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading-message">Gerando documento...</div>
        ) : (
          <>
            <div className="tabs-container" style={{ marginBottom: 15, borderBottom: '1px solid #ccc' }}>
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`tab-button ${activeTab === 'editor' ? 'active' : ''}`}
                disabled={isSaving}
              >
                Editor Visual
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('html')}
                className={`tab-button ${activeTab === 'html' ? 'active' : ''}`}
                disabled={isSaving}
              >
                Código Fonte HTML
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`}
                disabled={isSaving}
              >
                Pré-visualização
              </button>
            </div>

            {activeTab === 'editor' && (
              <>
                <CustomToolbar />
                <ReactQuill
                  value={htmlContent}
                  onChange={setHtmlContent}
                  modules={modules}
                  formats={formats}
                  readOnly={isSaving}
                  theme="snow"
                  placeholder="Digite o contrato aqui..."
                />
              </>
            )}

            {activeTab === 'html' && (
              <textarea
                style={{
                  width: '100%',
                  minHeight: '300px',
                  fontFamily: 'Courier New, Courier, monospace',
                  fontSize: '0.9em',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ccc',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
                value={htmlContent}
                onChange={e => setHtmlContent(e.target.value)}
                disabled={isSaving}
              />
            )}

            {activeTab === 'preview' && (
              <div
                className="ql-editor"
                style={{
                  border: '1px solid #ccc',
                  padding: '15px',
                  minHeight: '300px',
                  backgroundColor: '#f9f9f9',
                  overflow: 'auto',
                  lineHeight: 1.6
                }}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            )}
          </>
        )}

        <div className="form-actions">
          <button type="button" className="button cancel-button" onClick={onClose} disabled={isSaving}>
            Cancelar
          </button>
          <button type="button" className="button submit-button" onClick={handleSaveContrato} disabled={isSaving || loading}>
            {isSaving ? 'Salvando...' : 'Salvar Documento Final'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GerarContratoModal;
