// frontend/src/pages/PropostaContrato/PropostaContratoFormPage/__tests__/PropostaContratoFormPage.test.js
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import PropostaContratoFormPage from '../PropostaContratoFormPage';
import * as propostaContratoApi from '../../../../api/propostaContratoApi';
import * as usersApi from '../../../../api/users';
import * as brokerContactsApi from '../../../../api/brokerContacts';

// Mock the custom hooks used by the component
const mockSetFormData = jest.fn();
const mockInitiateSubmit = jest.fn().mockReturnValue({ validationError: false });
const mockExecuteSubmit = jest.fn();
const mockCancelSubmit = jest.fn();

jest.mock('../../../../hooks/usePropostaFormInitializer', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    formData: { // Provide a more complete initial structure
        adquirentes: [{ nome: '', cpf: '', rg: '', nacionalidade: 'Brasileiro(a)', estadoCivil: '', profissao: '', isPrincipal: true }],
        valorPropostaContrato: '',
        valorEntrada: '',
        condicoesPagamentoGerais: '',
        planoDePagamento: [{ tipoParcela: 'ATO', quantidade: 1, valorUnitario: '', vencimentoPrimeira: '', observacao: '' }],
        corretagem: { valorCorretagem: '', corretorPrincipal: '', condicoesPagamentoCorretagem: '', observacoesCorretagem: '' },
        responsavelNegociacao: '',
        observacoesInternasProposta: '',
        statusPropostaContrato: "Em Elaboração",
        dataProposta: new Date().toISOString().split("T")[0],
      },
    setFormData: mockSetFormData,
    pageTitle: 'Nova Proposta/Contrato',
    reservaBase: null,
    propostaBase: null,
    usuariosCRM: [],
    brokerContactsList: [],
    loadingInitialData: false, // Default to false, can be overridden
    STATUS_PROPOSTA_OPCOES: ["Em Elaboração", "Aguardando Aprovações", "Aguardando Assinatura Cliente", "Assinado", "Vendido", "Recusado", "Cancelado"],
  })),
}));

jest.mock('../../../../hooks/usePropostaFormSubmit', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isSaving: false,
    formError: '',
    showConfirmModal: false,
    initiateSubmit: mockInitiateSubmit,
    executeSubmit: mockExecuteSubmit,
    cancelSubmit: mockCancelSubmit,
    pendingSubmitData: null, // Default
  })),
}));

// Mock child step components to simplify testing the parent form page
jest.mock('../../../../components/PropostaWizard/StepAdquirentes', () => () => <div data-testid="step-adquirentes">StepAdquirentes</div>);
jest.mock('../../../../components/PropostaWizard/StepFinanceiro', () => () => <div data-testid="step-financeiro">StepFinanceiro</div>);
jest.mock('../../../../components/PropostaWizard/StepCorretagem', () => () => <div data-testid="step-corretagem">StepCorretagem</div>);
jest.mock('../../../../components/PropostaWizard/StepResumo', () => () => <div data-testid="step-resumo">StepResumo</div>);


const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: jest.fn(), // Will be mocked per test case
}));


describe('PropostaContratoFormPage', () => {

  const setup = (params, initializerOverrides = {}, submitHookOverrides = {}) => {
    require('react-router-dom').useParams.mockReturnValue(params);
    require('../../../../hooks/usePropostaFormInitializer').default.mockImplementation(() => ({
        formData: {
            adquirentes: [{ nome: '', cpf: '', rg: '', nacionalidade: 'Brasileiro(a)', estadoCivil: '', profissao: '', isPrincipal: true }],
            valorPropostaContrato: '', valorEntrada: '', condicoesPagamentoGerais: '',
            planoDePagamento: [{ tipoParcela: 'ATO', quantidade: 1, valorUnitario: '', vencimentoPrimeira: '', observacao: '' }],
            corretagem: { valorCorretagem: '', corretorPrincipal: '', condicoesPagamentoCorretagem: '', observacoesCorretagem: '' },
            responsavelNegociacao: '', observacoesInternasProposta: '',
            statusPropostaContrato: "Em Elaboração", dataProposta: new Date().toISOString().split("T")[0],
          },
        setFormData: mockSetFormData,
        pageTitle: 'Test Page Title',
        reservaBase: null,
        propostaBase: null,
        usuariosCRM: [{_id: 'user1', nome: 'User One'}],
        brokerContactsList: [{_id: 'broker1', nome: 'Broker One'}],
        loadingInitialData: false,
        STATUS_PROPOSTA_OPCOES: ["Em Elaboração"],
      ...initializerOverrides,
    }));
    require('../../../../hooks/usePropostaFormSubmit').default.mockImplementation(() => ({
      isSaving: false, formError: '', showConfirmModal: false,
      initiateSubmit: mockInitiateSubmit, executeSubmit: mockExecuteSubmit, cancelSubmit: mockCancelSubmit,
      pendingSubmitData: null,
      ...submitHookOverrides,
    }));

    return render(
      <MemoryRouter initialEntries={[`/fake-route/${params.propostaContratoId || params.reservaId || ''}`]}>
        <ToastContainer />
        <Routes>
            <Route path="/fake-route/:propostaContratoId?" element={<PropostaContratoFormPage />} />
            <Route path="/fake-route/from-reserva/:reservaId" element={<PropostaContratoFormPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    setup({ reservaId: 'res123' }, { loadingInitialData: true });
    expect(screen.getByText(/carregando.../i)).toBeInTheDocument();
  });

  it('renders StepAdquirentes by default (step 1)', () => {
    setup({ reservaId: 'res123' });
    expect(screen.getByTestId('step-adquirentes')).toBeInTheDocument();
    expect(screen.getByText('Etapa 1 de 4')).toBeInTheDocument();
  });

  it('navigates to next step when "Próximo" is clicked', () => {
    setup({ reservaId: 'res123' });
    expect(screen.getByTestId('step-adquirentes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /próximo/i }));
    expect(screen.getByTestId('step-financeiro')).toBeInTheDocument();
    expect(screen.getByText('Etapa 2 de 4')).toBeInTheDocument();
  });

  it('navigates to previous step when "Anterior" is clicked', () => {
    setup({ reservaId: 'res123' });
    fireEvent.click(screen.getByRole('button', { name: /próximo/i })); // Go to step 2
    expect(screen.getByTestId('step-financeiro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /anterior/i }));
    expect(screen.getByTestId('step-adquirentes')).toBeInTheDocument();
    expect(screen.getByText('Etapa 1 de 4')).toBeInTheDocument();
  });

  it('shows submit button only on the last step', () => {
    setup({ reservaId: 'res123' });
    expect(screen.queryByRole('button', { name: /concluir e criar proposta/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /próximo/i })); // Step 2
    fireEvent.click(screen.getByRole('button', { name: /próximo/i })); // Step 3
    fireEvent.click(screen.getByRole('button', { name: /próximo/i })); // Step 4
    expect(screen.getByTestId('step-resumo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /concluir e criar proposta/i })).toBeInTheDocument();
  });

  it('calls initiateSubmit when submit button is clicked on last step', () => {
    setup({ reservaId: 'res123' });
    // Navigate to last step
    fireEvent.click(screen.getByRole('button', { name: /próximo/i }));
    fireEvent.click(screen.getByRole('button', { name: /próximo/i }));
    fireEvent.click(screen.getByRole('button', { name: /próximo/i }));

    fireEvent.click(screen.getByRole('button', { name: /concluir e criar proposta/i }));
    expect(mockInitiateSubmit).toHaveBeenCalledTimes(1);
  });

  it('navigates to target step if initiateSubmit returns validation error with targetStep', () => {
    mockInitiateSubmit.mockReturnValueOnce({ validationError: true, targetStep: 1 });
    setup({ reservaId: 'res123' });
    // Go to step 4
    fireEvent.click(screen.getByRole('button', { name: /próximo/i }));
    fireEvent.click(screen.getByRole('button', { name: /próximo/i }));
    fireEvent.click(screen.getByRole('button', { name: /próximo/i }));

    expect(screen.getByTestId('step-resumo')).toBeInTheDocument(); // Currently on step 4
    fireEvent.click(screen.getByRole('button', { name: /concluir e criar proposta/i }));

    expect(mockInitiateSubmit).toHaveBeenCalledTimes(1);
    // Check if it navigated back to step 1 due to validationError and targetStep: 1
    expect(screen.getByTestId('step-adquirentes')).toBeInTheDocument();
    expect(screen.getByText('Etapa 1 de 4')).toBeInTheDocument();
  });

  it('displays confirmation modal when showConfirmModal is true from hook', () => {
    setup({ reservaId: 'res123' }, {}, { showConfirmModal: true, pendingSubmitData: { valorEntrada: 100, planoDePagamento: [], precoTabelaUnidadeNoMomento: 1000 } });
    expect(screen.getByText('Confirmar envio')).toBeInTheDocument(); // Modal title/content
  });

  it('calls executeSubmit when confirmation modal "Confirmar envio" is clicked', () => {
    setup({ reservaId: 'res123' }, {}, { showConfirmModal: true, pendingSubmitData: { valorEntrada: 100, planoDePagamento: [], precoTabelaUnidadeNoMomento: 1000 } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar envio/i }));
    expect(mockExecuteSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls cancelSubmit when confirmation modal "Cancelar" is clicked', () => {
    setup({ reservaId: 'res123' }, {}, { showConfirmModal: true, pendingSubmitData: { valorEntrada: 100, planoDePagamento: [], precoTabelaUnidadeNoMomento: 1000 } });
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i, exact: false })); // exact: false for flexibility
    expect(mockCancelSubmit).toHaveBeenCalledTimes(1);
  });

  it('displays formError from usePropostaFormSubmit hook', () => {
    setup({ reservaId: 'res123' }, {}, { formError: 'Submission failed badly!' });
    expect(screen.getByText('Submission failed badly!')).toBeInTheDocument();
  });

  // Test for edit mode
  it('displays correct title and submit button text in edit mode', () => {
    setup({ propostaContratoId: 'prop123' }, { pageTitle: 'Editar Proposta XYZ' });
     // Navigate to last step
     fireEvent.click(screen.getByRole('button', { name: /próximo/i }));
     fireEvent.click(screen.getByRole('button', { name: /próximo/i }));
     fireEvent.click(screen.getByRole('button', { name: /próximo/i }));
    expect(screen.getByText('Editar Proposta XYZ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar alterações/i})).toBeInTheDocument();
  });

  // Test for data not found scenario
  it('displays data not found message if neither reservaBase nor propostaBase are loaded', () => {
    setup({ propostaContratoId: 'prop123' }, { loadingInitialData: false, propostaBase: null, reservaBase: null });
    expect(screen.getByText(/dados não encontrados/i)).toBeInTheDocument();
  });

});
