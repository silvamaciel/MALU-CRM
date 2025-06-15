// src/components/PropostaWizard/StepContrato.js
import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Importa o CSS do editor
import './WizardSteps.css';

// Configurações do Editor (pode movê-las para um arquivo de configuração se preferir)
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }], ['bold', 'italic', 'underline'],
    [{ list: "ordered" }, { list: "bullet" }], [{ align: [] }],
    [{ color: [] }, { background: [] }], ['clean']
  ],
};
const quillFormats = ["header", "bold", "italic", "underline", "list", "bullet", "align", "color", "background"];

function StepContrato({ formData, setFormData, isSaving, modelosContrato, montarDadosParaTemplate, reservaBase }) {
    const handleConteudoHTMLChange = (html) => {
        setFormData(prev => ({ ...prev, corpoContratoHTMLGerado: html }));
    };

    const handleModeloChange = (e) => {
        const modeloId = e.target.value;
        const modeloSelecionado = modelosContrato.find((m) => m._id === modeloId);
        const htmlTemplate = modeloSelecionado ? modeloSelecionado.conteudoHTMLTemplate : "<p>Selecione um modelo de contrato para gerar o conteúdo.</p>";

        // A função montarDadosParaTemplate precisa ser passada pelo componente pai
        const dadosParaTemplate = montarDadosParaTemplate(formData, reservaBase);
        const corpoProcessado = preencherTemplateContrato(htmlTemplate, dadosParaTemplate);

        setFormData(prev => ({
            ...prev,
            modeloContratoUtilizado: modeloId,
            corpoContratoHTMLGerado: corpoProcessado,
        }));
    };

    // Função auxiliar para substituir placeholders (deve ser passada como prop ou definida aqui)
    const preencherTemplateContrato = (templateHtml = "", dados = {}) => {
        let corpoProcessado = templateHtml;
        for (const key in dados) {
            const placeholder = `{{${key}}}`;
            corpoProcessado = corpoProcessado.replace(
                new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
                dados[key] || ''
            );
        }
        return corpoProcessado;
    };


    return (
        <div className="wizard-step">
            <h3>Etapa 4: Documento do Contrato</h3>
            <div className="form-section">
                <div className="form-group">
                    <label htmlFor="modeloContratoUtilizado">Usar Modelo de Contrato*</label>
                    <select
                        id="modeloContratoUtilizado"
                        name="modeloContratoUtilizado"
                        value={formData.modeloContratoUtilizado}
                        onChange={handleModeloChange}
                        required
                        disabled={isSaving || modelosContrato.length === 0}
                    >
                        <option value="">
                            {modelosContrato.length === 0 ? 'Nenhum modelo cadastrado' : 'Selecione um modelo...'}
                        </option>
                        {modelosContrato.map(mod => (
                            <option key={mod._id} value={mod._id}>{mod.nomeModelo}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Conteúdo do Contrato (Editável)</label>
                    <p><small>O texto abaixo foi gerado a partir do modelo e dados. Você pode fazer ajustes finos aqui.</small></p>
                    <div className="quill-editor-container">
                        <ReactQuill
                            theme="snow"
                            value={formData.corpoContratoHTMLGerado}
                            onChange={handleConteudoHTMLChange}
                            modules={quillModules}
                            formats={quillFormats}
                            readOnly={isSaving}
                            style={{ minHeight: '400px' }}
                        />
                    </div>
                </div>
            </div>
             {/* Você pode adicionar a lista de placeholders aqui como referência para o usuário */}
        </div>
    );
}

export default StepContrato;