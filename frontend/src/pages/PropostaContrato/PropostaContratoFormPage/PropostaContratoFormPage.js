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


const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ font: [] }],
      ["bold", "italic", "underline", "strike", "blockquote", "code-block"],
      [
        { list: "ordered" },
        { list: "bullet" },
        { indent: "-1" },
        { indent: "+1" },
      ],
      [{ align: [] }],
      [{ color: [] }, { background: [] }],
      ["link", "image", "video"], // Adicionei image e video como exemplo, remova se não precisar
      ["clean"], // Botão para remover formatação
    ],
    // Você pode adicionar outros módulos aqui, como handlers para upload de imagem, etc.
  };

  const quillFormats = [
    "header",
    "font",
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "code-block",
    "list",
    "bullet",
    "indent",
    "link",
    "image",
    "video",
    "align",
    "color",
    "background",
  ];

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

const preencherTemplateContrato = (templateHtml, dados) => {
  if (!templateHtml) return "";
  let corpoProcessado = templateHtml;
  for (const key in dados) {
    const placeholder = `{{${key}}}`;
    corpoProcessado = corpoProcessado.replace(
      new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "g"),
      dados[key] || ""
    );
  }
  return corpoProcessado;
};

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

  const montarDadosParaTemplate = useCallback(() => {
    if (!reservaBase) return {};
    // Adapte os placeholders para corresponder EXATAMENTE aos que você definiu em LISTA_PLACEHOLDERS_DISPONIVEIS
    // no ModeloContratoFormPage e que seu backend PropostaContratoService espera.
    return {
      vendedor_nome_fantasia: reservaBase.company?.nome || "",
      vendedor_razao_social:
        reservaBase.company?.razaoSocial || reservaBase.company?.nome || "",
      vendedor_cnpj: reservaBase.company?.cnpj || "",
      vendedor_endereco_completo: `${
        reservaBase.company?.endereco?.logradouro || ""
      }, ${reservaBase.company?.endereco?.numero || ""} ...`, // Formatar
      vendedor_representante_nome:
        reservaBase.company?.representanteLegalNome || "",
      vendedor_representante_cpf:
        reservaBase.company?.representanteLegalCPF || "",

      lead_nome: reservaBase.lead?.nome || "",
      lead_cpf: reservaBase.lead?.cpf || "",
      lead_rg: reservaBase.lead?.rg || "", // Adicionar ao modelo Lead
      lead_endereco_completo: reservaBase.lead?.endereco || "",
      lead_estado_civil: reservaBase.lead?.estadoCivil || "", // Adicionar ao modelo Lead
      lead_profissao: reservaBase.lead?.profissao || "", // Adicionar ao modelo Lead
      lead_nacionalidade: reservaBase.lead?.nacionalidade || "Brasileiro(a)", // Adicionar ao modelo Lead
      lead_email: reservaBase.lead?.email || "",
      lead_telefone: reservaBase.lead?.contato || "",

      empreendimento_nome: reservaBase.empreendimento?.nome || "",
      unidade_identificador: reservaBase.unidade?.identificador || "",
      unidade_tipologia: reservaBase.unidade?.tipologia || "",
      unidade_area_privativa: reservaBase.unidade?.areaUtil
        ? `${reservaBase.unidade.areaUtil}m²`
        : "",
      empreendimento_endereco_completo: `${
        reservaBase.empreendimento?.localizacao?.logradouro || ""
      }, ...`, // Formatar

      // Dados da transação vêm do formData ATUAL
      proposta_valor_total_formatado: parseFloat(
        formData.valorPropostaContrato || 0
      ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      proposta_valor_entrada_formatado: formData.valorEntrada
        ? parseFloat(formData.valorEntrada).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })
        : "N/A",
      proposta_condicoes_pagamento_gerais:
        formData.condicoesPagamentoGerais || "",

      // Data da proposta formatada
      data_proposta_extenso: formData.dataProposta
        ? new Date(formData.dataProposta + "T00:00:00").toLocaleDateString(
            "pt-BR",
            { year: "numeric", month: "long", day: "numeric" }
          )
        : "", // Adiciona T00:00:00 para evitar problemas de fuso ao converter só data
      cidade_contrato: reservaBase.company?.endereco?.cidade || "____________",
    };
  }, [reservaBase, formData]);

  // Carregar dados da Reserva, Modelos de Contrato e Usuários
  useEffect(() => {
    const loadInitialData = async () => {
      // ... (sua lógica para buscar reservaData, modelosData, usuariosData) ...
      setLoadingInitialData(true);
      try {
        const [reservaData, modelosData, usuariosData] = await Promise.all([
          getReservaByIdApi(reservaId),
          getModelosContrato(),
          getUsuarios({ ativo: true }),
        ]);

        setReservaBase(reservaData);
        setModelosContrato(modelosData.modelos || []);
        setUsuariosCRM(usuariosData.data || []);

        if (reservaData) {
          setPageTitle(
            `Nova Proposta para Lead: ${reservaData.lead?.nome} | Unidade: ${reservaData.unidade?.identificador}`
          );

          const primeiroModelo =
            modelosData.modelos && modelosData.modelos.length > 0
              ? modelosData.modelos[0]
              : null;
          const htmlTemplateInicial = primeiroModelo
            ? primeiroModelo.conteudoHTMLTemplate
            : "<p>Selecione um modelo de contrato.</p>";

          // Atualiza o formData inicial, incluindo o HTML processado
          setFormData((prev) => {
            const dadosParaPreencher = montarDadosParaTemplate(); // Pega os dados atuais para template
            // Atualiza valor da proposta com base na tabela da unidade da reserva
            dadosParaPreencher.proposta_valor_total_formatado = parseFloat(
              reservaData.unidade?.precoTabela || 0
            ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

            return {
              ...prev,
              valorPropostaContrato: reservaData.unidade?.precoTabela || "",
              modeloContratoUtilizado: primeiroModelo ? primeiroModelo._id : "",
              corpoContratoHTMLGerado: preencherTemplateContrato(
                htmlTemplateInicial,
                dadosParaPreencher
              ), // Processa com os dados atuais
            };
          });
        }
      } catch (err) {
        toast.error(
          "Erro ao carregar dados para nova proposta: " +
            (err.error || err.message)
        );
      } finally {
        setLoadingInitialData(false);
      }
    };
    if (reservaId) loadInitialData();
  }, [reservaId, navigate, montarDadosParaTemplate]);

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
    const htmlTemplate = modeloSelecionado ? modeloSelecionado.conteudoHTMLTemplate : '<p>Selecione um modelo de contrato.</p>';
    
    setFormData((prev) => ({
      ...prev,
      modeloContratoUtilizado: modeloId,
      corpoContratoHTMLGerado: preencherTemplateContrato(htmlTemplate, montarDadosParaTemplate()) // Processa com dados atuais
    }));
  };


  useEffect(() => {
    if (formData.modeloContratoUtilizado && modelosContrato.length > 0) {
        const modeloSelecionado = modelosContrato.find(m => m._id === formData.modeloContratoUtilizado);
        if (modeloSelecionado) {
            setFormData(prev => ({
                ...prev,
                corpoContratoHTMLGerado: preencherTemplateContrato(modeloSelecionado.conteudoHTMLTemplate, montarDadosParaTemplate())
            }));
        }
    }
  }, [formData.valorPropostaContrato, formData.valorEntrada, /* outros campos de formData que são placeholders */ montarDadosParaTemplate, formData.modeloContratoUtilizado, modelosContrato]);


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
                // Desabilita se estiver salvando, ou se estiver carregando E AINDA NÃO HÁ USUÁRIOS, ou se não houver usuários após carregar
                disabled={
                  isSaving ||
                  (loadingInitialData && usuariosCRM.length === 0) ||
                  (!loadingInitialData && usuariosCRM.length === 0)
                }
              >
                <option value="">
                  {loadingInitialData
                    ? "Carregando usuários..."
                    : usuariosCRM.length === 0
                    ? "Nenhum usuário CRM encontrado"
                    : "Selecione um responsável..."}
                </option>
                {/* Só tenta mapear se usuariosCRM tiver itens E não estiver carregando */}
                {!loadingInitialData &&
                  usuariosCRM.map((user) => (
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
            <div className="form-section">
              <h3>Conteúdo do Contrato (Baseado no Modelo)</h3>
              {/* ... */}
              <ReactQuill
                theme="snow"
                value={formData.corpoContratoHTMLGerado}
                onChange={handleConteudoHTMLChange}
                modules={quillModules}
                formats={quillFormats}
                readOnly={isSaving}
                style={{
                  minHeight: "400px",
                  backgroundColor: "#fff",
                  marginBottom: "20px",
                }}
              />
            </div>
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
