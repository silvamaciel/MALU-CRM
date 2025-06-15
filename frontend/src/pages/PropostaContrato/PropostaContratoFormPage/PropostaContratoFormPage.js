import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

// APIs
import { getReservaByIdApi, createPropostaContratoApi, updatePropostaContratoApi, getPropostaContratoByIdApi } from '../../../api/propostaContratoApi';
import { getModelosContrato } from '../../../api/modeloContratoApi';
import { getUsuarios } from '../../../api/users';
import { getBrokerContacts } from '../../../api/brokerContacts';

// Componentes das Etapas do Wizard
import StepAdquirentes from '../../../components/PropostaWizard/StepAdquirentes';
import StepFinanceiro from '../../../components/PropostaWizard/StepFinanceiro';
import StepCorretagem from '../../../components/PropostaWizard/StepCorretagem';
import StepContrato from '../../../components/PropostaWizard/StepContrato';
import StepResumo from '../../../components/PropostaWizard/StepResumo';

// Estilos
import './PropostaContratoFormPage.css';

// Constantes de Opções (pode mover para um arquivo de constantes)
const STATUS_PROPOSTA_OPCOES = ["Em Elaboração", "Aguardando Aprovações", "Aguardando Assinatura Cliente", "Assinado", "Vendido", "Recusado", "Cancelado"];

