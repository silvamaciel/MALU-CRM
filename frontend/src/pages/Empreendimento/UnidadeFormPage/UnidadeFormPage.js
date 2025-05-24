// src/pages/Empreendimento/UnidadeFormPage/UnidadeFormPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createUnidadeApi, getUnidadeByIdApi, updateUnidadeApi } from '../../../api/unidadeApi';
import './UnidadeFormPage.css'; 

const STATUS_UNIDADE_OPCOES = ["Disponível", "Reservada", "Proposta Aceita", "Vendido", "Bloqueado"];

function UnidadeFormPage() {
    const { empreendimentoId, unidadeId } = useParams(); // Pega ambos os IDs
    const navigate = useNavigate();
    const isEditMode = Boolean(unidadeId);

    const [formData, setFormData] = useState({
        identificador: '',
        tipologia: '',
        areaUtil: '',
        areaTotal: '',
        precoTabela: '',
        statusUnidade: 'Disponível',
        observacoesInternas: '',
        destaque: false,
    });
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (isEditMode && unidadeId && empreendimentoId) {
            setLoading(true);
            console.log(`Modo Edição: Empreendimento ID: ${empreendimentoId}, Unidade ID: ${unidadeId}`)
            .then(data => setFormData(data))
            .catch(err => toast.error("Erro ao carregar unidade"))
            .finally(() => setLoading(false));
            toast.info("Modo de edição de unidade - Lógica de carregar dados pendente.");
            setLoading(false);
        }
    }, [empreendimentoId, unidadeId, isEditMode, navigate]);

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
        toast.info(`Simulando ${isEditMode ? 'atualização' : 'criação'} de unidade... Backend pendente para formulário.`);
        console.log("Dados do formulário da unidade:", formData, "para Empreendimento ID:", empreendimentoId);
        
        try {
             if (isEditMode) {
                 await updateUnidadeApi(empreendimentoId, unidadeId, formData);
             } else {
                 await createUnidadeApi(empreendimentoId, formData);
             }
             toast.success(`Unidade ${isEditMode ? 'atualizada' : 'criada'}!`);
             navigate(`/empreendimentos/${empreendimentoId}`); // Volta para detalhes do empreendimento
         } catch (err) { /* ... */ }
         finally { setLoading(false); }

        setTimeout(() => { // Simula chamada API
            setLoading(false);
            navigate(`/empreendimentos/${empreendimentoId}`); // Volta para pág de detalhes do empreendimento
        }, 1000);
    };

    if (loading && isEditMode) { // Adicionado isEditMode aqui para não mostrar ao criar novo
        return <div className="admin-page loading"><p>Carregando dados da unidade...</p></div>;
    }

    return (
        <div className="admin-page unidade-form-page">
            <header className="page-header">
                <h1>{isEditMode ? 'Editar Unidade' : 'Nova Unidade'} (Empreendimento: {empreendimentoId})</h1>
            </header>
            <div className="page-content">
                <form onSubmit={handleSubmit} className="form-container">
                    {formError && <p className="error-message">{formError}</p>}
                    <p><i>Formulário de unidade em construção...</i></p>
                    {/* Campos do formulário virão aqui */}
                    <div className="form-group">
                        <label htmlFor="identificador">Identificador*</label>
                        <input type="text" name="identificador" value={formData.identificador} onChange={handleChange} required />
                    </div>
                     <div className="form-group">
                        <label htmlFor="tipologia">Tipologia</label>
                        <input type="text" name="tipologia" value={formData.tipologia} onChange={handleChange} />
                    </div>
                    {/* Adicione mais campos: areaUtil, areaTotal, precoTabela, statusUnidade (select), observacoesInternas, destaque (checkbox) */}


                    <div className="form-actions">
                        <button type="submit" className="button submit-button" disabled={loading}>
                            {loading ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Criar Unidade')}
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