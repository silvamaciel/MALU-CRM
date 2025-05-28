import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom"; // <<< IMPORTAR Link
import { toast } from "react-toastify";

// APIs Reais (Crie/Verifique se existem com estes nomes e funcionalidades)
import {
  getReservaByIdApi,
  createPropostaContratoApi,
} from "../../../api/propostaContratoApi"; // Ajuste para ter getReservaByIdApi aqui ou no reservaApi.js
import { getModelosContrato } from "../../../api/modeloContratoApi";
import { getUsuarios } from "../../../api/users";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import "./PropostaContratoFormPage.css";

const TIPO_FINANCIAMENTO_OPCOES = [
  "Direto Construtora",
  "Financiamento Bancário",
  "À Vista",
  "Outro",
];
const STATUS_PROPOSTA_OPCOES = [
  "Em Elaboração",
  "Aguardando Aprovações",
  "Aguardando Assinatura Cliente",
  "Assinado",
  "Vendido",
  "Recusado",
  "Cancelado",
];
const TIPO_PARCELA_OPCOES = [
  "ATO",
  "PARCELA MENSAL",
  "PARCELA BIMESTRAL",
  "PARCELA TRIMESTRAL",
  "PARCELA SEMESTRAL",
  "INTERCALADA",
  "ENTREGA DE CHAVES",
  "FINANCIAMENTO",
  "OUTRA",
];