function PropostaContratoFormPage() {
    const { reservaId, propostaContratoId } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(propostaContratoId);
    const totalSteps = 5;

    // --- STATES ---
    // Estado unificado para todos os dados do formulário
    const [formData, setFormData] = useState({
        adquirentes: [{ nome: '', cpf: '', rg: '', nacionalidade: 'Brasileiro(a)', estadoCivil: '', profissao: '', isPrincipal: true }],
        valorPropostaContrato: '', valorEntrada: '', condicoesPagamentoGerais: '',
        planoDePagamento: [{ tipoParcela: 'ATO', quantidade: 1, valorUnitario: '', vencimentoPrimeira: '', observacao: '' }],
        corretagem: { valorCorretagem: '', corretorPrincipal: '', condicoesPagamentoCorretagem: '', observacoesCorretagem: '' },
        modeloContratoUtilizado: '', corpoContratoHTMLGerado: '',
        responsavelNegociacao: '', observacoesInternasProposta: '',
        statusPropostaContrato: STATUS_PROPOSTA_OPCOES[0], dataProposta: new Date().toISOString().split("T")[0],
    });

    // States para dados buscados e UI
    const [currentStep, setCurrentStep] = useState(1);
    const [reservaBase, setReservaBase] = useState(null); // Usado para criar
    const [propostaBase, setPropostaBase] = useState(null); // Usado para editar
    const [modelosContrato, setModelosContrato] = useState([]);
    const [usuariosCRM, setUsuariosCRM] = useState([]);
    const [brokerContactsList, setBrokerContactsList] = useState([]);
    const [loadingInitialData, setLoadingInitialData] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [pageTitle, setPageTitle] = useState("Nova Proposta/Contrato");
    

    // Função auxiliar para montar objeto de dados para o template
    const montarDadosParaTemplate = useCallback((currentFormData, baseData) => {
        if (!baseData) return {};
        const { lead, unidade, empreendimento, dadosEmpresaVendedora } = baseData;
        const formatCurrency = (v) => parseFloat(v) ? parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
        const formatDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString('pt-BR') : 'N/A';
        // Adapte os placeholders para corresponderem aos seus templates
        return {
            lead_principal_nome: currentFormData.adquirentes[0]?.nome || '',
            lead_principal_cpf: currentFormData.adquirentes[0]?.cpf || '',
            // Adicione placeholders para coadquirentes (ex: coadquirente_1_nome, etc.) se necessário
            valor_proposta: formatCurrency(currentFormData.valorPropostaContrato),
            unidade_identificador: unidade?.identificador || '',
            empreendimento_nome: empreendimento?.nome || '',
            // ... (adicione todos os outros placeholders aqui)
        };
    }, []);

    // Efeito para carregar todos os dados iniciais
    useEffect(() => {
        const loadInitialData = async () => {
            setLoadingInitialData(true);
            try {
                // Busca dados comuns a ambos os modos (criar e editar)
                const [modelosData, usuariosDataResult, brokersData] = await Promise.all([
                    getModelosContrato(), getUsuarios({ ativo: true }), getBrokerContacts({ ativo: true })
                ]);
                setModelosContrato(modelosData.modelos || []);
                setUsuariosCRM(usuariosDataResult || []);
                setBrokerContactsList(brokersData || []);

                let initialFormData = { ...formData };
                let baseDataForTemplate = null;

                if (isEditMode && propostaContratoId) {
                    setPageTitle("Carregando Proposta...");
                    const proposta = await getPropostaContratoByIdApi(propostaContratoId);
                    if (!proposta) throw new Error("Proposta/Contrato não encontrada.");
                    
                    setPropostaBase(proposta);
                    baseDataForTemplate = proposta; // Usa a própria proposta como base
                    setPageTitle(`Editar Proposta | Lead: ${proposta.lead?.nome}`);
                    
                    initialFormData = {
                        ...proposta, // Preenche com todos os dados da proposta existente
                        // Ajusta os IDs de referência para o valor do _id, se forem objetos populados
                        responsavelNegociacao: proposta.responsavelNegociacao?._id || proposta.responsavelNegociacao,
                        modeloContratoUtilizado: proposta.modeloContratoUtilizado?._id || proposta.modeloContratoUtilizado,
                        corretagem: { ...proposta.corretagem, corretorPrincipal: proposta.corretagem?.corretorPrincipal?._id || proposta.corretagem?.corretorPrincipal },
                        // Formata datas para o input type="date"
                        dataProposta: proposta.dataProposta ? new Date(proposta.dataProposta).toISOString().split('T')[0] : '',
                        planoDePagamento: proposta.planoDePagamento?.map(p => ({...p, vencimentoPrimeira: p.vencimentoPrimeira ? new Date(p.vencimentoPrimeira).toISOString().split('T')[0] : ''})) || [],
                        // Mantém o nome 'adquirentes' para consistência do formulário
                        adquirentes: proposta.adquirentesSnapshot || [],
                    };
                } else if (reservaId) { // Modo Criação
                    setPageTitle("Carregando dados da Reserva...");
                    const reservaData = await getReservaByIdApi(reservaId);
                    if (!reservaData) throw new Error("Reserva base não encontrada.");
                    setReservaBase(reservaData);
                    baseDataForTemplate = reservaData;
                    setPageTitle(`Nova Proposta | Lead: ${reservaData.lead?.nome}`);

                    initialFormData = {
                        ...formData,
                        adquirentes: [{
                        nome: reservaData.lead?.nome || '',
                        cpf: reservaData.lead?.cpf || '',
                        rg: reservaData.lead?.rg || '',
                        nacionalidade: reservaData.lead?.nacionalidade || 'Brasileiro(a)',
                        estadoCivil: reservaData.lead?.estadoCivil || '',
                        profissao: reservaData.lead?.profissao || '',
                        email: reservaData.lead?.email || '',
                        contato: reservaData.lead?.contato || '',
                        endereco: reservaData.lead?.endereco || '',
                        nascimento: reservaData.lead?.nascimento || '',
                        isPrincipal: true
                    }, ...(reservaData.lead?.coadquirentes || [])],
                        responsavelNegociacao: reservaData.lead?.responsavel?._id || reservaData.lead?.responsavel || '',
                    };
                } else {
                    toast.error("Nenhum ID de Reserva ou Proposta fornecido.");
                    navigate('/reservas');
                    return;
                }
                setFormData(initialFormData);

            } catch (err) { toast.error(`Erro ao carregar dados: ${err.error || err.message}`); }
            finally { setLoadingInitialData(false); }
        };
        loadInitialData();
    }, [reservaId, propostaContratoId, isEditMode, navigate]);

    // Handlers de navegação do wizard
    const nextStep = () => currentStep < totalSteps && setCurrentStep(prev => prev + 1);
    const prevStep = () => currentStep > 1 && setCurrentStep(prev => prev - 1);

    // Handler final de submissão
    const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(''); // Limpa erros anteriores

    // --- VALIDAÇÃO FRONEND ANTES DE ENVIAR ---
    if (!formData.adquirentes || formData.adquirentes.length === 0 || !formData.adquirentes[0].nome) {
        toast.error("Dados do Adquirente Principal (Nome) são obrigatórios. Volte para a Etapa 1.");
        setCurrentStep(1); // Opcional: Leva o usuário de volta para a etapa com erro
        return;
    }
    if (!formData.valorPropostaContrato || parseFloat(formData.valorPropostaContrato) <= 0) {
        toast.error("O Valor da Proposta é obrigatório e deve ser maior que zero. Volte para a Etapa 2.");
        setCurrentStep(2);
        return;
    }
    if (!formData.responsavelNegociacao) {
        toast.error("O Responsável pela Negociação é obrigatório. Volte para a Etapa 3 (ou onde o campo estiver).");
        // Ajuste o setCurrentStep para a etapa correta do responsável
        return;
    }
    if (!formData.modeloContratoUtilizado) {
        toast.error("A seleção de um Modelo de Contrato é obrigatória. Volte para a Etapa 4.");
        setCurrentStep(4);
        return;
    }
    // Validação para o plano de pagamento
    const planoPagamentoValido = formData.planoDePagamento.every(p => p.valorUnitario && p.vencimentoPrimeira);
    if (!planoPagamentoValido) {
        toast.error("Todas as parcelas no Plano de Pagamento devem ter Valor e Vencimento. Volte para a Etapa 2.");
        setCurrentStep(2);
        return;
    }
    // --- FIM DA VALIDAÇÃO ---


    setIsSaving(true);

    // Prepara os dados para enviar ao backend
    const dataToSubmit = {
        modeloContratoUtilizado: formData.modeloContratoUtilizado,
        valorPropostaContrato: parseFloat(formData.valorPropostaContrato) || 0,
        valorEntrada: formData.valorEntrada ? parseFloat(formData.valorEntrada) : null,
        condicoesPagamentoGerais: formData.condicoesPagamentoGerais,
        dadosBancariosParaPagamento: formData.dadosBancariosParaPagamento,
        planoDePagamento: formData.planoDePagamento
          .map(p => ({
            ...p,
            quantidade: Number(p.quantidade) || 1,
            valorUnitario: Number(p.valorUnitario) || 0,
          }))
          .filter(p => p.valorUnitario > 0 && p.vencimentoPrimeira),
        corretagem: formData.corretagem?.valorCorretagem ? {
            ...formData.corretagem,
            valorCorretagem: Number(formData.corretagem.valorCorretagem) || 0,
        } : null,
        corpoContratoHTMLGerado: formData.corpoContratoHTMLGerado,
        responsavelNegociacao: formData.responsavelNegociacao,
        observacoesInternasProposta: formData.observacoesInternasProposta,
        statusPropostaContrato: formData.statusPropostaContrato,
        dataProposta: formData.dataProposta,
        adquirentesSnapshot: formData.adquirentes // O backend espera o snapshot, podemos enviar o array diretamente
    };

    try {
        let result;
        if (isEditMode) {
            result = await updatePropostaContratoApi(propostaContratoId, dataToSubmit);
            toast.success("Proposta/Contrato atualizada com sucesso!");
        } else {
            result = await createPropostaContratoApi(reservaId, dataToSubmit);
            toast.success("Proposta/Contrato criada com sucesso!");
        }
        navigate(`/propostas-contratos/${result._id || propostaContratoId}`);
    } catch (err) {
        const errMsg = err.error || err.message || "Erro ao salvar Proposta/Contrato.";
        setFormError(errMsg);
        toast.error(errMsg);
    } finally {
        setIsSaving(false);
    }
};
    
    // Função para renderizar a etapa correta
    const renderStep = () => {
        const stepProps = { formData, setFormData, isSaving };
        switch (currentStep) {
            case 1:
                return <StepAdquirentes {...stepProps} />;
            case 2:
                return <StepFinanceiro {...stepProps} usuariosCRM={usuariosCRM} />;
            case 3:
                return <StepCorretagem {...stepProps} brokerContactsList={brokerContactsList} />;
            case 4:
                return <StepContrato {...stepProps} modelosContrato={modelosContrato} montarDadosParaTemplate={montarDadosParaTemplate} reservaBase={reservaBase || propostaBase} />;
            case 5:
                return <StepResumo {...stepProps} reservaBase={reservaBase || propostaBase} />;
            default:
                return <StepAdquirentes {...stepProps} />;
        }
    };

    if (loadingInitialData) return <div className="admin-page loading"><p>Carregando...</p></div>;
    if ((!isEditMode && !reservaBase) || (isEditMode && !propostaBase)) return <div className="admin-page error-page"><p>Dados não encontrados. <Link to="/reservas">Voltar</Link></p></div>;

    return (
        <div className="admin-page proposta-contrato-form-page">
            <header className="page-header">
                <h1>{pageTitle}</h1>
                <p>Etapa {currentStep} de {totalSteps}</p>
            </header>
            <div className="page-content">
                <div className="form-container">
                    {formError && <p className="error-message">{formError}</p>}
                    {renderStep()}
                    <div className="form-actions wizard-actions">
                        {currentStep > 1 && (
                            <button type="button" className="button cancel-button" onClick={prevStep} disabled={isSaving}>
                                Anterior
                            </button>
                        )}
                        <div style={{ flexGrow: 1 }}></div> {/* Espaçador */}
                        {currentStep < totalSteps && (
                            <button type="button" className="button primary-button" onClick={nextStep}>
                                Próximo
                            </button>
                        )}
                        {currentStep === totalSteps && (
                            <button type="button" className="button submit-button" onClick={handleSubmit} disabled={isSaving}>
                                {isSaving ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Concluir e Criar Proposta')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PropostaContratoFormPage;