// src/pages/Admin/ModeloContrato/ModeloContratoFormPage/ModeloContratoFormPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createModeloContrato, getModeloContratoById, updateModeloContrato } from '../../../../api/modeloContratoApi';
import './ModeloContratoFormPage.css';

const TIPO_DOCUMENTO_OPCOES = ["Proposta", "Contrato de Reserva", "Contrato de Compra e Venda", "Outro"];

function ModeloContratoFormPage() {
    const { id } = useParams(); // Para pegar o ID da URL (no caso de edição)
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState({
        nomeModelo: '',
        tipoDocumento: TIPO_DOCUMENTO_OPCOES[0],
        conteudoHTMLTemplate: '',
        placeholdersDisponiveis: [] // [{ placeholder: '', descricao: '' }]
    });
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (isEditMode && id) {
            setLoading(true);
            getModeloContratoById(id)
                .then(data => {
                    setFormData({
                        nomeModelo: data.nomeModelo || '',
                        tipoDocumento: data.tipoDocumento || TIPO_DOCUMENTO_OPCOES[0],
                        conteudoHTMLTemplate: data.conteudoHTMLTemplate || '',
                        placeholdersDisponiveis: data.placeholdersDisponiveis || []
                    });
                })
                .catch(err => {
                    toast.error("Erro ao carregar modelo: " + (err.error || err.message));
                    navigate('/admin/modelos-contrato');
                })
                .finally(() => setLoading(false));
        }
    }, [id, isEditMode, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Para placeholders (se for uma lista editável mais complexa, precisará de mais lógica)
    // Por agora, vamos assumir que placeholders é um campo de texto simples ou não editável aqui.
    // Se for um array de objetos, você precisará de handlers para adicionar/remover/editar placeholders.

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFormError('');

        if (!formData.nomeModelo || !formData.tipoDocumento || !formData.conteudoHTMLTemplate) {
            setFormError("Nome, Tipo e Conteúdo HTML são obrigatórios.");
            setLoading(false);
            toast.error("Preencha os campos obrigatórios.");
            return;
        }

        const dataToSubmit = {
            nomeModelo: formData.nomeModelo,
            tipoDocumento: formData.tipoDocumento,
            conteudoHTMLTemplate: formData.conteudoHTMLTemplate,
            // placeholdersDisponiveis: formData.placeholdersDisponiveis, // Enviar se for editável
        };

        try {
            if (isEditMode) {
                await updateModeloContrato(id, dataToSubmit);
                toast.success("Modelo de contrato atualizado!");
            } else {
                await createModeloContrato(dataToSubmit);
                toast.success("Modelo de contrato criado!");
            }
            navigate('/admin/modelos-contrato');
        } catch (err) {
            const errMsg = err.error || err.message || "Erro ao salvar modelo.";
            setFormError(errMsg);
            toast.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditMode && !formData.nomeModelo) {
         return <div className="admin-page loading"><p>Carregando modelo...</p></div>;
    }

    return (
        <div className="admin-page modelo-contrato-form-page">
            <header className="page-header">
                <h1>{isEditMode ? 'Editar Modelo de Contrato' : 'Novo Modelo de Contrato'}</h1>
            </header>
            <div className="page-content">
                <form onSubmit={handleSubmit} className="form-container">
                    {formError && <p className="error-message" style={{marginBottom: '1rem'}}>{formError}</p>}

                    <div className="form-group">
                        <label htmlFor="nomeModelo">Nome do Modelo*</label>
                        <input type="text" id="nomeModelo" name="nomeModelo" value={formData.nomeModelo} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label htmlFor="tipoDocumento">Tipo de Documento*</label>
                        <select id="tipoDocumento" name="tipoDocumento" value={formData.tipoDocumento} onChange={handleChange} required>
                            {TIPO_DOCUMENTO_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="conteudoHTMLTemplate">Conteúdo HTML do Modelo*</label>
                        <p><small>Use placeholders como {"{{lead_nome}}"}, {"{{unidade_identificador}}"}, {"{{vendedor_cnpj}}"}, etc.</small></p>
                        <textarea 
                            id="conteudoHTMLTemplate" 
                            name="conteudoHTMLTemplate" 
                            value={formData.conteudoHTMLTemplate} 
                            onChange={handleChange} 
                            rows="20" 
                            required 
                            style={{fontFamily: 'monospace', fontSize: '0.9em'}}
                        />
                    </div>

                    {/* TODO: Adicionar interface para gerenciar 'placeholdersDisponiveis' se necessário */}

                    <div className="form-actions">
                        <button type="submit" className="button submit-button" disabled={loading}>
                            {loading ? (isEditMode ? 'Atualizando...' : 'Salvando...') : 'Salvar Modelo'}
                        </button>
                        <button type="button" className="button cancel-button" onClick={() => navigate('/admin/modelos-contrato')} disabled={loading}>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ModeloContratoFormPage;