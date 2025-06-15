import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";

import {
  getReservaByIdApi, // Você precisará criar esta função na sua API de Proposta/Reserva
  createPropostaContratoApi,
  getPropostaContratoByIdApi,
  updatePropostaContratoApi
} from "../../../api/propostaContratoApi";
import { getModelosContrato } from "../../../api/modeloContratoApi";
import { getUsuarios } from "../../../api/users";
import { getBrokerContacts } from "../../../api/brokerContacts";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import "./PropostaContratoFormPage.css";

// Constantes de Opções para Selects
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
  "Vendido", // Usaremos este para o status final de venda
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

// Configurações do Editor ReactQuill
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
    ["link"], // Removido 'image' e 'video' para simplificar, adicione se precisar
    ["clean"],
  ],
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
  "align",
  "color",
  "background",
];

// Função Auxiliar para Substituir Placeholders
const preencherTemplateContrato = (templateHtml, dados) => {
  if (typeof templateHtml !== "string") return "<p></p>"; // Retorna um HTML vazio se não for string
  let corpoProcessado = templateHtml;
  if (dados && typeof dados === "object") {
    for (const key in dados) {
      const placeholder = `{{${key}}}`;
      // Regex global para substituir todas as ocorrências do placeholder
      corpoProcessado = corpoProcessado.replace(
        new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "g"),
        dados[key] !== null && dados[key] !== undefined ? dados[key] : "" // Substitui por valor ou string vazia
      );
    }
  }
  return corpoProcessado;
};

