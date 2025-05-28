// src/pages/Admin/ModeloContrato/ModeloContratoFormPage/ModeloContratoFormPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createModeloContrato, getModeloContratoById, updateModeloContrato } from '../../../../api/modeloContratoApi';
import './ModeloContratoFormPage.css';

const TIPO_DOCUMENTO_OPCOES = ["Proposta", "Contrato de Reserva", "Contrato de Compra e Venda", "Outro"];

//dadosParaTemplate dentro do PropostaContratoService.js
const LISTA_PLACEHOLDERS_DISPONIVEIS = [
    { ph: "{{vendedor_nome_fantasia}}", desc: "Nome Fantasia da Empresa Vendedora (do CRM)" },
    { ph: "{{vendedor_razao_social}}", desc: "Razão Social da Empresa Vendedora" },
    { ph: "{{vendedor_cnpj}}", desc: "CNPJ da Empresa Vendedora" },
    { ph: "{{vendedor_endereco_completo}}", desc: "Endereço Completo da Empresa Vendedora" },
    { ph: "{{vendedor_representante_nome}}", desc: "Nome do Representante Legal da Empresa Vendedora" },
    { ph: "{{vendedor_representante_cpf}}", desc: "CPF do Representante Legal da Empresa Vendedora" },
    { ph: "{{lead_nome}}", desc: "Nome Completo do Lead Principal" },
    { ph: "{{lead_cpf}}", desc: "CPF do Lead Principal" },
    { ph: "{{lead_rg}}", desc: "RG do Lead Principal" },
    { ph: "{{lead_endereco_completo}}", desc: "Endereço Completo do Lead" },
    { ph: "{{lead_estado_civil}}", desc: "Estado Civil do Lead" },
    { ph: "{{lead_profissao}}", desc: "Profissão do Lead" },
    { ph: "{{lead_nacionalidade}}", desc: "Nacionalidade do Lead" },
    { ph: "{{lead_email}}", desc: "Email do Lead" },
    { ph: "{{lead_telefone}}", desc: "Telefone do Lead (formatado)" },
    { ph: "{{empreendimento_nome}}", desc: "Nome do Empreendimento" },
    { ph: "{{unidade_identificador}}", desc: "Identificador da Unidade (Ex: Apto 101)" },
    { ph: "{{unidade_tipologia}}", desc: "Tipologia da Unidade" },
    { ph: "{{unidade_area_privativa}}", desc: "Área Privativa da Unidade (Ex: 70m²)" },
    { ph: "{{empreendimento_endereco_completo}}", desc: "Endereço Completo do Empreendimento" },
    { ph: "{{unidade_memorial_incorporacao}}", desc: "Nº Memorial de Incorporação do Empreendimento" },
    { ph: "{{unidade_matricula}}", desc: "Nº Matrícula da Unidade" },
    { ph: "{{proposta_valor_total_formatado}}", desc: "Valor Total da Proposta (Ex: R$ 238.000,00)" },
    { ph: "{{proposta_valor_entrada_formatado}}", desc: "Valor da Entrada/Sinal (Ex: R$ 1.000,00)" },
    { ph: "{{proposta_condicoes_pagamento_gerais}}", desc: "Texto das Condições Gerais de Pagamento" },
    { ph: "{{pagamento_banco_nome}}", desc: "Nome do Banco para Pagamento" },
    { ph: "{{pagamento_agencia}}", desc: "Agência para Pagamento" },
    { ph: "{{pagamento_conta_corrente}}", desc: "Conta Corrente para Pagamento" },
    { ph: "{{pagamento_cnpj_favorecido}}", desc: "CNPJ do Favorecido para Pagamento" },
    { ph: "{{pagamento_pix}}", desc: "Chave PIX para Pagamento" },
    { ph: "{{plano_pagamento_string_formatada}}", desc: "String formatada do Plano de Pagamento detalhado" },
    { ph: "{{corretagem_valor_formatado}}", desc: "Valor da Corretagem (Ex: R$ 14.280,00)" },
    { ph: "{{corretor_principal_nome}}", desc: "Nome do Corretor Principal da Venda" },
    { ph: "{{corretor_principal_cpf_cnpj}}", desc: "CPF/CNPJ do Corretor Principal" },
    { ph: "{{corretor_principal_creci}}", desc: "CRECI/Registro Profissional do Corretor" },
    { ph: "{{corretagem_condicoes}}", desc: "Condições de Pagamento da Corretagem" },
    { ph: "{{data_proposta_extenso}}", desc: "Data da Proposta por Extenso (Ex: 27 de Maio de 2025)" },
    { ph: "{{cidade_contrato}}", desc: "Cidade de Emissão do Contrato (da Empresa Vendedora)" },
];