function PropostaContratoFormPage() {
  const { reservaId } = useParams();
  const navigate = useNavigate();
  // const isEditMode = false; // Este form é para criar Proposta a partir de Reserva

  const [reservaBase, setReservaBase] = useState(null);
  const [modelosContrato, setModelosContrato] = useState([]);
  const [usuariosCRM, setUsuariosCRM] = useState([]); // Para o campo responsavelNegociacao

  const [formData, setFormData] = useState({
    modeloContratoUtilizado: "",
    valorPropostaContrato: "",
    valorEntrada: "",
    condicoesPagamentoGerais: "",
    dadosBancariosParaPagamento: {
      bancoNome: "",
      agencia: "",
      contaCorrente: "",
      cnpjPagamento: "",
      pix: "",
    },
    planoDePagamento: [
      {
        tipoParcela: TIPO_PARCELA_OPCOES[0],
        quantidade: 1,
        valorUnitario: "",
        vencimentoPrimeira: "",
        observacao: "",
      },
    ],
    corretagem: {
      valorCorretagem: "",
      corretorPrincipal: "",
      condicoesPagamentoCorretagem: "",
      observacoesCorretagem: "",
    },
    corpoContratoHTMLGerado:
      "<p>Selecione um modelo de contrato para começar.</p>",
    responsavelNegociacao: "",
    observacoesInternasProposta: "",
    statusPropostaContrato: STATUS_PROPOSTA_OPCOES[0], // Default "Em Elaboração"
    dataProposta: new Date().toISOString().split("T")[0], // Default hoje
  });

  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [pageTitle, setPageTitle] = useState("Nova Proposta/Contrato");

  // Carregar dados da Reserva, Modelos de Contrato e Usuários
  useEffect(() => {
    const loadInitialData = async () => {
      if (!reservaId) {
        toast.error("ID da Reserva não fornecido.");
        navigate("/reservas");
        return;
      }
      setLoadingInitialData(true);
      try {
        // TODO: Crie getReservaByIdApi em propostaContratoApi.js ou reservaApi.js
        // Esta função deve buscar a reserva e popular lead, unidade, empreendimento e company
        const reservaData = await getReservaByIdApi(reservaId);
        const modelosData = await getModelosContrato(); // Lista modelos da empresa
        const usuariosData = await getUsuarios({ ativo: true }); // Lista usuários ativos da empresa

        console.log("Usuários CRM carregados:", usuariosData);
        setUsuariosCRM(usuariosData.users || usuariosData.data || []);

        setReservaBase(reservaData);
        setModelosContrato(modelosData.modelos || []);
        setUsuariosCRM(usuariosData.users || []);

        if (reservaData) {
          setPageTitle(
            `Nova Proposta para Lead: ${reservaData.lead?.nome} | Unidade: ${reservaData.unidade?.identificador}`
          );
          setFormData((prev) => ({
            ...prev,
            valorPropostaContrato: reservaData.unidade?.precoTabela || "",
            // Pré-seleciona o primeiro modelo, se houver
            modeloContratoUtilizado:
              modelosData.modelos && modelosData.modelos.length > 0
                ? modelosData.modelos[0]._id
                : "",
            corpoContratoHTMLGerado:
              modelosData.modelos && modelosData.modelos.length > 0
                ? modelosData.modelos[0].conteudoHTMLTemplate
                : "<p>Selecione um modelo para carregar o template.</p>",
          }));
        }
      } catch (err) {
        toast.error(
          "Erro ao carregar dados para nova proposta: " +
            (err.error || err.message)
        );
        // navigate('/reservas');
      } finally {
        setLoadingInitialData(false);
      }
    };
    loadInitialData();
  }, [reservaId, navigate]);

  // Handler para mudança de inputs normais
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handler para mudança no ReactQuill (corpoContratoHTMLGerado)
  const handleConteudoHTMLChange = (html) => {
    setFormData((prev) => ({ ...prev, corpoContratoHTMLGerado: html }));
  };

  // Handler para mudança no select de Modelo de Contrato
  const handleModeloChange = (e) => {
    const modeloId = e.target.value;
    const modeloSelecionado = modelosContrato.find((m) => m._id === modeloId);
    setFormData((prev) => ({
      ...prev,
      modeloContratoUtilizado: modeloId,
      corpoContratoHTMLGerado: modeloSelecionado
        ? modeloSelecionado.conteudoHTMLTemplate
        : "<p>Selecione um modelo para carregar o template.</p>",
    }));
  };

  // TODO: Adicionar handlers para sub-objetos (dadosBancarios, planoDePagamento, corretagem)

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError("");

    if (
      !formData.modeloContratoUtilizado ||
      !formData.valorPropostaContrato ||
      !formData.responsavelNegociacao
    ) {
      toast.error(
        "Modelo de Contrato, Valor da Proposta e Responsável pela Negociação são obrigatórios."
      );
      setIsSaving(false);
      return;
    }

    // Preparar dados para enviar ao backend
    const dataToSubmit = {
      ...formData, // Inclui todos os campos do formulário
      valorPropostaContrato: parseFloat(formData.valorPropostaContrato) || 0,
      valorEntrada: formData.valorEntrada
        ? parseFloat(formData.valorEntrada)
        : undefined, // Envia undefined se vazio
    };
    delete dataToSubmit.precoTabelaUnidadeNoMomento;

    console.log(
      "Enviando para API createPropostaContratoApi, Reserva ID:",
      reservaId,
      "Dados:",
      dataToSubmit
    );

    try {
      await createPropostaContratoApi(reservaId, dataToSubmit);
      toast.success("Proposta/Contrato criada com sucesso!");
      navigate(`/reservas`); // Ou para detalhes da reserva/proposta
    } catch (err) {
      const errMsg =
        err.error || err.message || "Erro ao criar Proposta/Contrato.";
      setFormError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingInitialData) {
    return (
      <div className="admin-page loading">
        <p>Carregando dados...</p>
      </div>
    );
  }
  if (!reservaBase && !loadingInitialData) {
    // Se terminou de carregar e não achou a reserva base
    return (
      <div className="admin-page error-page">
        <p>
          Detalhes da reserva não encontrados.{" "}
          <Link to="/reservas">Voltar para Reservas</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="admin-page proposta-contrato-form-page">
      <header className="page-header">
        <h1>{pageTitle}</h1>
      </header>
      <div className="page-content">
        <form onSubmit={handleSubmit} className="form-container">
          {formError && (
            <p className="error-message" style={{ marginBottom: "1rem" }}>
              {formError}
            </p>
          )}

          <div className="form-section">
            <h3>Detalhes da Proposta/Contrato</h3>
            <div className="form-group">
              <label htmlFor="modeloContratoUtilizado">
                Modelo de Contrato*
              </label>
              <select
                id="modeloContratoUtilizado"
                name="modeloContratoUtilizado"
                value={formData.modeloContratoUtilizado}
                onChange={handleModeloChange}
                required
                disabled={isSaving || modelosContrato.length === 0}
              >
                <option value="">
                  {modelosContrato.length === 0
                    ? "Nenhum modelo cadastrado"
                    : "Selecione um modelo..."}
                </option>
                {modelosContrato.map((mod) => (
                  <option key={mod._id} value={mod._id}>
                    {mod.nomeModelo} ({mod.tipoDocumento})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="valorPropostaContrato">
                  Valor da Proposta (R$)*
                </label>
                <input
                  type="number"
                  id="valorPropostaContrato"
                  name="valorPropostaContrato"
                  value={formData.valorPropostaContrato}
                  onChange={handleChange}
                  required
                  step="0.01"
                  min="0"
                  disabled={isSaving}
                />
              </div>
              <div className="form-group">
                <label htmlFor="valorEntrada">
                  Valor da Entrada (R$) (Opcional)
                </label>
                <input
                  type="number"
                  id="valorEntrada"
                  name="valorEntrada"
                  value={formData.valorEntrada}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="responsavelNegociacao">
                Responsável pela Negociação (CRM)*
              </label>
              <select
                id="responsavelNegociacao"
                name="responsavelNegociacao"
                value={formData.responsavelNegociacao}
                onChange={handleChange}
                required
                disabled={isSaving || usuariosCRM.length === 0}
              >
                <option value="">
                  {usuariosCRM.length === 0
                    ? isLoadingInitialData
                      ? "Carregando usuários..."
                      : "Nenhum usuário CRM"
                    : "Selecione um responsável..."}
                </option>
                {usuariosCRM.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.nome} ({user.perfil})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="dataProposta">Data da Proposta*</label>
              <input
                type="date"
                id="dataProposta"
                name="dataProposta"
                value={formData.dataProposta}
                onChange={handleChange}
                required
                disabled={isSaving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="statusPropostaContrato">
                Status da Proposta*
              </label>
              <select
                id="statusPropostaContrato"
                name="statusPropostaContrato"
                value={formData.statusPropostaContrato}
                onChange={handleChange}
                required
                disabled={isSaving}
              >
                {STATUS_PROPOSTA_OPCOES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seção para Condições Gerais, Plano de Pagamento, Corretagem (Simplificado por agora) */}
          <div className="form-section">
            <h3>Condições e Termos</h3>
            <div className="form-group">
              <label htmlFor="condicoesPagamentoGerais">
                Condições Gerais de Pagamento
              </label>
              <textarea
                name="condicoesPagamentoGerais"
                value={formData.condicoesPagamentoGerais}
                onChange={handleChange}
                rows="4"
                disabled={isSaving}
              ></textarea>
            </div>
            {/* TODO: Interface para Plano de Pagamento (array de parcelas) */}
            {/* TODO: Interface para Corretagem */}
            <div className="form-group">
              <label>Plano de Pagamento (Detalhado)</label>
              <p>
                <small>
                  <i>
                    (Interface avançada para adicionar/editar parcelas virá em
                    breve. Por enquanto, detalhe no corpo do contrato ou nas
                    condições gerais.)
                  </i>
                </small>
              </p>
            </div>
            <div className="form-group">
              <label>Corretagem (Detalhes)</label>
              <p>
                <small>
                  <i>
                    (Interface avançada para detalhes da corretagem virá em
                    breve. Por enquanto, detalhe no corpo do contrato ou nas
                    observações.)
                  </i>
                </small>
              </p>
            </div>
          </div>

          <div className="form-section">
            <h3>Conteúdo do Contrato (Baseado no Modelo)</h3>
            <p>
              <small>
                O conteúdo abaixo foi gerado a partir do modelo selecionado e
                será pré-preenchido com os dados da negociação no backend. Você
                pode ajustá-lo aqui antes de salvar.
              </small>
            </p>
            {/* VVVVV Substituir por ReactQuill no PRÓXIMO PASSO VVVVV */}
            <textarea
              name="corpoContratoHTMLGerado"
              value={formData.corpoContratoHTMLGerado}
              onChange={(e) => handleConteudoHTMLChange(e.target.value)}
              rows="25"
              style={{
                fontFamily: "monospace",
                width: "100%",
                fontSize: "0.9em",
                lineHeight: "1.5",
              }}
              disabled={isSaving}
            />
            {/* ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ */}
          </div>

          <div className="form-group">
            <label htmlFor="observacoesInternasProposta">
              Observações Internas da Proposta
            </label>
            <textarea
              name="observacoesInternasProposta"
              value={formData.observacoesInternasProposta}
              onChange={handleChange}
              rows="3"
              disabled={isSaving}
            ></textarea>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="button cancel-button"
              onClick={() => navigate("/reservas")}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="button submit-button"
              disabled={isSaving || loadingInitialData}
            >
              {isSaving ? "Salvando..." : "Criar Proposta/Contrato"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PropostaContratoFormPage;
