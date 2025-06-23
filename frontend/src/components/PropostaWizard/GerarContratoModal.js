// src/components/PropostaWizard/GerarContratoModal.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { getModelosContrato } from '../../api/modeloContratoApi';
import { gerarDocumentoApi, updatePropostaContratoApi } from '../../api/propostaContratoApi';
import './GerarContratoModal.css';

const quillModules = {
    toolbar: [
        [{ header: [1, 2, 3, false] }], ['bold', 'italic', 'underline'],
        [{ list: "ordered" }, { list: "bullet" }], [{ align: [] }],
        [{ color: [] }, { background: [] }], ['clean']
    ],
};

const quillFormats = ["header", "bold", "italic", "underline", "list", "bullet", "align", "color", "background"];

function GerarContratoModal({ isOpen, onClose, proposta, onSaveSuccess }) {
    const [modelos, setModelos] = useState([]);
    const [selectedModelo, setSelectedModelo] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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
            if(onSaveSuccess) onSaveSuccess();
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
            <div className="form-modal-content large" onClick={(e) => e.stopPropagation()}>
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
                    <div className="quill-editor-container" style={{ marginTop: '20px' }}>
                        <ReactQuill
                            theme="snow"
                            value={htmlContent}
                            onChange={setHtmlContent}
                            modules={quillModules}
                            formats={quillFormats}
                            readOnly={isSaving}
                        />
                    </div>
                )}
                
                <div className="form-actions">
                    <button type="button" className="button cancel-button" onClick={onClose} disabled={isSaving}>Cancelar</button>
                    <button type="button" className="button submit-button" onClick={handleSaveContrato} disabled={isSaving || loading}>
                        {isSaving ? 'Salvando...' : 'Salvar Documento Final'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default GerarContratoModal;