function ModeloContratoFormPage() {
    const { id } = useParams(); // Para pegar o ID da URL (no caso de edição)
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState({
        nomeModelo: '',
        tipoDocumento: TIPO_DOCUMENTO_OPCOES[0],
        conteudoHTMLTemplate: '<h1>Título do Contrato</h1>\n<p>Prezado(a) {{lead_nome}},</p>\n<p>Segue a proposta para a unidade {{unidade_identificador}} do empreendimento {{empreendimento_nome}}.</p>\n<p>Valor: {{proposta_valor_total_formatado}}</p>\n<pAtenciosamente,</p>\n<p>{{vendedor_nome_fantasia}}</p>',
    });

    const [loading, setLoading] = useState(false);
    const [pageTitle, setPageTitle] = useState('Novo Modelo de Contrato');
    const [formError, setFormError] = useState('');

    // Para controlar a aba visível: 'editor' ou 'preview'
    const [activeTab, setActiveTab] = useState('editor');


    useEffect(() => {
        if (isEditMode && id) {
            setLoading(true);
            getModeloContratoById(id)
                .then(data => {
                    setFormData({
                        nomeModelo: data.nomeModelo || '',
                        tipoDocumento: data.tipoDocumento || TIPO_DOCUMENTO_OPCOES[0],
                        conteudoHTMLTemplate: data.conteudoHTMLTemplate || '',
                    });
                    setPageTitle(`Editar Modelo: ${data.nomeModelo}`);
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
                    {formError && <p className="error-message">{formError}</p>}

                    <div className="form-group">
                        <label htmlFor="nomeModelo">Nome do Modelo*</label>
                        <input type="text" id="nomeModelo" name="nomeModelo" value={formData.nomeModelo} onChange={handleChange} required disabled={loading} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="tipoDocumento">Tipo de Documento*</label>
                        <select id="tipoDocumento" name="tipoDocumento" value={formData.tipoDocumento} onChange={handleChange} required disabled={loading}>
                            {TIPO_DOCUMENTO_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    {/* Abas para Editor e Preview */}
                    <div className="tabs-container" style={{ marginBottom: '15px', borderBottom: '1px solid #ccc' }}>
                        <button type="button" onClick={() => setActiveTab('editor')} className={`tab-button ${activeTab === 'editor' ? 'active' : ''}`} disabled={loading}>
                            Editor HTML
                        </button>
                        <button type="button" onClick={() => setActiveTab('preview')} className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`} disabled={loading}>
                            Pré-visualizar HTML
                        </button>
                    </div>

                    {activeTab === 'editor' && (
                        <div className="form-group">
                            <label htmlFor="conteudoHTMLTemplate">Conteúdo HTML do Modelo*</label>
                            <p><small>Use placeholders da lista abaixo. Ex: {"{{lead_nome}}"}, {"{{unidade_identificador}}"}</small></p>
                            <textarea
                                id="conteudoHTMLTemplate"
                                name="conteudoHTMLTemplate"
                                value={formData.conteudoHTMLTemplate}
                                onChange={handleChange}
                                rows="25"
                                required
                                disabled={loading}
                                placeholder="Cole ou digite o HTML do seu modelo de contrato aqui..."
                                style={{ fontFamily: 'monospace', fontSize: '0.9em', lineHeight: '1.5' }}
                            />
                        </div>
                    )}

                    {activeTab === 'preview' && (
                        <div className="form-group">
                            <label>Pré-visualização do HTML (como será renderizado):</label>
                            <div 
                                className="html-preview" 
                                style={{ border: '1px solid #ccc', padding: '15px', minHeight: '300px', background: '#f9f9f9', overflow: 'auto' }}
                                dangerouslySetInnerHTML={{ __html: formData.conteudoHTMLTemplate }} 
                            />
                        </div>
                    )}
                    
                    <div className="form-section" style={{marginTop: '20px'}}>
                        <h3>Placeholders Disponíveis para o Template</h3>
                        <ul className="placeholders-list">
                            {LISTA_PLACEHOLDERS_DISPONIVEIS.map(item => (
                                <li key={item.ph}>
                                    <code>{item.ph}</code> - {item.desc}
                                </li>
                            ))}
                        </ul>
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