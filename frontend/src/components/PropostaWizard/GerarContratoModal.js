// src/components/PropostaWizard/GerarContratoModal.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

import { getModelosContrato } from '../../api/modeloContratoApi';
import { gerarDocumentoApi, updatePropostaContratoApi } from '../../api/propostaContratoApi';
import './GerarContratoModal.css';

// Configuração do editor CKEditor
const editorConfiguration = {
    toolbar: [
        'heading', '|',
        'bold', 'italic', '|',
        'alignment:left', 'alignment:center', 'alignment:right', 'alignment:justify', '|',
        'insertTable', '|', 'tableColumn', 'tableRow', 'mergeTableCells',
        'link', '|', 'bulletedList', 'numberedList', '|', 'fontColor', 'fontBackgroundColor', '|', 'sourceEditing', '|', 'undo', 'redo'
    ],
    language: 'pt-br',
    table: {
        contentToolbar: [
            'tableColumn', 'tableRow', 'mergeTableCells', '|',
            'tableProperties', 'tableCellProperties', '|',
            'alignment:left', 'alignment:center', 'alignment:right', 'alignment:justify'
        ]
    },
};


function GerarContratoModal({ isOpen, onClose, proposta, onSaveSuccess }) {
    const [modelos, setModelos] = useState([]);
    const [selectedModelo, setSelectedModelo] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editorInstance, setEditorInstance] = useState(null);

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
            // Pega o conteúdo mais recente do editor, caso o estado não tenha atualizado a tempo
            const currentData = editorInstance ? editorInstance.getData() : htmlContent;
            await updatePropostaContratoApi(proposta._id, {
                corpoContratoHTMLGerado: currentData,
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
                    <div className="ckeditor-container" style={{ marginTop: '20px' }}>
                        <CKEditor
                            editor={ClassicEditor}
                            config={editorConfiguration}
                            data={htmlContent}
                            onReady={editor => {
                                // Você pode guardar a instância do editor se precisar interagir com ela.
                                setEditorInstance(editor);
                                // console.log('Editor is ready to use!', editor);
                            }}
                            onChange={(event, editor) => {
                                const data = editor.getData();
                                setHtmlContent(data);
                                // console.log({ event, editor, data });
                            }}
                            onBlur={(event, editor) => {
                                // console.log('Blur.', editor);
                            }}
                            onFocus={(event, editor) => {
                                // console.log('Focus.', editor);
                            }}
                            disabled={isSaving}
                        />
                    </div>
                )}
                
            </div>

            <div className="form-actions">
                    <button type="button" className="button cancel-button" onClick={onClose} disabled={isSaving}>Cancelar</button>
                    <button type="button" className="button submit-button" onClick={handleSaveContrato} disabled={isSaving || loading}>
                        {isSaving ? 'Salvando...' : 'Salvar Documento Final'}
                    </button>
                </div>
        </div>
    );
}

export default GerarContratoModal;