function PropostaContratoFormPage() {
  const { reservaId, propostaContratoId } = useParams();
  const navigate = useNavigate();

   const isEditMode = Boolean(propostaContratoId);

  const [reservaBase, setReservaBase] = useState(null);
  const [modelosContrato, setModelosContrato] = useState([]);
  const [usuariosCRM, setUsuariosCRM] = useState([]);

  const [brokerContactsList, setBrokerContactsList] = useState([]);

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
      "<p>Selecione um modelo de contrato e preencha os dados da proposta para gerar o conteúdo.</p>",
    responsavelNegociacao: "",
    observacoesInternasProposta: "",
    statusPropostaContrato: STATUS_PROPOSTA_OPCOES[0],
    dataProposta: new Date().toISOString().split("T")[0],
  });

  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [pageTitle, setPageTitle] = useState("Nova Proposta/Contrato");

  const montarDadosParaTemplate = useCallback(
    (currentFormData, currentReservaBase) => {
      if (!currentReservaBase) return {};

      const formatDateForDisplay = (dateString) => {
        if (!dateString) return "PENDENTE";
        // Adiciona T00:00:00 para garantir que a data seja interpretada no fuso local e não UTC, evitando problemas de "um dia a menos"
        return new Date(dateString + "T00:00:00").toLocaleDateString("pt-BR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      };

      const formatCurrency = (value) => {
        const number = parseFloat(value);
        if (isNaN(number)) return "R$ 0,00";
        return number.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
      };

      return {
        // Dados do Vendedor (Empresa do CRM)
        vendedor_nome_fantasia:
          currentReservaBase.company?.nome || "[Nome Fantasia Vendedor]",
        vendedor_razao_social:
          currentReservaBase.company?.razaoSocial ||
          currentReservaBase.company?.nome ||
          "[Razão Social Vendedor]",
        vendedor_cnpj: currentReservaBase.company?.cnpj || "[CNPJ Vendedor]",
        vendedor_endereco_completo: `${
          currentReservaBase.company?.endereco?.logradouro ||
          "[Logradouro Vendedor]"
        }, ${currentReservaBase.company?.endereco?.numero || "[Nº]"} - ${
          currentReservaBase.company?.endereco?.bairro || "[Bairro]"
        }, ${currentReservaBase.company?.endereco?.cidade || "[Cidade]"}/${
          currentReservaBase.company?.endereco?.uf || "[UF]"
        } - CEP: ${currentReservaBase.company?.endereco?.cep || "[CEP]"}`,
        vendedor_representante_nome:
          currentReservaBase.company?.representanteLegalNome ||
          "[Nome Representante Vendedor]",
        vendedor_representante_cpf:
          currentReservaBase.company?.representanteLegalCPF ||
          "[CPF Representante Vendedor]",

        // Dados do Comprador (Lead)
        lead_nome: currentReservaBase.lead?.nome || "[Nome Lead]",
        lead_cpf: currentReservaBase.lead?.cpf || "[CPF Lead]",
        lead_rg: currentReservaBase.lead?.rg || "[RG Lead]",
        lead_endereco_completo:
          currentReservaBase.lead?.endereco || "[Endereço Lead]",
        lead_estado_civil:
          currentReservaBase.lead?.estadoCivil || "[Estado Civil Lead]",
        lead_profissao:
          currentReservaBase.lead?.profissao || "[Profissão Lead]",
        lead_nacionalidade:
          currentReservaBase.lead?.nacionalidade || "Brasileiro(a)",
        lead_email: currentReservaBase.lead?.email || "[Email Lead]",
        lead_telefone: currentReservaBase.lead?.contato || "[Telefone Lead]",

        // Dados do Imóvel
        empreendimento_nome:
          currentReservaBase.empreendimento?.nome || "[Nome Empreendimento]",
        unidade_identificador:
          currentReservaBase.unidade?.identificador ||
          "[Identificador Unidade]",
        unidade_tipologia:
          currentReservaBase.unidade?.tipologia || "[Tipologia Unidade]",
        unidade_area_privativa: currentReservaBase.unidade?.areaUtil
          ? `${currentReservaBase.unidade.areaUtil}m²`
          : "[Área Unidade]",
        empreendimento_endereco_completo: `${
          currentReservaBase.empreendimento?.localizacao?.logradouro ||
          "[Logradouro Emp.]"
        }, ${
          currentReservaBase.empreendimento?.localizacao?.numero || "[Nº]"
        } - ${
          currentReservaBase.empreendimento?.localizacao?.bairro ||
          "[Bairro Emp.]"
        }, ${
          currentReservaBase.empreendimento?.localizacao?.cidade ||
          "[Cidade Emp.]"
        }/${currentReservaBase.empreendimento?.localizacao?.uf || "[UF Emp.]"}`,
        unidade_memorial_incorporacao:
          currentReservaBase.empreendimento?.memorialIncorporacao ||
          "[Memorial Incorporação]",
        unidade_matricula:
          currentReservaBase.unidade?.matriculaImovel || "[Matrícula Unidade]",

        // Dados da Transação (do formulário atual)
        proposta_valor_total_formatado: formatCurrency(
          currentFormData.valorPropostaContrato ||
            currentReservaBase.unidade?.precoTabela
        ),
        proposta_valor_entrada_formatado: currentFormData.valorEntrada
          ? formatCurrency(currentFormData.valorEntrada)
          : "N/A",
        proposta_condicoes_pagamento_gerais:
          currentFormData.condicoesPagamentoGerais ||
          "[Condições Gerais de Pagamento]",

        data_proposta_extenso: formatDateForDisplay(
          currentFormData.dataProposta
        ),
        cidade_contrato:
          currentReservaBase.company?.endereco?.cidade ||
          "[Cidade do Contrato]",

        // TODO: Formatar planoDePagamento e corretagem para strings/HTML para o template
        plano_pagamento_string_formatada: (
          currentFormData.planoDePagamento || []
        )
          .map(
            (p) =>
              `${p.quantidade || 1}x ${p.tipoParcela} de ${formatCurrency(
                p.valorUnitario
              )} (1º Venc: ${formatDateForDisplay(p.vencimentoPrimeira)}) ${
                p.observacao || ""
              }`
          )
          .join("<br>"), // Usar <br> para quebras de linha no HTML

        corretagem_valor_formatado: currentFormData.corretagem?.valorCorretagem
          ? formatCurrency(currentFormData.corretagem.valorCorretagem)
          : "N/A",
        corretagem_condicoes:
          currentFormData.corretagem?.condicoesPagamentoCorretagem ||
          "[Condições Corretagem]",
        // Adicionar mais placeholders de corretor se for buscar o BrokerContact
      };
    },
    []
  ); // Vazio para ser estável, recebe dados como argumentos

   useEffect(() => {
    const loadInitialData = async () => {
      setLoadingInitialData(true);
      try {
        let currentReservaBase = null;
        let currentPropostaData = null;

        if (isEditMode && propostaContratoId) {
          setPageTitle("Carregando Proposta...");
          currentPropostaData = await getPropostaContratoByIdApi(propostaContratoId);
          if (!currentPropostaData) throw new Error("Proposta/Contrato não encontrada.");

          // Se está editando, a reserva base já está vinculada à proposta
          // O getPropostaContratoByIdApi já deve popular lead, unidade, empreendimento, company
          currentReservaBase = { 
            lead: currentPropostaData.lead,
            unidade: currentPropostaData.unidade,
            empreendimento: currentPropostaData.empreendimento,
            company: currentPropostaData.company,
            // Adicione outros campos da reserva se forem necessários para montarDadosParaTemplate
          };
          setReservaBase(currentReservaBase); // Para a função montarDadosParaTemplate
          setPageTitle(`Editar Proposta/Contrato (Lead: ${currentPropostaData.lead?.nome})`);

        } else if (reservaId) { // Modo Criação a partir de uma reserva
          setPageTitle("Carregando dados da Reserva...");
          currentReservaBase = await getReservaByIdApi(reservaId);
          if (!currentReservaBase) throw new Error("Reserva base não encontrada.");
          setReservaBase(currentReservaBase);
          setPageTitle(`Nova Proposta (Lead: ${currentReservaBase.lead?.nome} | Unidade: ${currentReservaBase.unidade?.identificador})`);
        } else {
          toast.error("ID da Reserva ou da Proposta/Contrato não fornecido.");
          navigate('/reservas');
          return;
        }

        const [modelosData, usuariosDataResult, brokerContactsResult] = await Promise.all([
          getModelosContrato(),
          getUsuarios({ ativo: true }),
          getBrokerContacts({ativo: true}),
        ]);
        setModelosContrato(modelosData.modelos || []);
        setUsuariosCRM(usuariosDataResult || []);
        setBrokerContactsList(brokerContactsResult || []);

        if (isEditMode && currentPropostaData) {
            // Preenche o formData com os dados da proposta existente
            setFormData({
                modeloContratoUtilizado: currentPropostaData.modeloContratoUtilizado?._id || currentPropostaData.modeloContratoUtilizado || "",
                valorPropostaContrato: currentPropostaData.valorPropostaContrato || "",
                valorEntrada: currentPropostaData.valorEntrada || "",
                condicoesPagamentoGerais: currentPropostaData.condicoesPagamentoGerais || "",
                dadosBancariosParaPagamento: currentPropostaData.dadosBancariosParaPagamento || { bancoNome: "", agencia: "", contaCorrente: "", cnpjPagamento: "", pix: "" },
                planoDePagamento: currentPropostaData.planoDePagamento && currentPropostaData.planoDePagamento.length > 0 
                                  ? currentPropostaData.planoDePagamento.map(p => ({...p, vencimentoPrimeira: p.vencimentoPrimeira ? new Date(p.vencimentoPrimeira).toISOString().split('T')[0] : ''})) 
                                  : [{ tipoParcela: TIPO_PARCELA_OPCOES[0], quantidade: 1, valorUnitario: "", vencimentoPrimeira: "", observacao: "" }],
                corretagem: currentPropostaData.corretagem || { valorCorretagem: "", corretorPrincipal: "", condicoesPagamentoCorretagem: "", observacoesCorretagem: "" },
                corpoContratoHTMLGerado: currentPropostaData.corpoContratoHTMLGerado || "",
                responsavelNegociacao: currentPropostaData.responsavelNegociacao?._id || currentPropostaData.responsavelNegociacao || "",
                observacoesInternasProposta: currentPropostaData.observacoesInternasProposta || "",
                statusPropostaContrato: currentPropostaData.statusPropostaContrato || STATUS_PROPOSTA_OPCOES[0],
                dataProposta: currentPropostaData.dataProposta ? new Date(currentPropostaData.dataProposta).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                // Campos snapshot e de vínculo não são editáveis aqui, são definidos na criação
            });
        } else if (!isEditMode && currentReservaBase) { // Modo Criação
            const primeiroModelo = (modelosData.modelos && modelosData.modelos.length > 0) ? modelosData.modelos[0] : null;
            const htmlTemplateInicial = primeiroModelo ? primeiroModelo.conteudoHTMLTemplate : "<p>Selecione um modelo de contrato.</p>";

            const initialLocalFormData = {
                valorPropostaContrato: currentReservaBase.unidade?.precoTabela || "",
                dataProposta: new Date().toISOString().split("T")[0],
                // ... outros campos do formData que dependem de currentReservaBase para o template
            };

            setFormData(prev => ({
                ...prev, // Mantém defaults como statusPropostaContrato
                valorPropostaContrato: initialLocalFormData.valorPropostaContrato,
                modeloContratoUtilizado: primeiroModelo ? primeiroModelo._id : "",
                corpoContratoHTMLGerado: preencherTemplateContrato(
                    htmlTemplateInicial,
                    montarDadosParaTemplate(initialLocalFormData, currentReservaBase)
                )
            }));
        }

      } catch (err) {
        toast.error(`Erro ao carregar dados: ${err.error || err.message}`);
      } finally {
        setLoadingInitialData(false);
      }
    };
    loadInitialData();
}, [reservaId, propostaContratoId, isEditMode, navigate, montarDadosParaTemplate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newState = { ...prev, [name]: value };
      // Se um campo que afeta o template mudou, reprocessa o HTML
      if (
        name === "valorPropostaContrato" ||
        name === "valorEntrada" ||
        name === "condicoesPagamentoGerais" ||
        name === "dataProposta"
      ) {
        const modeloSelecionado = modelosContrato.find(
          (m) => m._id === newState.modeloContratoUtilizado
        );
        if (modeloSelecionado && reservaBase) {
          newState.corpoContratoHTMLGerado = preencherTemplateContrato(
            modeloSelecionado.conteudoHTMLTemplate,
            montarDadosParaTemplate(newState, reservaBase)
          );
        }
      }
      return newState;
    });
  };

  const handleConteudoHTMLChange = (html) => {
    setFormData((prev) => ({ ...prev, corpoContratoHTMLGerado: html }));
  };

  const handleModeloChange = (e) => {
    const modeloId = e.target.value;
    const modeloSelecionado = modelosContrato.find((m) => m._id === modeloId);
    const htmlTemplate = modeloSelecionado
      ? modeloSelecionado.conteudoHTMLTemplate
      : "<p>Selecione um modelo de contrato.</p>";

    setFormData((prev) => {
      const newState = {
        ...prev,
        modeloContratoUtilizado: modeloId,
      };
      newState.corpoContratoHTMLGerado = preencherTemplateContrato(
        htmlTemplate,
        montarDadosParaTemplate(newState, reservaBase)
      );
      return newState;
    });
  };

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
      "Modelo, Valor da Proposta e Responsável pela Negociação são obrigatórios."
    );
    setIsSaving(false);
    return;
  }

  const dataToSubmit = {
    modeloContratoUtilizado: formData.modeloContratoUtilizado,
    valorPropostaContrato: parseFloat(formData.valorPropostaContrato) || 0,
    valorEntrada: formData.valorEntrada
      ? parseFloat(formData.valorEntrada)
      : undefined,
    condicoesPagamentoGerais: formData.condicoesPagamentoGerais,
    dadosBancariosParaPagamento: formData.dadosBancariosParaPagamento,
    planoDePagamento: formData.planoDePagamento
      .map((p) => ({
        tipoParcela: p.tipoParcela,
        quantidade: Number(p.quantidade) || 1,
        valorUnitario: Number(p.valorUnitario) || 0,
        vencimentoPrimeira: p.vencimentoPrimeira,
        observacao: p.observacao || "",
      }))
      .filter((p) => p.valorUnitario > 0 && p.vencimentoPrimeira),
    corretagem: formData.corretagem?.valorCorretagem
      ? {
          ...formData.corretagem,
          valorCorretagem: Number(formData.corretagem.valorCorretagem) || 0,
        }
      : undefined,
    corpoContratoHTMLGerado: formData.corpoContratoHTMLGerado,
    responsavelNegociacao: formData.responsavelNegociacao,
    observacoesInternasProposta: formData.observacoesInternasProposta,
    statusPropostaContrato: formData.statusPropostaContrato,
    dataProposta: formData.dataProposta,
  };

  delete dataToSubmit.precoTabelaUnidadeNoMomento;

  try {
    if (isEditMode) {
      await updatePropostaContratoApi(propostaContratoId, dataToSubmit);
      toast.success("Proposta/Contrato atualizada com sucesso!");
      navigate(`/propostas-contratos/${propostaContratoId}`);
    } else {
      await createPropostaContratoApi(reservaId, dataToSubmit);
      toast.success("Proposta/Contrato criada com sucesso!");
      navigate(`/reservas`);
    }
  } catch (err) {
    const errMsg =
      err.error || err.message || "Erro ao salvar Proposta/Contrato.";
    setFormError(errMsg);
    toast.error(errMsg);
  } finally {
    setIsSaving(false);
  }
};


  const handlePlanoDePagamentoChange = (index, event) => {
    const { name, value, type } = event.target;
    const list = [...formData.planoDePagamento];

    // Converte para número se for quantidade ou valorUnitario
    let processedValue = value;
    if (name === "quantidade" || name === "valorUnitario") {
      processedValue = value === "" ? "" : Number(value); // Permite limpar o campo, converte para número se houver valor
    }

    list[index][name] = processedValue;
    setFormData((prev) => ({ ...prev, planoDePagamento: list }));
  };

  const handleAddParcela = () => {
    setFormData((prev) => ({
      ...prev,
      planoDePagamento: [
        ...prev.planoDePagamento,
        {
          tipoParcela: TIPO_PARCELA_OPCOES[1], // Default para "PARCELA MENSAL"
          quantidade: 1,
          valorUnitario: "",
          vencimentoPrimeira: "",
          observacao: "",
        },
      ],
    }));
  };

  const handleRemoveParcela = (index) => {
    if (formData.planoDePagamento.length <= 1) {
      // Não permite remover a última parcela
      toast.warn("É necessário pelo menos uma entrada no plano de pagamento.");
      return;
    }
    const list = [...formData.planoDePagamento];
    list.splice(index, 1);
    setFormData((prev) => ({ ...prev, planoDePagamento: list }));
  };

  const handleCorretagemChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      corretagem: {
        ...prev.corretagem,
        [name]: value,
      },
    }));
  };

  // Atualiza o preview do contrato se dados relevantes do formulário ou o modelo mudarem
  useEffect(() => {
      if (!isEditMode && formData.modeloContratoUtilizado && modelosContrato.length > 0 && reservaBase) { // Só reprocessa no modo CRIAR ou se o modelo mudar
          const modeloSelecionado = modelosContrato.find(m => m._id === formData.modeloContratoUtilizado);
          if (modeloSelecionado) {
              const htmlProcessado = preencherTemplateContrato(modeloSelecionado.conteudoHTMLTemplate, montarDadosParaTemplate(formData, reservaBase));
              if (htmlProcessado !== formData.corpoContratoHTMLGerado) {
                  setFormData(prev => ({ ...prev, corpoContratoHTMLGerado: htmlProcessado }));
              }
          }
      }
  }, [
      formData.valorPropostaContrato, formData.valorEntrada, formData.condicoesPagamentoGerais, formData.dataProposta,
      formData.modeloContratoUtilizado, // Adicionado para reprocessar se o modelo mudar
      modelosContrato, reservaBase, isEditMode, montarDadosParaTemplate
      // Removido formData.corpoContratoHTMLGerado da dependência para evitar loop com o ReactQuill
  ]);




  // Renderização
  if (loadingInitialData) {
    return (
      <div className="admin-page loading">
        <p>Carregando dados...</p>
      </div>
    );
  }

  if (!reservaBase && !loadingInitialData) {
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
        {reservaBase && (
          <p style={{ fontSize: "0.9em", color: "#555" }}>
            Lead: <strong>{reservaBase.lead?.nome}</strong> | Unidade:{" "}
            <strong>{reservaBase.unidade?.identificador}</strong> (
            {reservaBase.empreendimento?.nome})
          </p>
        )}
      </header>
      <div className="page-content">
        <form onSubmit={handleSubmit} className="form-container">
          {formError && <p className="error-message">{formError}</p>}

          <div className="form-section">
            <h3>Dados da Proposta/Contrato</h3>
            {/* Select Modelo de Contrato */}
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
                    : "Selecione..."}
                </option>
                {modelosContrato.map((mod) => (
                  <option key={mod._id} value={mod._id}>
                    {mod.nomeModelo}
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
                disabled={
                  isSaving || usuariosCRM.length === 0 || loadingInitialData
                }
              >
                <option value="">
                  {loadingInitialData
                    ? "Carregando..."
                    : usuariosCRM.length === 0
                    ? "Nenhum usuário"
                    : "Selecione..."}
                </option>
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

          {/* Seção para corretores*/}
          <div className="form-section">
            <h3>Detalhes da Corretagem</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="corretorPrincipal">Corretor Principal</label>
                <select
                  id="corretorPrincipal"
                  name="corretorPrincipal" // Este 'name' será usado no handleCorretagemChange
                  value={formData.corretagem.corretorPrincipal}
                  onChange={handleCorretagemChange}
                  disabled={isSaving || brokerContactsList.length === 0}
                >
                  <option value="">
                    {brokerContactsList.length === 0
                      ? "Nenhum corretor cadastrado"
                      : "Selecione um corretor..."}
                  </option>
                  {brokerContactsList.map((broker) => (
                    <option key={broker._id} value={broker._id}>
                      {broker.nome} ({broker.creci || "Sem CRECI"})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="valorCorretagem">
                  Valor da Corretagem (R$)
                </label>
                <input
                  type="number"
                  id="valorCorretagem"
                  name="valorCorretagem" // Usado no handleCorretagemChange
                  value={formData.corretagem.valorCorretagem}
                  onChange={handleCorretagemChange}
                  step="0.01"
                  min="0"
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="form-group full-width">
              <label htmlFor="condicoesPagamentoCorretagem">
                Condições de Pagamento da Corretagem
              </label>
              <textarea
                id="condicoesPagamentoCorretagem"
                name="condicoesPagamentoCorretagem" // Usado no handleCorretagemChange
                value={formData.corretagem.condicoesPagamentoCorretagem}
                onChange={handleCorretagemChange}
                rows="2"
                disabled={isSaving}
              ></textarea>
            </div>
            <div className="form-group full-width">
              <label htmlFor="observacoesCorretagem">
                Observações da Corretagem
              </label>
              <textarea
                id="observacoesCorretagem"
                name="observacoesCorretagem" // Usado no handleCorretagemChange
                value={formData.corretagem.observacoesCorretagem}
                onChange={handleCorretagemChange}
                rows="2"
                disabled={isSaving}
              ></textarea>
            </div>
          </div>

          {/* Plano de Pagamento Detalhado */}
          <div className="form-group">
            {" "}
            {/* Envolve a seção do plano de pagamento */}
            <label
              style={{
                marginBottom: "10px",
                display: "block",
                fontWeight: "600",
              }}
            >
              Plano de Pagamento Detalhado*
            </label>
            {formData.planoDePagamento.map((parcela, index) => (
              <div
                key={index}
                className="parcela-item-row"
                style={{
                  marginBottom: "15px",
                  paddingBottom: "15px",
                  borderBottom: "1px dashed #eee",
                }}
              >
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={`tipoParcela-${index}`}>
                      Tipo da Parcela
                    </label>
                    <select
                      name="tipoParcela"
                      id={`tipoParcela-${index}`}
                      value={parcela.tipoParcela}
                      onChange={(e) => handlePlanoDePagamentoChange(index, e)}
                      disabled={isSaving}
                      required
                    >
                      {TIPO_PARCELA_OPCOES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor={`quantidade-${index}`}>Quantidade</label>
                    <input
                      type="number"
                      name="quantidade"
                      id={`quantidade-${index}`}
                      value={parcela.quantidade}
                      onChange={(e) => handlePlanoDePagamentoChange(index, e)}
                      min="1"
                      disabled={isSaving}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={`valorUnitario-${index}`}>
                      Valor Unitário (R$)
                    </label>
                    <input
                      type="number"
                      name="valorUnitario"
                      id={`valorUnitario-${index}`}
                      value={parcela.valorUnitario}
                      onChange={(e) => handlePlanoDePagamentoChange(index, e)}
                      step="0.01"
                      min="0"
                      disabled={isSaving}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={`vencimentoPrimeira-${index}`}>
                      1º Vencimento
                    </label>
                    <input
                      type="date"
                      name="vencimentoPrimeira"
                      id={`vencimentoPrimeira-${index}`}
                      value={parcela.vencimentoPrimeira}
                      onChange={(e) => handlePlanoDePagamentoChange(index, e)}
                      disabled={isSaving}
                      required
                    />
                  </div>
                </div>
                <div className="form-group full-width">
                  <label htmlFor={`observacaoParcela-${index}`}>
                    Observação da Parcela
                  </label>
                  <input
                    type="text"
                    name="observacao"
                    id={`observacaoParcela-${index}`}
                    value={parcela.observacao}
                    onChange={(e) => handlePlanoDePagamentoChange(index, e)}
                    disabled={isSaving}
                  />
                </div>
                {formData.planoDePagamento.length > 1 && ( // Só mostra botão de remover se houver mais de uma parcela
                  <button
                    type="button"
                    onClick={() => handleRemoveParcela(index)}
                    className="button-link delete-link" // Use um estilo de link ou botão pequeno
                    disabled={isSaving}
                    style={{ marginTop: "5px", alignSelf: "flex-start" }}
                  >
                    Remover Parcela
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddParcela}
              className="button outline-button" // Um estilo de botão para adicionar
              disabled={isSaving}
              style={{ marginTop: "10px" }}
            >
              + Adicionar Parcela/Entrada
            </button>
          </div>

          {/* Conteúdo do Contrato com ReactQuill */}
          <div className="form-section">
            <h3>Conteúdo do Contrato</h3>
            <p>
              <small>
                O conteúdo abaixo é pré-preenchido com o modelo e dados. Você
                pode editá-lo.
              </small>
            </p>
            <div className="quill-editor-container">
              <ReactQuill
                theme="snow"
                value={formData.corpoContratoHTMLGerado}
                onChange={handleConteudoHTMLChange}
                modules={quillModules}
                formats={quillFormats}
                readOnly={isSaving}
                style={{ minHeight: "400px" }}
              />
            </div>
          </div>

          {/* Observações Internas */}
          <div className="form-group" style={{ marginTop: "20px" }}>
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
              onClick={() => navigate(`/reservas/${reservaId}`)}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
                type="submit"
                className="button submit-button"
                disabled={isSaving || loadingInitialData}
            >
                {isSaving 
                    ? (isEditMode ? 'Atualizando...' : 'Salvando...') 
                    : (isEditMode ? 'Salvar Alterações' : 'Criar Proposta/Contrato')
                }
          </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default PropostaContratoFormPage;
