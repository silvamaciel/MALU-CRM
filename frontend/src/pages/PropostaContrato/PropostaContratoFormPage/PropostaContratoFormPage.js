import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";

// APIs
import { getReservaByIdApi, createPropostaContratoApi } from "../../../api/propostaContratoApi";
import { getModelosContrato } from "../../../api/modeloContratoApi";
import { getUsuarios } from "../../../api/users";
import { getBrokerContactsApi } from "../../../api/brokerContactApi";

// Editor Rich Text
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

// CSS
import "./PropostaContratoFormPage.css";

// Constantes de Opções para Selects
const ESTADO_CIVIL_OPCOES = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União Estável", "Outro"];
const TIPO_PARCELA_OPCOES = ["ATO", "PARCELA MENSAL", "PARCELA BIMESTRAL", "PARCELA TRIMESTRAL", "PARCELA SEMESTRAL", "INTERCALADA", "ENTREGA DE CHAVES", "FINANCIAMENTO", "OUTRA"];
const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }], ['bold', 'italic', 'underline'],
      [{ list: "ordered" }, { list: "bullet" }], [{ align: [] }],
      [{ color: [] }, { background: [] }], ['clean']
    ],
};
const quillFormats = ["header", "bold", "italic", "underline", "list", "bullet", "align", "color", "background"];

// ----------------------------------------------------------------
// --- COMPONENTES DAS ETAPAS DO WIZARD ---
// (Definidos aqui para facilitar, podem ser movidos para arquivos separados)
// ----------------------------------------------------------------

