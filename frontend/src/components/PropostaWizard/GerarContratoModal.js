// src/components/PropostaWizard/GerarContratoModal.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { CKEditor } from '@ckeditor/ckeditor5-react';
// Importar o editor do build customizado simulado do novo local
import ClassicEditor from './../../libs/ckeditor5-custom-build/ckeditor';
// Importar o CSS customizado do editor
import './../../libs/ckeditor5-custom-build/ckeditor.css';

import { getModelosContrato } from '../../api/modeloContratoApi';
import { gerarDocumentoApi, updatePropostaContratoApi } from '../../api/propostaContratoApi';
import './GerarContratoModal.css';

// Configuração do editor CKEditor atualizada
const editorConfiguration = {
    toolbar: [
        'heading', '|',
        'bold', 'italic', '|',
        'alignment:left', 'alignment:center', 'alignment:right', 'alignment:justify', '|',
        'insertTable', 'tableColumn', 'tableRow', 'mergeTableCells', '|',
        'tableProperties', 'tableCellProperties', '|',
        'sourceEditing', '|',
        'link', 'bulletedList', 'numberedList', 'fontColor', 'fontBackgroundColor', '|',
        'undo', 'redo'
    ],
    language: 'pt-br',
    table: {
        contentToolbar: [ // Mantendo a toolbar de tabela rica em funcionalidades
            'tableColumn', 'tableRow', 'mergeTableCells', '|',
            'tableProperties', 'tableCellProperties', '|',
            'alignment:left', 'alignment:center', 'alignment:right', 'alignment:justify'
        ]
    },
    // Os plugins (Alignment, TableProperties, TableCellProperties, SourceEditing, etc.)
    // são esperados estarem inclusos e ativos no 'ClassicEditor' importado do build customizado.
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
                                setEditorInstance(editor);
                                // Lógica para fechar dropdowns
                                if (editor && editor.ui && editor.ui.focusTracker) {
                                    editor.ui.focusTracker.on('change:isFocused', (evt, name, isFocused) => {
                                        if (!isFocused) {
                                            const openPanels = editor.ui.view.element.ownerDocument.querySelectorAll(
                                                // Seletor mais genérico para painéis de dropdown que usam ck-expanded
                                                '.ck.ck-dropdown.ck-expanded, .ck.ck-dropdown__panel.ck-dropdown__panel_visible'
                                            );
                                            openPanels.forEach(panel => {
                                                // Para dropdowns normais que usam ck-expanded
                                                if (panel.classList.contains('ck-expanded')) {
                                                    panel.classList.remove('ck-expanded');
                                                }
                                                // Para painéis flutuantes (balloons) que usam ck-dropdown__panel_visible ou similar
                                                // A remoção direta da classe _visible pode não ser o ideal se o CKEditor
                                                // tiver lógica interna para controlar isso. A melhor forma seria
                                                // disparar um evento ou chamar um método do componente de UI do CKEditor.
                                                // A sugestão original era `panel.classList.remove('ck-expanded')`.
                                                // Para balões, pode ser necessário identificar o componente do dropdown e chamar .isOpen = false ou similar.
                                                // Por agora, focamos no 'ck-expanded' que é mais comum para dropdowns de toolbar.
                                            });
                                        }
                                    });
                                }
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