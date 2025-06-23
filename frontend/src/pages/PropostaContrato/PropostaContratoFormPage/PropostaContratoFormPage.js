import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// APIs
import { getReservaByIdApi, createPropostaContratoApi, updatePropostaContratoApi, getPropostaContratoByIdApi } from '../../../api/propostaContratoApi';
import { getUsuarios } from '../../../api/users';
import { getBrokerContacts } from '../../../api/brokerContacts';

// Componentes
import StepAdquirentes from '../../../components/PropostaWizard/StepAdquirentes';
import StepFinanceiro from '../../../components/PropostaWizard/StepFinanceiro';
import StepCorretagem from '../../../components/PropostaWizard/StepCorretagem';
import StepResumo from '../../../components/PropostaWizard/StepResumo';

import './PropostaContratoFormPage.css';

const STATUS_PROPOSTA_OPCOES = ["Em Elaboração", "Aguardando Aprovações", "Aguardando Assinatura Cliente", "Assinado", "Vendido", "Recusado", "Cancelado"];

function PropostaContratoFormPage() {
  const { reservaId, propostaContratoId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(propostaContratoId);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    adquirentes: [{ nome: '', cpf: '', rg: '', nacionalidade: 'Brasileiro(a)', estadoCivil: '', profissao: '', isPrincipal: true }],
    valorPropostaContrato: '', valorEntrada: '', condicoesPagamentoGerais: '',
    planoDePagamento: [{ tipoParcela: 'ATO', quantidade: 1, valorUnitario: '', vencimentoPrimeira: '', observacao: '' }],
    corretagem: { valorCorretagem: '', corretorPrincipal: '', condicoesPagamentoCorretagem: '', observacoesCorretagem: '' },
    corpoContratoHTMLGerado: '', responsavelNegociacao: '', observacoesInternasProposta: '',
    statusPropostaContrato: STATUS_PROPOSTA_OPCOES[0], dataProposta: new Date().toISOString().split("T")[0]
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [reservaBase, setReservaBase] = useState(null);
  const [propostaBase, setPropostaBase] = useState(null);
  const [usuariosCRM, setUsuariosCRM] = useState([]);
  const [brokerContactsList, setBrokerContactsList] = useState([]);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [pageTitle, setPageTitle] = useState("Nova Proposta/Contrato");
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitReady, setSubmitReady] = useState(false);

  const montarDadosParaTemplate = useCallback((currentFormData, baseData) => {
    if (!baseData) return {};
    const { unidade, empreendimento } = baseData;
    const formatCurrency = (v) => parseFloat(v) ? parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
    return {
      lead_principal_nome: currentFormData.adquirentes[0]?.nome || '',
      lead_principal_cpf: currentFormData.adquirentes[0]?.cpf || '',
      valor_proposta: formatCurrency(currentFormData.valorPropostaContrato),
      unidade_identificador: unidade?.identificador || '',
      empreendimento_nome: empreendimento?.nome || '',
    };
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingInitialData(true);
      try {
        const [usuariosDataResult, brokersData] = await Promise.all([
          getUsuarios({ ativo: true }), getBrokerContacts({ ativo: true })
        ]);
        setUsuariosCRM(usuariosDataResult || []);
        setBrokerContactsList(brokersData || []);

        let initialFormData = { ...formData };
        let baseDataForTemplate = null;

        if (isEditMode && propostaContratoId) {
          setPageTitle("Carregando Proposta...");
          const proposta = await getPropostaContratoByIdApi(propostaContratoId);
          if (!proposta) throw new Error("Proposta/Contrato não encontrada.");

          setPropostaBase(proposta);
          baseDataForTemplate = proposta;
          setPageTitle(`Editar Proposta | Lead: ${proposta.lead?.nome}`);

          initialFormData = {
            ...proposta,
            responsavelNegociacao: proposta.responsavelNegociacao?._id || proposta.responsavelNegociacao,
            corretagem: {
              ...proposta.corretagem,
              corretorPrincipal: proposta.corretagem?.corretorPrincipal?._id || proposta.corretagem?.corretorPrincipal
            },
            dataProposta: proposta.dataProposta ? new Date(proposta.dataProposta).toISOString().split('T')[0] : '',
            planoDePagamento: proposta.planoDePagamento?.map(p => ({ ...p, vencimentoPrimeira: p.vencimentoPrimeira ? new Date(p.vencimentoPrimeira).toISOString().split('T')[0] : '' })) || [],
            adquirentes: proposta.adquirentesSnapshot || [],
          };
        } else if (reservaId) {
          setPageTitle("Carregando dados da Reserva...");
          const reservaData = await getReservaByIdApi(reservaId);
          if (!reservaData) throw new Error("Reserva base não encontrada.");

          setReservaBase(reservaData);
          baseDataForTemplate = reservaData;
          setPageTitle(`Nova Proposta | Lead: ${reservaData.lead?.nome}`);

          const precoImovel = reservaData?.imovel?.preco || reservaData?.imovel?.precoTabela || 0;

          initialFormData = {
            ...formData,
            valorPropostaContrato: (formData.valorPropostaContrato ?? 0) <= 0 ? precoImovel : formData.valorPropostaContrato,
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
      } catch (err) {
        toast.error(`Erro ao carregar dados: ${err.error || err.message}`);
      } finally {
        setLoadingInitialData(false);
      }
    };
    loadInitialData();
  }, [reservaId, propostaContratoId, isEditMode, navigate]);

  const handleSubmit = async (e) => {
  e.preventDefault();
  setFormError('');

  // Validações
  if (!formData.adquirentes?.[0]?.nome) {
    toast.error("Dados do Adquirente Principal são obrigatórios.");
    setCurrentStep(1);
    return;
  }
  if (!formData.valorPropostaContrato || parseFloat(formData.valorPropostaContrato) <= 0) {
    toast.error("Valor da Proposta é obrigatório.");
    setCurrentStep(2);
    return;
  }
  if (!formData.responsavelNegociacao) {
    toast.error("Responsável pela negociação é obrigatório.");
    return;
  }
  const planoPagamentoValido = formData.planoDePagamento.every(p => p.valorUnitario && p.vencimentoPrimeira);
  if (!planoPagamentoValido) {
    toast.error("Todas as parcelas precisam ter valor e vencimento.");
    setCurrentStep(2);
    return;
  }

  setShowConfirmModal(true); // <- Abre o modal
};

  const confirmSubmit = async () => {
    setIsSaving(true);
    const precoTabela = pendingSubmission?.precoTabela;

    const dataToSubmit = {
      ...formData,
      modeloContratoUtilizado: formData.modeloContratoUtilizado || null,
      adquirentesSnapshot: formData.adquirentes,
      precoTabelaUnidadeNoMomento: precoTabela,
      valorPropostaContrato: parseFloat(formData.valorPropostaContrato) || 0,
      valorEntrada: formData.valorEntrada ? parseFloat(formData.valorEntrada) : null,
      planoDePagamento: formData.planoDePagamento.filter(p => p.valorUnitario && p.vencimentoPrimeira),
      corretagem: formData.corretagem?.valorCorretagem ? { ...formData.corretagem, valorCorretagem: Number(formData.corretagem.valorCorretagem) || 0 } : null,
    };

    delete dataToSubmit.corpoContratoHTMLGerado;

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
      setModalOpen(false);
      setPendingSubmission(null);
    }
  };

  const renderStep = () => {
    const stepProps = { formData, setFormData, isSaving };
    switch (currentStep) {
      case 1: return <StepAdquirentes {...stepProps} />;
      case 2: return <StepFinanceiro {...stepProps} usuariosCRM={usuariosCRM} />;
      case 3: return <StepCorretagem {...stepProps} brokerContactsList={brokerContactsList} />;
      case 4: return <StepResumo {...stepProps} reservaBase={reservaBase || propostaBase} />;
      default: return <StepAdquirentes {...stepProps} />;
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
              <button type="button" className="button cancel-button" onClick={() => setCurrentStep(prev => prev - 1)} disabled={isSaving}>
                Anterior
              </button>
            )}
            <div style={{ flexGrow: 1 }}></div>
            {currentStep < totalSteps && (
              <button type="button" className="button primary-button" onClick={() => setCurrentStep(prev => prev + 1)}>
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

      {showConfirmModal && (
  <div className="modal-overlay">
    <div className="modal-content">
      <h2>Confirmar envio</h2>
      <p>O valor da proposta é <strong>R$ {parseFloat(formData.valorPropostaContrato).toLocaleString('pt-BR')}</strong>.<br />
         O valor de tabela é <strong>R$ {parseFloat(reservaBase?.tipoImovel === 'Unidade'
            ? reservaBase?.imovel?.precoTabela
            : reservaBase?.imovel?.preco).toLocaleString('pt-BR')}</strong>.<br />
         Deseja continuar com o envio?</p>
      <div className="modal-buttons">
        <button className="cancel-button" onClick={() => setShowConfirmModal(false)}>Cancelar</button>
        <button className="confirm-button" onClick={async () => {
          setIsSaving(true);
          setShowConfirmModal(false);

          const dataToSubmit = {
            ...formData,
            modeloContratoUtilizado: formData.modeloContratoUtilizado || null,
            adquirentesSnapshot: formData.adquirentes,
            precoTabelaUnidadeNoMomento:
              parseFloat(
                reservaBase?.tipoImovel === 'Unidade'
                  ? reservaBase?.imovel?.precoTabela
                  : reservaBase?.imovel?.preco
              ) || 0,
            valorPropostaContrato: parseFloat(formData.valorPropostaContrato) || 0,
            valorEntrada: formData.valorEntrada ? parseFloat(formData.valorEntrada) : null,
            planoDePagamento: formData.planoDePagamento.filter(p => p.valorUnitario && p.vencimentoPrimeira),
            corretagem: formData.corretagem?.valorCorretagem ? {
              ...formData.corretagem,
              valorCorretagem: Number(formData.corretagem.valorCorretagem) || 0
            } : null,
          };

          delete dataToSubmit.corpoContratoHTMLGerado;

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
        }}>Confirmar envio</button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}

export default PropostaContratoFormPage;