// ETAPA 1: ADQUIRENTES (Lead Principal + Coadquirentes)
const StepAdquirentes = ({ formData, setFormData }) => {
    const handlePrincipalChange = (e) => {
        const { name, value } = e.target;
        const adquirentes = [...formData.adquirentes];
        if (adquirentes[0]) {
            adquirentes[0] = { ...adquirentes[0], [name]: value };
            setFormData(prev => ({ ...prev, adquirentes }));
        }
    };
    const handleCoadquirenteChange = (index, e) => {
        const { name, value } = e.target;
        const adquirentes = [...formData.adquirentes];
        const coadquirenteIndex = index + 1;
        if (adquirentes[coadquirenteIndex]) {
            adquirentes[coadquirenteIndex] = { ...adquirentes[coadquirenteIndex], [name]: value };
            setFormData(prev => ({ ...prev, adquirentes }));
        }
    };
    const handleAddCoadquirente = () => {
        setFormData(prev => ({
            ...prev,
            adquirentes: [
                ...prev.adquirentes,
                { nome: '', cpf: '', rg: '', nacionalidade: 'Brasileiro(a)', estadoCivil: '', profissao: '' }
            ]
        }));
    };
    const handleRemoveCoadquirente = (index) => {
        const adquirentes = [...formData.adquirentes];
        adquirentes.splice(index + 1, 1);
        setFormData(prev => ({ ...prev, adquirentes }));
    };

    const adquirentePrincipal = formData.adquirentes?.[0] || {};
    const coadquirentes = formData.adquirentes?.slice(1) || [];

    return (
        <div className="wizard-step">
            <h3>Etapa 1: Adquirentes</h3>
            <div className="adquirente-form-section principal">
                <h4>Adquirente Principal</h4>
                <div className="form-row">
                    <div className="form-group"><label>Nome Completo*</label><input type="text" name="nome" value={adquirentePrincipal.nome || ''} onChange={handlePrincipalChange} required /></div>
                    <div className="form-group"><label>CPF</label><input type="text" name="cpf" value={adquirentePrincipal.cpf || ''} onChange={handlePrincipalChange} /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label>RG</label><input type="text" name="rg" value={adquirentePrincipal.rg || ''} onChange={handlePrincipalChange} /></div>
                    <div className="form-group"><label>Estado Civil</label><select name="estadoCivil" value={adquirentePrincipal.estadoCivil || ''} onChange={handlePrincipalChange}><option value="">Selecione...</option>{ESTADO_CIVIL_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label>Profissão</label><input type="text" name="profissao" value={adquirentePrincipal.profissao || ''} onChange={handlePrincipalChange} /></div>
                    <div className="form-group"><label>Nacionalidade</label><input type="text" name="nacionalidade" value={adquirentePrincipal.nacionalidade || ''} onChange={handlePrincipalChange} /></div>
                </div>
            </div>
            {coadquirentes.map((coad, index) => (
                <div key={index} className="adquirente-form-section coadquirente">
                    <div className="coadquirente-header"><h4>Coadquirente {index + 1}</h4><button type="button" onClick={() => handleRemoveCoadquirente(index)} className="button-link delete-link">Remover</button></div>
                    <div className="form-row"><div className="form-group"><label>Nome Completo*</label><input type="text" name="nome" value={coad.nome || ''} onChange={(e) => handleCoadquirenteChange(index, e)} required /></div><div className="form-group"><label>CPF</label><input type="text" name="cpf" value={coad.cpf || ''} onChange={(e) => handleCoadquirenteChange(index, e)} /></div></div>
                    <div className="form-row"><div className="form-group"><label>RG</label><input type="text" name="rg" value={coad.rg || ''} onChange={(e) => handleCoadquirenteChange(index, e)} /></div><div className="form-group"><label>Estado Civil</label><select name="estadoCivil" value={coad.estadoCivil || ''} onChange={(e) => handleCoadquirenteChange(index, e)}><option value="">Selecione...</option>{ESTADO_CIVIL_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div></div>
                    <div className="form-row"><div className="form-group"><label>Profissão</label><input type="text" name="profissao" value={coad.profissao || ''} onChange={(e) => handleCoadquirenteChange(index, e)} /></div><div className="form-group"><label>Nacionalidade</label><input type="text" name="nacionalidade" value={coad.nacionalidade || ''} onChange={(e) => handleCoadquirenteChange(index, e)} /></div></div>
                </div>
            ))}
            <button type="button" onClick={handleAddCoadquirente} className="button outline-button">+ Adicionar Coadquirente</button>
        </div>
    );
};

// ETAPA 2: DADOS FINANCEIROS
const StepFinanceiro = ({ formData, setFormData }) => {
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    const handlePlanoDePagamentoChange = (index, event) => {
        const { name, value } = event.target;
        const list = [...formData.planoDePagamento];
        let processedValue = value;
        if (name === 'quantidade' || name === 'valorUnitario') {
            processedValue = value === '' ? '' : Number(value);
        }
        list[index][name] = processedValue;
        setFormData(prev => ({ ...prev, planoDePagamento: list }));
    };
    const handleAddParcela = () => {
        setFormData(prev => ({ ...prev, planoDePagamento: [...prev.planoDePagamento, { tipoParcela: TIPO_PARCELA_OPCOES[1], quantidade: 1, valorUnitario: '', vencimentoPrimeira: '', observacao: '' }] }));
    };
    const handleRemoveParcela = (index) => {
        if (formData.planoDePagamento.length <= 1) { toast.warn("É necessário pelo menos uma entrada no plano de pagamento."); return; }
        const list = [...formData.planoDePagamento]; list.splice(index, 1); setFormData(prev => ({ ...prev, planoDePagamento: list }));
    };
    
    return (
        <div className="wizard-step">
            <h3>Etapa 2: Financeiro e Plano de Pagamento</h3>
            <div className="form-section">
                <div className="form-row">
                    <div className="form-group"><label>Valor da Proposta (R$)*</label><input type="number" name="valorPropostaContrato" value={formData.valorPropostaContrato} onChange={handleChange} required step="0.01" min="0" /></div>
                    <div className="form-group"><label>Valor da Entrada (R$) (Opcional)</label><input type="number" name="valorEntrada" value={formData.valorEntrada} onChange={handleChange} step="0.01" min="0" /></div>
                </div>
                <div className="form-group"><label>Condições Gerais de Pagamento (Resumo)</label><textarea name="condicoesPagamentoGerais" value={formData.condicoesPagamentoGerais} onChange={handleChange} rows="3"></textarea></div>
            </div>
            <div className="form-section">
                <h4>Plano de Pagamento Detalhado*</h4>
                {formData.planoDePagamento.map((parcela, index) => (
                    <div key={index} className="parcela-item-row"><div className="coadquirente-header" style={{marginBottom: '10px'}}><p style={{margin:0, fontWeight: 500}}>Parcela {index + 1}</p>{formData.planoDePagamento.length > 1 && (<button type="button" onClick={() => handleRemoveParcela(index)} className="button-link delete-link">Remover</button>)}</div><div className="form-row"><div className="form-group"><label>Tipo</label><select name="tipoParcela" value={parcela.tipoParcela} onChange={(e) => handlePlanoDePagamentoChange(index, e)} required>{TIPO_PARCELA_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div><div className="form-group"><label>Quantidade</label><input type="number" name="quantidade" value={parcela.quantidade} onChange={(e) => handlePlanoDePagamentoChange(index, e)} min="1" required/></div></div><div className="form-row"><div className="form-group"><label>Valor Unitário (R$)</label><input type="number" name="valorUnitario" value={parcela.valorUnitario} onChange={(e) => handlePlanoDePagamentoChange(index, e)} step="0.01" min="0" required /></div><div className="form-group"><label>1º Vencimento</label><input type="date" name="vencimentoPrimeira" value={parcela.vencimentoPrimeira} onChange={(e) => handlePlanoDePagamentoChange(index, e)} required/></div></div><div className="form-group full-width"><label>Observação</label><input type="text" name="observacao" value={parcela.observacao} onChange={(e) => handlePlanoDePagamentoChange(index, e)}/></div></div>
                ))}
                <button type="button" onClick={handleAddParcela} className="button outline-button">+ Adicionar Parcela</button>
            </div>
        </div>
    );
};

// ETAPA 3: CORRETAGEM
const StepCorretagem = ({ formData, setFormData, brokerContactsList }) => {
    const handleCorretagemChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, corretagem: { ...prev.corretagem, [name]: value } })); };
    return (
        <div className="wizard-step">
            <h3>Etapa 3: Detalhes da Corretagem</h3>
            <div className="form-section">
                <div className="form-row">
                    <div className="form-group"><label>Corretor Principal</label><select name="corretorPrincipal" value={formData.corretagem.corretorPrincipal} onChange={handleCorretagemChange} disabled={brokerContactsList.length === 0}><option value="">{brokerContactsList.length === 0 ? 'Nenhum corretor cadastrado' : 'Selecione...'}</option>{brokerContactsList.map(b => <option key={b._id} value={b._id}>{b.nome} ({b.creci || 'Sem CRECI'})</option>)}</select></div>
                    <div className="form-group"><label>Valor da Corretagem (R$)</label><input type="number" name="valorCorretagem" value={formData.corretagem.valorCorretagem} onChange={handleCorretagemChange} step="0.01" min="0"/></div>
                </div>
                <div className="form-group"><label>Condições de Pagamento</label><textarea name="condicoesPagamentoCorretagem" value={formData.corretagem.condicoesPagamentoCorretagem} onChange={handleCorretagemChange} rows="2"></textarea></div>
                <div className="form-group"><label>Observações</label><textarea name="observacoesCorretagem" value={formData.corretagem.observacoesCorretagem} onChange={handleCorretagemChange} rows="2"></textarea></div>
            </div>
        </div>
    );
};

