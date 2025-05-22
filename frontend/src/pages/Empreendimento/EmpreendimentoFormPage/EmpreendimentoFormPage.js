// src/pages/Empreendimento/EmpreendimentoFormPage/EmpreendimentoFormPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createEmpreendimento, getEmpreendimentoById, updateEmpreendimento } from '../../../api/empreendimentoApi'; // Ajuste o caminho
import './EmpreendimentoFormPage.css';

const TIPO_EMPREENDIMENTO_OPCOES = ["Residencial Vertical", "Residencial Horizontal", "Loteamento", "Comercial"];
const STATUS_EMPREENDIMENTO_OPCOES = ["Em Planejamento", "Breve Lançamento", "Lançamento", "Em Obras", "Pronto para Morar", "Concluído"];

function EmpreendimentoFormPage() {
    const { id } = useParams(); // Para pegar o ID da URL (no caso de edição)
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState({
        nome: '',
        construtoraIncorporadora: '',
        localizacao: {
            logradouro: '',
            numero: '',
            bairro: '',
            cidade: '',
            uf: '',
            cep: '',
            latitude: '',
            longitude: ''
        },
        tipo: '',
        statusEmpreendimento: '',
        descricao: '',
        imagemPrincipal: {
            url: '',
            altText: ''
        },
        dataPrevistaEntrega: ''
    });
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');

    // Carregar dados do empreendimento se estiver em modo de edição
    useEffect(() => {
        if (isEditMode && id) {
            setLoading(true);
            getEmpreendimentoById(id)
                .then(data => {
                    // Formata a data para o input type="date" (YYYY-MM-DD)
                    if (data.dataPrevistaEntrega) {
                        data.dataPrevistaEntrega = new Date(data.dataPrevistaEntrega).toISOString().split('T')[0];
                    }
                    // Garante que sub-objetos existam para não dar erro de undefined
                    data.localizacao = data.localizacao || {};
                    data.imagemPrincipal = data.imagemPrincipal || { url: '', altText: '' };
                    setFormData(data);
                })
                .catch(err => {
                    toast.error("Erro ao carregar dados do empreendimento: " + (err.error || err.message));
                    navigate('/empreendimentos');
                })
                .finally(() => setLoading(false));
        } else {
            // Define valores padrão para criação, se necessário
            setFormData(prev => ({
                ...prev,
                tipo: TIPO_EMPREENDIMENTO_OPCOES[0], // Define um valor padrão
                statusEmpreendimento: STATUS_EMPREENDIMENTO_OPCOES[0] // Define um valor padrão
            }));
        }
    }, [id, isEditMode, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLocalizacaoChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            localizacao: { ...prev.localizacao, [name]: value }
        }));
    };

    const handleImagemChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            imagemPrincipal: { ...prev.imagemPrincipal, [name]: value }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFormError('');

        // Validação simples (pode expandir)
        if (!formData.nome || !formData.tipo || !formData.statusEmpreendimento || !formData.localizacao.cidade || !formData.localizacao.uf) {
            setFormError("Campos obrigatórios: Nome, Tipo, Status, Cidade e UF da localização.");
            setLoading(false);
            toast.error("Preencha os campos obrigatórios.");
            return;
        }

        // Prepara os dados para enviar (ex: remover campos vazios não obrigatórios se backend não os aceita)
        const dataToSubmit = { ...formData };
        if (!dataToSubmit.dataPrevistaEntrega) delete dataToSubmit.dataPrevistaEntrega;
        if (!dataToSubmit.construtoraIncorporadora) delete dataToSubmit.construtoraIncorporadora;
        // Limpeza de sub-objetos se estiverem vazios
        if (Object.values(dataToSubmit.localizacao).every(v => v === '')) delete dataToSubmit.localizacao;
        if (Object.values(dataToSubmit.imagemPrincipal).every(v => v === '')) delete dataToSubmit.imagemPrincipal;


        try {
            if (isEditMode) {
                await updateEmpreendimento(id, dataToSubmit);
                toast.success("Empreendimento atualizado com sucesso!");
            } else {
                await createEmpreendimento(dataToSubmit);
                toast.success("Empreendimento criado com sucesso!");
            }
            navigate('/empreendimentos'); // Volta para a lista
        } catch (err) {
            const errMsg = err.error || err.message || (isEditMode ? "Erro ao atualizar empreendimento." : "Erro ao criar empreendimento.");
            setFormError(errMsg);
            toast.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    if (isEditMode && loading && !formData.nome) { // Mostra loading apenas se estiver editando e ainda não carregou
         return <div className="admin-page loading"><p>Carregando dados do empreendimento...</p></div>;
    }

    return (
        <div className="admin-page empreendimento-form-page">
            <header className="page-header">
                <h1>{isEditMode ? 'Editar Empreendimento' : 'Novo Empreendimento'}</h1>
            </header>
            <div className="page-content">
                <form onSubmit={handleSubmit} className="form-container">
                    {formError && <p className="error-message" style={{marginBottom: '1rem'}}>{formError}</p>}

                    <div className="form-section">
                        <h3>Informações Gerais</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="nome">Nome do Empreendimento*</label>
                                <input type="text" id="nome" name="nome" value={formData.nome || ''} onChange={handleChange} required />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="construtoraIncorporadora">Construtora/Incorporadora</label>
                                <input type="text" id="construtoraIncorporadora" name="construtoraIncorporadora" value={formData.construtoraIncorporadora || ''} onChange={handleChange} />
                            </div>
                        </div>
                         <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="tipo">Tipo*</label>
                                <select id="tipo" name="tipo" value={formData.tipo || ''} onChange={handleChange} required>
                                    <option value="" disabled>Selecione...</option>
                                    {TIPO_EMPREENDIMENTO_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="statusEmpreendimento">Status*</label>
                                <select id="statusEmpreendimento" name="statusEmpreendimento" value={formData.statusEmpreendimento || ''} onChange={handleChange} required>
                                     <option value="" disabled>Selecione...</option>
                                    {STATUS_EMPREENDIMENTO_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>
                         <div className="form-row">
                            <div className="form-group full-width">
                                <label htmlFor="descricao">Descrição</label>
                                <textarea id="descricao" name="descricao" value={formData.descricao || ''} onChange={handleChange} rows="4"></textarea>
                            </div>
                        </div>
                        <div className="form-row">
                             <div className="form-group">
                                <label htmlFor="dataPrevistaEntrega">Data Prevista de Entrega</label>
                                <input type="date" id="dataPrevistaEntrega" name="dataPrevistaEntrega" value={formData.dataPrevistaEntrega || ''} onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Localização</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="cep">CEP</label>
                                <input type="text" id="cep" name="cep" value={formData.localizacao?.cep || ''} onChange={handleLocalizacaoChange} />
                            </div>
                            <div className="form-group three-quarters-width"> {/* Exemplo de classe para largura */}
                                <label htmlFor="logradouro">Logradouro</label>
                                <input type="text" id="logradouro" name="logradouro" value={formData.localizacao?.logradouro || ''} onChange={handleLocalizacaoChange} />
                            </div>
                             <div className="form-group quarter-width"> {/* Exemplo */}
                                <label htmlFor="numero">Número</label>
                                <input type="text" id="numero" name="numero" value={formData.localizacao?.numero || ''} onChange={handleLocalizacaoChange} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="bairro">Bairro</label>
                                <input type="text" id="bairro" name="bairro" value={formData.localizacao?.bairro || ''} onChange={handleLocalizacaoChange} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="cidade">Cidade*</label>
                                <input type="text" id="cidade" name="cidade" value={formData.localizacao?.cidade || ''} onChange={handleLocalizacaoChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="uf">UF*</label>
                                <input type="text" id="uf" name="uf" value={formData.localizacao?.uf || ''} onChange={handleLocalizacaoChange} maxLength="2" required />
                            </div>
                        </div>
                         <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="latitude">Latitude</label>
                                <input type="text" id="latitude" name="latitude" value={formData.localizacao?.latitude || ''} onChange={handleLocalizacaoChange} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="longitude">Longitude</label>
                                <input type="text" id="longitude" name="longitude" value={formData.localizacao?.longitude || ''} onChange={handleLocalizacaoChange} />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Imagem Principal</h3>
                         <div className="form-row">
                            <div className="form-group full-width">
                                <label htmlFor="imagemUrl">URL da Imagem</label>
                                <input type="url" id="imagemUrl" name="url" value={formData.imagemPrincipal?.url || ''} onChange={handleImagemChange} />
                            </div>
                        </div>
                         <div className="form-row">
                            <div className="form-group full-width">
                                <label htmlFor="imagemAltText">Texto Alternativo da Imagem</label>
                                <input type="text" id="imagemAltText" name="altText" value={formData.imagemPrincipal?.altText || ''} onChange={handleImagemChange} />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="button submit-button" disabled={loading}>
                            {loading ? (isEditMode ? 'Atualizando...' : 'Salvando...') : (isEditMode ? 'Salvar Alterações' : 'Criar Empreendimento')}
                        </button>
                        <button type="button" className="button cancel-button" onClick={() => navigate('/empreendimentos')} disabled={loading}>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EmpreendimentoFormPage;