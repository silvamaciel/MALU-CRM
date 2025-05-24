// src/pages/Empreendimento/UnidadeFormPage/UnidadeFormPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createUnidadeApi, getUnidadeByIdApi, updateUnidadeApi } from '../../../api/unidadeApi';
import './UnidadeFormPage.css'; 

const STATUS_UNIDADE_OPCOES = ["Disponível", "Reservada", "Proposta Aceita", "Vendido", "Bloqueado"];

function UnidadeFormPage() {
    const { empreendimentoId, unidadeId } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(unidadeId);

    const [formData, setFormData] = useState({
        identificador: '',
        tipologia: '',
        areaUtil: '',
        areaTotal: '',
        precoTabela: '',
        statusUnidade: 'Disponível', // Default para criação
        observacoesInternas: '',
        destaque: false,
    });
    const [loading, setLoading] = useState(false);
    const [pageTitle, setPageTitle] = useState('Nova Unidade');
    const [formError, setFormError] = useState(''); // Para erros de validação do formulário

    const fetchUnidadeData = useCallback(async () => {
        if (isEditMode && unidadeId && empreendimentoId) {
            setLoading(true);
            try {
                const data = await getUnidadeByIdApi(empreendimentoId, unidadeId);
                setFormData({
                    identificador: data.identificador || '',
                    tipologia: data.tipologia || '',
                    areaUtil: data.areaUtil || '',
                    areaTotal: data.areaTotal || '',
                    precoTabela: data.precoTabela || '',
                    statusUnidade: data.statusUnidade || 'Disponível',
                    observacoesInternas: data.observacoesInternas || '',
                    destaque: data.destaque || false,
                });
                setPageTitle(`Editar Unidade: ${data.identificador}`);
            } catch (err) {
                toast.error("Erro ao carregar dados da unidade: " + (err.error || err.message));
                navigate(`/empreendimentos/${empreendimentoId}`); // Volta para detalhes do empreendimento
            } finally {
                setLoading(false);
            }
        } else {
            setPageTitle(`Nova Unidade (Empreendimento: ${empreendimentoId})`);
            // Reseta para valores padrão de criação
            setFormData({
                identificador: '',
                tipologia: '',
                areaUtil: '',
                areaTotal: '',
                precoTabela: '',
                statusUnidade: 'Disponível',
                observacoesInternas: '',
                destaque: false,
            });
        }
    }, [empreendimentoId, unidadeId, isEditMode, navigate]);

    useEffect(() => {
        fetchUnidadeData();
    }, [fetchUnidadeData]); // Dependência correta

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFormError('');

        if (!formData.identificador || !formData.statusUnidade) {
            setFormError("Identificador e Status da Unidade são obrigatórios.");
            setLoading(false);
            toast.error("Preencha os campos obrigatórios.");
            return;
        }
        
        // Prepara os dados para enviar (converte números, remove vazios opcionais se backend não os aceita bem)
        const dataToSubmit = {
            ...formData,
            areaUtil: formData.areaUtil ? parseFloat(formData.areaUtil) : null,
            areaTotal: formData.areaTotal ? parseFloat(formData.areaTotal) : null,
            precoTabela: formData.precoTabela ? parseFloat(formData.precoTabela) : null,
        };
        if (!dataToSubmit.areaTotal) delete dataToSubmit.areaTotal;
        if (!dataToSubmit.observacoesInternas) delete dataToSubmit.observacoesInternas;


        try {
            if (isEditMode) {
                await updateUnidadeApi(empreendimentoId, unidadeId, dataToSubmit);
                toast.success("Unidade atualizada com sucesso!");
            } else {
                await createUnidadeApi(empreendimentoId, dataToSubmit);
                toast.success("Unidade criada com sucesso!");
            }
            navigate(`/empreendimentos/${empreendimentoId}`); // Volta para detalhes do empreendimento
        } catch (err) {
            const errMsg = err.error || err.message || (isEditMode ? "Erro ao atualizar unidade." : "Erro ao criar unidade.");
            setFormError(errMsg);
            toast.error(errMsg);
        } finally {
            setLoading(false);
        }
    };
    
    // Mostra loading principal se estiver em modo de edição e buscando dados iniciais
    if (isEditMode && loading && !formData.identificador) { 
        return <div className="admin-page loading"><p>Carregando dados da unidade...</p></div>;
    }

    return (
        <div className="admin-page unidade-form-page">
            <header className="page-header">
                <h1>{pageTitle}</h1>
            </header>
            <div className="page-content">
                <form onSubmit={handleSubmit} className="form-container">
                    {formError && <p className="error-message" style={{marginBottom: '1rem'}}>{formError}</p>}

                    <div className="form-section">
                        <h3>Detalhes da Unidade</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="identificador">Identificador* (Ex: Apto 101, Lote 15B)</label>
                                <input type="text" id="identificador" name="identificador" value={formData.identificador} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="tipologia">Tipologia (Ex: 2Q com Suíte, Sala 30m²)</label>
                                <input type="text" id="tipologia" name="tipologia" value={formData.tipologia} onChange={handleChange} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="areaUtil">Área Útil (m²)</label>
                                <input type="number" id="areaUtil" name="areaUtil" value={formData.areaUtil} onChange={handleChange} step="0.01" min="0"/>
                            </div>
                            <div className="form-group">
                                <label htmlFor="areaTotal">Área Total (m²) (Opcional)</label>
                                <input type="number" id="areaTotal" name="areaTotal" value={formData.areaTotal} onChange={handleChange} step="0.01" min="0"/>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="precoTabela">Preço de Tabela (R$)</label>
                                <input type="number" id="precoTabela" name="precoTabela" value={formData.precoTabela} onChange={handleChange} step="0.01" min="0"/>
                            </div>
                            <div className="form-group">
                                <label htmlFor="statusUnidade">Status da Unidade*</label>
                                <select id="statusUnidade" name="statusUnidade" value={formData.statusUnidade} onChange={handleChange} required>
                                    {STATUS_UNIDADE_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group full-width">
                                <label htmlFor="observacoesInternas">Observações Internas</label>
                                <textarea id="observacoesInternas" name="observacoesInternas" value={formData.observacoesInternas} onChange={handleChange} rows="3"></textarea>
                            </div>
                        </div>
                         <div className="form-row">
                            <div className="form-group form-group-checkbox">
                                <input type="checkbox" id="destaque" name="destaque" checked={formData.destaque} onChange={handleChange} />
                                <label htmlFor="destaque" className="checkbox-label">Unidade em Destaque?</label>
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="button submit-button" disabled={loading}>
                            {loading ? (isEditMode ? 'Atualizando...' : 'Salvando...') : (isEditMode ? 'Salvar Alterações na Unidade' : 'Criar Unidade')}
                        </button>
                        <button type="button" className="button cancel-button" onClick={() => navigate(`/empreendimentos/${empreendimentoId}`)} disabled={loading}>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default UnidadeFormPage;