// ETAPA 4: CONTRATO (EDITOR)
const StepContrato = ({ formData, setFormData, modelosContrato, montarDadosParaTemplate, reservaBase }) => {
    const handleConteudoHTMLChange = (html) => { setFormData(prev => ({ ...prev, corpoContratoHTMLGerado: html })); };
    const handleModeloChange = (e) => {
        const modeloId = e.target.value;
        const modeloSelecionado = modelosContrato.find((m) => m._id === modeloId);
        const htmlTemplate = modeloSelecionado ? modeloSelecionado.conteudoHTMLTemplate : "<p>Selecione um modelo.</p>";
        setFormData((prev) => {
            const newState = { ...prev, modeloContratoUtilizado: modeloId };
            newState.corpoContratoHTMLGerado = preencherTemplateContrato(htmlTemplate, montarDadosParaTemplate(newState, reservaBase));
            return newState;
        });
    };
    return (
        <div className="wizard-step">
            <h3>Etapa 4: Documento do Contrato</h3>
            <div className="form-section">
                <div className="form-group"><label>Usar Modelo de Contrato*</label><select name="modeloContratoUtilizado" value={formData.modeloContratoUtilizado} onChange={handleModeloChange} required><option value="">Selecione um modelo...</option>{modelosContrato.map(m => <option key={m._id} value={m._id}>{m.nomeModelo}</option>)}</select></div>
                <div className="form-group"><label>Conteúdo do Contrato (Editável)</label><p><small>O texto abaixo foi gerado a partir do modelo e dados. Você pode fazer ajustes finos aqui.</small></p><div className="quill-editor-container"><ReactQuill theme="snow" value={formData.corpoContratoHTMLGerado} onChange={handleConteudoHTMLChange} modules={quillModules} formats={quillFormats}/></div></div>
            </div>
        </div>
    );
};

