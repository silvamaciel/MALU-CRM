// src/components/PropostaWizard/GerarContratoModal.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

import ReactQuill, { Quill } from 'react-quill'; // Importar Quill para registrar módulos
import 'react-quill/dist/quill.snow.css'; // Estilo padrão Snow

// KaTeX para fórmulas
import 'katex/dist/katex.min.css';
import katex from 'katex';

// Módulos de imagem
import ImageUploader from 'quill-image-uploader';
import 'quill-image-uploader/dist/quill.imageUploader.min.css'; // CSS para o uploader
import { ImageResize } from 'quill-image-resize-module-react';

import { getModelosContrato } from '../../api/modeloContratoApi';
import { gerarDocumentoApi, updatePropostaContratoApi } from '../../api/propostaContratoApi';
import './GerarContratoModal.css';

// Registrar módulos do Quill
Quill.register('modules/imageUploader', ImageUploader);
Quill.register('modules/imageResize', ImageResize);
window.katex = katex; // Expor KaTeX globalmente para o módulo de fórmula do Quill

const toolbarOptions = [
    [{ 'font': [] }],
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'size': ['small', false, 'large', 'huge'] }], // Normal é 'false'
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    ['blockquote', 'code-block'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'direction': 'rtl' }],
    [{ 'align': [] }],
    ['link', 'image', 'video', 'formula'],
    ['clean']
];

const quillModules = {
    toolbar: toolbarOptions,
    history: {
        delay: 2000,
        maxStack: 500,
        userOnly: true
    },
    imageUploader: {
        upload: file => {
            return new Promise((resolve, reject) => {
                // Simulação de upload de imagem
                // TODO: Substituir pela lógica real de upload para o backend
                setTimeout(() => {
                    // Para teste, vamos simular que o upload deu certo e retornar uma URL de placeholder
                    // Em um cenário real, você faria uma requisição POST para seu servidor aqui
                    // e o servidor retornaria a URL da imagem salva.
                    // Ex: https://your-server.com/uploads/image_name.png
                    console.log("Simulando upload do arquivo:", file.name);
                    toast.info(`Simulando upload de ${file.name}...`);
                    // Simulando uma URL de imagem pública para teste
                    // Poderia ser uma imagem de placeholder ou uma imagem de um serviço como Unsplash
                    // Importante: O servidor de destino precisa ter CORS configurado para aceitar uploads do seu domínio.
                    const placeholderImageUrl = `https://via.placeholder.com/350x150.png?text=Uploaded+${encodeURIComponent(file.name)}`;
                    resolve(placeholderImageUrl);
                    toast.success(`${file.name} "enviada" com sucesso (simulação).`);
                }, 3500);
            });
        }
    },
    imageResize: {
        parchment: Quill.import('parchment'),
        modules: ['Resize', 'DisplaySize', 'Toolbar'] // Módulos padrão do imageResize
    },
    // O módulo de fórmula é ativado pela presença de 'formula' na toolbar e KaTeX global.
    // O módulo de syntax highlighting para code-block é geralmente incluído por padrão no Quill ou via
    // import 'highlight.js/styles/default.css'; e Quill.register('modules/syntax', Syntax); se usar highlight.js
    // Por enquanto, vamos confiar no suporte básico do Quill para code-block.
};


function GerarContratoModal({ isOpen, onClose, proposta, onSaveSuccess }) {
    const [modelos, setModelos] = useState([]);
    const [selectedModelo, setSelectedModelo] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    // const [editorInstance, setEditorInstance] = useState(null); // Será usado pelo ReactQuill ou similar

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
            // O conteúdo será pego diretamente de htmlContent, que será atualizado pelo ReactQuill
            await updatePropostaContratoApi(proposta._id, {
                corpoContratoHTMLGerado: htmlContent, // Usar htmlContent diretamente
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
                    <div className="quill-editor-container" style={{ marginTop: '20px', height: 'calc(100% - 180px)' /* Ajuste de altura */ }}>
                        <ReactQuill
                            theme="snow"
                            value={htmlContent}
                            onChange={setHtmlContent} // Atualiza o estado htmlContent diretamente
                            modules={quillModules}
                            // Formats podem ser definidos aqui se necessário, mas geralmente os módulos cuidam disso.
                            // formats={quillFormats} // Descomentar se for definir uma lista explícita de formatos
                            style={{ height: '100%' }} // Faz o editor preencher o container
                            readOnly={isSaving}
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