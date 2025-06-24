import React, { useState, useEffect } from 'react'; // Removed useCallback as it's in the hook
import { useParams, Link } from 'react-router-dom'; // useNavigate is now in hooks
// Removed API imports, they are now in hooks
// import { getReservaByIdApi, createPropostaContratoApi, updatePropostaContratoApi, getPropostaContratoByIdApi } from '../../../api/propostaContratoApi';
// import { getUsuarios } from '../../../api/users';
// import { getBrokerContacts } from '../../../api/brokerContacts';

// Custom Hooks
import usePropostaFormInitializer from '../../../hooks/usePropostaFormInitializer';
import usePropostaFormSubmit from '../../../hooks/usePropostaFormSubmit';

// Componentes (Step components remain)
import StepAdquirentes from '../../../components/PropostaWizard/StepAdquirentes';
import StepFinanceiro from '../../../components/PropostaWizard/StepFinanceiro';
import StepCorretagem from '../../../components/PropostaWizard/StepCorretagem';
import StepResumo from '../../../components/PropostaWizard/StepResumo';

import './PropostaContratoFormPage.css';

const STATUS_PROPOSTA_OPCOES = ["Em Elaboração", "Aguardando Aprovações", "Aguardando Assinatura Cliente", "Assinado", "Vendido", "Recusado", "Cancelado"];

function PropostaContratoFormPage() {
  const { reservaId, propostaContratoId } = useParams();
  const isEditMode = Boolean(propostaContratoId);
  const totalSteps = 4; // This can be a constant or derived if steps become dynamic

  const {
    formData,
    setFormData,
    pageTitle,
    reservaBase,
    propostaBase,
    usuariosCRM,
    brokerContactsList,
    loadingInitialData,
    STATUS_PROPOSTA_OPCOES // Make sure this is exported from the hook if needed by StepResumo for status options
  } = usePropostaFormInitializer(reservaId, propostaContratoId, isEditMode);

  const {
    isSaving,
    formError, // Form-level error from submission hook
    showConfirmModal,
    // setShowConfirmModal, // Managed by the hook now
    initiateSubmit,
    executeSubmit,
    cancelSubmit,
    pendingSubmitData
  } = usePropostaFormSubmit(isEditMode, propostaContratoId, reservaId);

  const [currentStep, setCurrentStep] = useState(1);
  // Removed local formError state, using the one from usePropostaFormSubmit

  const handleFormSubmitAttempt = (e) => {
    e.preventDefault();
    const { validationError, targetStep } = initiateSubmit(formData, reservaBase, propostaBase);
    if (validationError && targetStep) {
      setCurrentStep(targetStep); // Navigate to the step with validation error
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
      <p> O valor total da proposta (entrada + parcelas) é <strong> R$ {((parseFloat(formData.valorEntrada) || 0) + (formData.planoDePagamento || []).reduce((acc, p) => acc + ((parseFloat(p.valorUnitario) || 0) * (p.quantidade || 1)), 0)).toLocaleString('pt-BR')}</strong>.<br />
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
