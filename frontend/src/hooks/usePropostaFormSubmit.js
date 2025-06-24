import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createPropostaContratoApi, updatePropostaContratoApi } from '../api/propostaContratoApi';

function usePropostaFormSubmit(isEditMode, propostaContratoId, reservaId) {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(""); // For errors displayed within the form area
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // This state holds the data prepared just before showing the confirmation modal.
  // It's used by the actual confirm function.
  const [pendingSubmitData, setPendingSubmitData] = useState(null);


  const initiateSubmit = (currentFormData, currentReservaBase, currentPropostaBase) => {
    setFormError(''); // Clear previous errors

    // --- Validations before showing confirmation ---
    if (!currentFormData.adquirentes?.[0]?.nome) {
      toast.error("Dados do Adquirente Principal são obrigatórios.");
      // Consider returning a value or a way for the component to know to switch to step 1
      return { validationError: true, targetStep: 1 };
    }
    if (!currentFormData.valorPropostaContrato || parseFloat(currentFormData.valorPropostaContrato) <= 0) {
      toast.error("Valor da Proposta é obrigatório.");
      return { validationError: true, targetStep: 2 };
    }
    if (!currentFormData.responsavelNegociacao) {
      // This validation might be better placed in StepFinanceiro, but can be here as a final check
      toast.error("Responsável pela negociação é obrigatório.");
      return { validationError: true, targetStep: 2 }; // Or whichever step has this field
    }
    const planoPagamentoValido = currentFormData.planoDePagamento.every(p => p.valorUnitario && parseFloat(p.valorUnitario) > 0 && p.vencimentoPrimeira);
    if (!planoPagamentoValido) {
      toast.error("Todas as parcelas do plano de pagamento precisam ter valor unitário positivo e data de vencimento.");
      return { validationError: true, targetStep: 2 };
    }
    // --- End Validations ---

    const baseDataForPrice = isEditMode ? currentPropostaBase : currentReservaBase;
    const precoTabela = parseFloat(
        baseDataForPrice?.tipoImovel === 'Unidade'
        ? baseDataForPrice?.imovel?.precoTabela
        : baseDataForPrice?.imovel?.preco
    ) || 0;

    const dataToSubmit = {
      ...currentFormData,
      modeloContratoUtilizado: currentFormData.modeloContratoUtilizado || null,
      adquirentesSnapshot: currentFormData.adquirentes, // Ensure this is the full adquirentes array
      precoTabelaUnidadeNoMomento: precoTabela,
      valorPropostaContrato: parseFloat(currentFormData.valorPropostaContrato) || 0,
      valorEntrada: currentFormData.valorEntrada ? parseFloat(currentFormData.valorEntrada) : null,
      planoDePagamento: currentFormData.planoDePagamento.filter(p => p.valorUnitario && p.vencimentoPrimeira),
      corretagem: currentFormData.corretagem?.valorCorretagem
                  ? { ...currentFormData.corretagem, valorCorretagem: Number(currentFormData.corretagem.valorCorretagem) || 0 }
                  : null,
    };
    delete dataToSubmit.corpoContratoHTMLGerado; // Never send this from the form on create/update data

    setPendingSubmitData(dataToSubmit);
    setShowConfirmModal(true);
    return { validationError: false };
  };

  const executeSubmit = async () => {
    if (!pendingSubmitData) {
      toast.error("Nenhum dado pendente para submissão.");
      setShowConfirmModal(false);
      return;
    }

    setIsSaving(true);
    setShowConfirmModal(false); // Close modal immediately

    try {
      let result;
      if (isEditMode) {
        result = await updatePropostaContratoApi(propostaContratoId, pendingSubmitData);
        toast.success("Proposta/Contrato atualizada com sucesso!");
      } else {
        result = await createPropostaContratoApi(reservaId, pendingSubmitData);
        toast.success("Proposta/Contrato criada com sucesso!");
      }
      navigate(`/propostas-contratos/${result._id || propostaContratoId}`);
    } catch (err) {
      const errMsg = err.error || err.message || "Erro ao salvar Proposta/Contrato.";
      setFormError(errMsg); // Set form-level error for display
      toast.error(errMsg); // Also show a toast
    } finally {
      setIsSaving(false);
      setPendingSubmitData(null); // Clear pending data
    }
  };

  const cancelSubmit = () => {
    setShowConfirmModal(false);
    setPendingSubmitData(null);
  };

  return {
    isSaving,
    formError,
    showConfirmModal,
    initiateSubmit, // Renamed from handleSubmit to avoid confusion with form's own event handler
    executeSubmit,  // Renamed from confirmSubmit
    cancelSubmit,
    pendingSubmitData // Exposing this so the modal can display calculated values from it
  };
}

export default usePropostaFormSubmit;
