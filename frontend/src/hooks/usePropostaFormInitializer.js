import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getReservaByIdApi, getPropostaContratoByIdApi } from '../api/propostaContratoApi';
import { getUsuarios } from '../api/users';
import { getBrokerContacts } from '../api/brokerContacts';

const STATUS_PROPOSTA_OPCOES = ["Em Elaboração", "Aguardando Aprovações", "Aguardando Assinatura Cliente", "Assinado", "Vendido", "Recusado", "Cancelado"];

const initialFormDataState = {
  adquirentes: [{ nome: '', cpf: '', rg: '', nacionalidade: 'Brasileiro(a)', estadoCivil: '', profissao: '', isPrincipal: true }],
  valorPropostaContrato: '',
  valorEntrada: '',
  condicoesPagamentoGerais: '',
  planoDePagamento: [{ tipoParcela: 'ATO', quantidade: 1, valorUnitario: '', vencimentoPrimeira: '', observacao: '' }],
  corretagem: { valorCorretagem: '', corretorPrincipal: '', condicoesPagamentoCorretagem: '', observacoesCorretagem: '' },
  corpoContratoHTMLGerado: '', // This is generally not set at form creation/edit time directly
  responsavelNegociacao: '',
  observacoesInternasProposta: '',
  statusPropostaContrato: STATUS_PROPOSTA_OPCOES[0],
  dataProposta: new Date().toISOString().split("T")[0],
};

function usePropostaFormInitializer(reservaId, propostaContratoId, isEditMode) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormDataState);
  const [pageTitle, setPageTitle] = useState(isEditMode ? "Carregando Proposta..." : "Nova Proposta/Contrato");
  const [reservaBase, setReservaBase] = useState(null);
  const [propostaBase, setPropostaBase] = useState(null);
  const [usuariosCRM, setUsuariosCRM] = useState([]);
  const [brokerContactsList, setBrokerContactsList] = useState([]);
  const [loadingInitialData, setLoadingInitialData] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingInitialData(true);
      try {
        const [usuariosDataResult, brokersData] = await Promise.all([
          getUsuarios({ ativo: true }),
          getBrokerContacts({ ativo: true }),
        ]);
        setUsuariosCRM(usuariosDataResult || []);
        setBrokerContactsList(brokersData || []);

        let newInitialFormData = { ...initialFormDataState }; // Start fresh

        if (isEditMode && propostaContratoId) {
          setPageTitle("Carregando Proposta...");
          const proposta = await getPropostaContratoByIdApi(propostaContratoId);
          if (!proposta) throw new Error("Proposta/Contrato não encontrada.");

          setPropostaBase(proposta);
          setPageTitle(`Editar Proposta | Lead: ${proposta.lead?.nome || 'N/I'}`);

          newInitialFormData = {
            ...proposta,
            responsavelNegociacao: proposta.responsavelNegociacao?._id || proposta.responsavelNegociacao || '',
            corretagem: {
              ...(proposta.corretagem || initialFormDataState.corretagem), // Ensure corretagem object exists
              corretorPrincipal: proposta.corretagem?.corretorPrincipal?._id || proposta.corretagem?.corretorPrincipal || '',
            },
            dataProposta: proposta.dataProposta ? new Date(proposta.dataProposta).toISOString().split('T')[0] : new Date().toISOString().split("T")[0],
            planoDePagamento: proposta.planoDePagamento?.map(p => ({ ...p, vencimentoPrimeira: p.vencimentoPrimeira ? new Date(p.vencimentoPrimeira).toISOString().split('T')[0] : '' })) || initialFormDataState.planoDePagamento,
            adquirentes: proposta.adquirentesSnapshot?.length ? proposta.adquirentesSnapshot : initialFormDataState.adquirentes,
            // Ensure all fields from initialFormDataState are present
            valorEntrada: proposta.valorEntrada !== undefined ? proposta.valorEntrada : initialFormDataState.valorEntrada,
            condicoesPagamentoGerais: proposta.condicoesPagamentoGerais !== undefined ? proposta.condicoesPagamentoGerais : initialFormDataState.condicoesPagamentoGerais,
            observacoesInternasProposta: proposta.observacoesInternasProposta !== undefined ? proposta.observacoesInternasProposta : initialFormDataState.observacoesInternasProposta,
            statusPropostaContrato: proposta.statusPropostaContrato || initialFormDataState.statusPropostaContrato,
          };
        } else if (reservaId) {
          setPageTitle("Carregando dados da Reserva...");
          const reservaData = await getReservaByIdApi(reservaId);
          if (!reservaData) throw new Error("Reserva base não encontrada.");

          setReservaBase(reservaData);
          setPageTitle(`Nova Proposta | Lead: ${reservaData.lead?.nome || 'N/I'}`);

          const precoImovel = reservaData?.imovel?.preco || reservaData?.imovel?.precoTabela || 0;

          newInitialFormData = {
            ...initialFormDataState, // Start with defaults
            valorPropostaContrato: precoImovel || '',
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
              nascimento: reservaData.lead?.nascimento ? new Date(reservaData.lead.nascimento).toISOString().split('T')[0] : '',
              isPrincipal: true,
            }, ...(reservaData.lead?.coadquirentes || []).map(co => ({...co, isPrincipal: false}))],
            responsavelNegociacao: reservaData.lead?.responsavel?._id || reservaData.lead?.responsavel || '',
          };
        } else if (!isEditMode) { // Only navigate away if not in edit mode and no IDs
          toast.error("Nenhum ID de Reserva ou Proposta fornecido para nova proposta.");
          navigate('/reservas');
          return;
        }
        setFormData(newInitialFormData);
      } catch (err) {
        toast.error(`Erro ao carregar dados iniciais: ${err.error || err.message}`);
        if (!isEditMode) navigate('/reservas'); // Navigate away if creation context fails
      } finally {
        setLoadingInitialData(false);
      }
    };

    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservaId, propostaContratoId, isEditMode, navigate]); // formData is not needed here as it's being set

  return {
    formData,
    setFormData,
    pageTitle,
    reservaBase,
    propostaBase,
    usuariosCRM,
    brokerContactsList,
    loadingInitialData,
    STATUS_PROPOSTA_OPCOES, // Exporting this if the main component needs it for StepResumo
  };
}

export default usePropostaFormInitializer;