// ETAPA 5: RESUMO E CONFIRMAÇÃO
const StepResumo = ({ formData, reservaBase }) => {
    return (
        <div className="wizard-step">
            <h3>Etapa 5: Resumo e Confirmação</h3>
            <p>Por favor, revise todos os dados antes de criar a Proposta/Contrato.</p>
            <div className="resumo-section">
                <h4>Adquirentes</h4>
                {formData.adquirentes.map((p, i) => (<p key={i}><strong>{i === 0 ? 'Principal:' : `Coadquirente ${i}:`}</strong> {p.nome} (CPF: {p.cpf || 'N/A'})</p>))}
            </div>
            <div className="resumo-section">
                <h4>Financeiro</h4>
                <p><strong>Valor da Proposta:</strong> {parseFloat(formData.valorPropostaContrato || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                <p><strong>Plano de Pagamento:</strong> {formData.planoDePagamento.length} entrada(s)/parcela(s) definida(s).</p>
            </div>
            <div className="resumo-section">
                <h4>Conteúdo do Contrato (Preview)</h4>
                <div className="html-preview-container" dangerouslySetInnerHTML={{ __html: formData.corpoContratoHTMLGerado || '' }} />
            </div>
        </div>
    );
};


// ----------------------------------------------------------------
// --- COMPONENTE PAI: O WIZARD ---
// ----------------------------------------------------------------

function PropostaContratoFormPage() {
    const { reservaId } = useParams();
    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 5; // Total de etapas no wizard

    // State unificado para todos os dados do formulário
    const [formData, setFormData] = useState({
        adquirentes: [{ nome: '', cpf: '', rg: '', nacionalidade: 'Brasileiro(a)', estadoCivil: '', profissao: '', isPrincipal: true }],
        valorPropostaContrato: '', valorEntrada: '', condicoesPagamentoGerais: '',
        planoDePagamento: [{ tipoParcela: TIPO_PARCELA_OPCOES[0], quantidade: 1, valorUnitario: '', vencimentoPrimeira: '', observacao: '' }],
        corretagem: { valorCorretagem: '', corretorPrincipal: '', condicoesPagamentoCorretagem: '', observacoesCorretagem: '' },
        modeloContratoUtilizado: '', corpoContratoHTMLGerado: '',
        responsavelNegociacao: '', observacoesInternasProposta: '',
        statusPropostaContrato: STATUS_PROPOSTA_OPCOES[0], dataProposta: new Date().toISOString().split("T")[0],
    });

    // States para dados buscados e UI
    const [reservaBase, setReservaBase] = useState(null);
    const [modelosContrato, setModelosContrato] = useState([]);
    const [usuariosCRM, setUsuariosCRM] = useState([]);
    const [brokerContactsList, setBrokerContactsList] = useState([]);
    const [loadingInitialData, setLoadingInitialData] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState("");
    
    const montarDadosParaTemplate = useCallback((currentFormData, currentReservaBase) => {
        if (!currentReservaBase) return {};
        const formatCurrency = (value) => { /* ... */ }; const formatDateForDisplay = (dateString) => { /* ... */ };
        // ... (sua lógica completa de montarDadosParaTemplate da resposta #223)
        return { /* ... seu objeto de dados para template ... */ };
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!reservaId) { toast.error("ID da Reserva não fornecido."); navigate('/reservas'); return; }
            setLoadingInitialData(true);
            try {
                const [reservaData, modelosData, usuariosDataResult, brokersData] = await Promise.all([
                    getReservaByIdApi(reservaId), getModelosContrato(), getUsuarios({ ativo: true }), getBrokerContactsApi({ ativo: true })
                ]);
                
                setReservaBase(reservaData);
                setModelosContrato(modelosData.modelos || []);
                setUsuariosCRM(usuariosDataResult || []);
                setBrokerContactsList(brokersData || []);
                
                if (reservaData) {
                    const primeiroModelo = (modelosData.modelos && modelosData.modelos.length > 0) ? modelosData.modelos[0] : null;
                    const initialFormData = {
                        ...formData,
                        adquirentes: [{
                            nome: reservaData.lead?.nome || '', cpf: reservaData.lead?.cpf || '', rg: reservaData.lead?.rg || '',
                            nacionalidade: reservaData.lead?.nacionalidade || 'Brasileiro(a)', estadoCivil: reservaData.lead?.estadoCivil || '',
                            profissao: reservaData.lead?.profissao || '', isPrincipal: true
                        }, ...(reservaData.lead?.coadquirentes || []) ], // Adiciona coadquirentes se existirem no lead
                        valorPropostaContrato: reservaData.unidade?.precoTabela || '',
                        responsavelNegociacao: reservaData.lead?.responsavel?._id || reservaData.lead?.responsavel || '',
                        modeloContratoUtilizado: primeiroModelo?._id || '',
                    };
                    initialFormData.corpoContratoHTMLGerado = preencherTemplateContrato(
                        primeiroModelo?.conteudoHTMLTemplate || '',
                        montarDadosParaTemplate(initialFormData, reservaData)
                    );
                    setFormData(initialFormData);
                }
            } catch (err) { toast.error(`Erro ao carregar dados: ${err.error || err.message}`); }
            finally { setLoadingInitialData(false); }
        };
        loadInitialData();
    }, [reservaId, navigate, montarDadosParaTemplate]);

    const nextStep = () => currentStep < totalSteps && setCurrentStep(prev => prev + 1);
    const prevStep = () => currentStep > 1 && setCurrentStep(prev => prev - 1);

    const handleSubmit = async (e) => {
        e.preventDefault(); setIsSaving(true); setFormError('');
        // ... (validações finais antes de enviar)
        try {
            await createPropostaContratoApi(reservaId, formData);
            toast.success("Proposta/Contrato criada com sucesso!");
            navigate('/reservas');
        } catch (err) { /* ... */ } finally { setIsSaving(false); }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1: return <StepAdquirentes formData={formData} setFormData={setFormData} />;
            case 2: return <StepFinanceiro formData={formData} setFormData={setFormData} />;
            case 3: return <StepCorretagem formData={formData} setFormData={setFormData} brokerContactsList={brokerContactsList} />;
            case 4: return <StepContrato formData={formData} setFormData={setFormData} modelosContrato={modelosContrato} montarDadosParaTemplate={montarDadosParaTemplate} reservaBase={reservaBase} />;
            case 5: return <StepResumo formData={formData} reservaBase={reservaBase} />;
            default: return <StepAdquirentes formData={formData} setFormData={setFormData} />;
        }
    };

    if (loadingInitialData) return <div className="admin-page loading"><p>Carregando dados da reserva...</p></div>;
    if (!reservaBase && !loadingInitialData) return <div className="admin-page error-page"><p>Dados da reserva não encontrados. <Link to="/reservas">Voltar</Link></p></div>;
    
    return (
        <div className="admin-page proposta-contrato-form-page">
            <header className="page-header">
                <h1>Nova Proposta/Contrato (Etapa {currentStep} de {totalSteps})</h1>
                <p>Lead: <strong>{reservaBase.lead?.nomePrincipal || reservaBase.lead?.nome}</strong> | Unidade: <strong>{reservaBase.unidade?.identificador}</strong></p>
            </header>
            <div className="page-content">
                <div className="form-container">
                    {renderStep()}
                    <div className="form-actions wizard-actions">
                        {currentStep > 1 && (<button type="button" className="button cancel-button" onClick={prevStep}>Anterior</button>)}
                        <div style={{flexGrow: 1}}></div> {/* Espaçador */}
                        {currentStep < totalSteps && (<button type="button" className="button primary-button" onClick={nextStep}>Próximo</button>)}
                        {currentStep === totalSteps && (<button type="button" className="button submit-button" onClick={handleSubmit} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Concluir e Salvar Proposta'}</button>)}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PropostaContratoFormPage;