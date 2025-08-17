import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  createModeloContrato,
  getModeloContratoById,
  updateModeloContrato,
} from "../../../../api/modeloContratoApi";
import "./ModeloContratoFormPage.css";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { CustomToolbar } from "../../../../components/PropostaWizard/CustomToolbar";

const TIPO_DOCUMENTO_OPCOES = [
  "Proposta",
  "Contrato de Reserva",
  "Contrato de Compra e Venda",
  "Outro",
];

const LISTA_PLACEHOLDERS_DISPONIVEIS = [
  {
    grupo: "Empresa Vendedora",
    placeholders: [
      { ph: "{{vendedor_nome_fantasia}}", desc: "Nome Fantasia da Empresa Vendedora (do CRM)" },
      { ph: "{{vendedor_razao_social}}", desc: "Razão Social da Empresa Vendedora" },
      { ph: "{{vendedor_cnpj}}", desc: "CNPJ da Empresa Vendedora" },
      { ph: "{{vendedor_endereco_completo}}", desc: "Endereço Completo da Empresa Vendedora" },
      { ph: "{{vendedor_representante_nome}}", desc: "Nome do Representante Legal da Empresa Vendedora" },
      { ph: "{{vendedor_representante_cpf}}", desc: "CPF do Representante Legal da Empresa Vendedora" },
    ],
  },
  {
    grupo: "Comprador Principal",
    placeholders: [
      { ph: "{{lead_principal_nome}}", desc: "Nome Completo do Comprador Principal" },
      { ph: "{{lead_principal_cpf}}", desc: "CPF do Comprador Principal" },
      { ph: "{{lead_principal_rg}}", desc: "RG do Comprador Principal" },
      { ph: "{{lead_principal_endereco}}", desc: "Endereço do Comprador Principal" },
      { ph: "{{lead_principal_estadoCivil}}", desc: "Estado Civil do Comprador Principal" },
      { ph: "{{lead_principal_profissao}}", desc: "Profissão do Comprador Principal" },
      { ph: "{{lead_principal_nacionalidade}}", desc: "Nacionalidade do Comprador Principal" },
      { ph: "{{lead_principal_email}}", desc: "Email do Comprador Principal" },
      { ph: "{{lead_principal_contato}}", desc: "Telefone do Comprador Principal" },
      { ph: "{{lead_principal_nascimento}}", desc: "Data de Nascimento do Comprador Principal" },
      { ph: "{{clausula_compradores}}", desc: "Compradores principais + coadquirentes se houver" },
    ],
  },
  {
    grupo: "Coadquirentes",
    placeholders: [
      { ph: "{{coadquirente1_nome}}", desc: "Nome do Coadquirente 1" },
      { ph: "{{coadquirente1_cpf}}", desc: "CPF do Coadquirente 1" },
      { ph: "{{coadquirente1_rg}}", desc: "RG do Coadquirente 1" },
      { ph: "{{coadquirente1_endereco}}", desc: "Endereço do Coadquirente 1" },
      { ph: "{{coadquirente1_estadoCivil}}", desc: "Estado Civil do Coadquirente 1" },
      { ph: "{{coadquirente1_profissao}}", desc: "Profissão do Coadquirente 1" },
      { ph: "{{coadquirente1_nacionalidade}}", desc: "Nacionalidade do Coadquirente 1" },
      { ph: "{{coadquirente1_email}}", desc: "Email do Coadquirente 1" },
      { ph: "{{coadquirente1_contato}}", desc: "Telefone do Coadquirente 1" },
      { ph: "{{coadquirente1_nascimento}}", desc: "Data de Nascimento do Coadquirente 1" },
      { ph: "{{bloco_html_coadquirentes}}", desc: "Bloco HTML resumido com nomes/CPFs dos coadquirentes" },
      { ph: "{{bloco_assinaturas_compradores}}", desc: "Bloco HTML com assinatura de todos os compradores" },
    ],
  },
  {
    grupo: "Imóvel / Empreendimento",
    placeholders: [
      { ph: "{{imovel_descricao}}", desc: "Descrição do Imóvel" },
      { ph: "{{imovel_identificador}}", desc: "Identificador do Imóvel (ex: AP303)" },
      { ph: "{{empreendimento_nome}}", desc: "Nome do Empreendimento" },
      { ph: "{{imovel_endereco_completo}}", desc: "Endereço do Imóvel" },
      { ph: "{{unidade_matricula}}", desc: "Matrícula do Imóvel (se aplicável)" },
      { ph: "{{unidade_memorial_incorporacao}}", desc: "Memorial de Incorporação (se aplicável)" },
    ],
  },
  {
    grupo: "Proposta e Pagamento",
    placeholders: [
      { ph: "{{proposta_valor_total_formatado}}", desc: "Valor Total da Proposta" },
      { ph: "{{proposta_valor_entrada_formatado}}", desc: "Valor de Entrada" },
      { ph: "{{proposta_condicoes_pagamento_gerais}}", desc: "Texto das Condições de Pagamento" },
      { ph: "{{plano_pagamento_string_formatada}}", desc: "Descrição formatada do plano de pagamento" },
    ],
  },
  {
    grupo: "Corretagem",
    placeholders: [
      { ph: "{{corretagem_valor_formatado}}", desc: "Valor da Corretagem" },
      { ph: "{{corretagem_condicoes}}", desc: "Condições da Corretagem" },
      { ph: "{{corretor_principal_nome}}", desc: "Nome do Corretor Principal" },
      { ph: "{{corretor_principal_cpf_cnpj}}", desc: "CPF/CNPJ do Corretor" },
      { ph: "{{corretor_principal_creci}}", desc: "CRECI do Corretor" },
    ],
  },
  {
    grupo: "Outros",
    placeholders: [
      { ph: "{{data_proposta_extenso}}", desc: "Data da Proposta (por extenso)" },
      { ph: "{{cidade_contrato}}", desc: "Cidade de Assinatura do Contrato" },
    ],
  },
];

const modules = {
  toolbar: {
    container: "#toolbar",
    handlers: {
      placeholder: function () {
        const cursor = this.quill.getSelection();
        if (cursor) this.quill.insertText(cursor.index, "{{placeholder}}");
      },
      html: function () {
        const container = document.querySelector(".ql-editor");
        const html = container?.innerHTML || "";
        alert("HTML atual:\n\n" + html);
      },
    },
  },
};

const formats = [
  "header",
  "font",
  "size",
  "bold",
  "italic",
  "underline",
  "strike",
  "clean",
  "list",
  "bullet",
  "indent",
  "align",
  "blockquote",
  "code-block",
  "color",
  "background",
  "link",
  "video",
  "image",
];

function ModeloContratoFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    nomeModelo: "",
    tipoDocumento: TIPO_DOCUMENTO_OPCOES[0],
    conteudoHTMLTemplate: "<h1>Título do Contrato</h1><p>Olá {{lead_principal_nome}}</p>",
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [activeTab, setActiveTab] = useState("editor");

  useEffect(() => {
    if (isEditMode && id) {
      setLoading(true);
      getModeloContratoById(id)
        .then((data) => {
          setFormData({
            nomeModelo: data.nomeModelo || "",
            tipoDocumento: data.tipoDocumento || TIPO_DOCUMENTO_OPCOES[0],
            conteudoHTMLTemplate: data.conteudoHTMLTemplate || "",
          });
        })
        .catch((err) => {
          toast.error("Erro ao carregar modelo: " + (err.error || err.message));
          navigate("/admin/modelos-contrato");
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const copyPlaceholder = async (text) => {
    try {
      await navigator.clipboard?.writeText(text);
      toast.success(`Copiado: ${text}`);
    } catch {
      toast.info(text);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormError("");

    const currentHtmlContent = formData.conteudoHTMLTemplate;

    if (!formData.nomeModelo || !formData.tipoDocumento || !currentHtmlContent) {
      setFormError("Nome, Tipo e Conteúdo HTML são obrigatórios.");
      setLoading(false);
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    const dataToSubmit = {
      nomeModelo: formData.nomeModelo,
      tipoDocumento: formData.tipoDocumento,
      conteudoHTMLTemplate: currentHtmlContent,
    };

    try {
      if (isEditMode) {
        await updateModeloContrato(id, dataToSubmit);
        toast.success("Modelo de contrato atualizado!");
      } else {
        await createModeloContrato(dataToSubmit);
        toast.success("Modelo de contrato criado!");
      }
      navigate("/admin/modelos-contrato");
    } catch (err) {
      const errMsg = err.error || err.message || "Erro ao salvar modelo.";
      setFormError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode && !formData.nomeModelo) {
    return (
      <div className="mcf-page">
        <div className="mcf-page-inner">
          <p>Carregando modelo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mcf-page">
      <div className="mcf-page-inner">
        <header className="mcf-header">
          <h1>{isEditMode ? `Editar Modelo: ${formData.nomeModelo}` : "Novo Modelo de Contrato"}</h1>
        </header>

        <form onSubmit={handleSubmit} className="mcf-form" noValidate>
          {formError && <p className="mcf-error-message">{formError}</p>}

          <div className="mcf-grid-2">
            <div className="mcf-form-group">
              <label htmlFor="nomeModelo">Nome do Modelo*</label>
              <input
                id="nomeModelo"
                name="nomeModelo"
                type="text"
                value={formData.nomeModelo}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="mcf-form-group">
              <label htmlFor="tipoDocumento">Tipo de Documento*</label>
              <select
                id="tipoDocumento"
                name="tipoDocumento"
                value={formData.tipoDocumento}
                onChange={handleChange}
                required
                disabled={loading}
              >
                {TIPO_DOCUMENTO_OPCOES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="mcf-tabs">
            <button
              type="button"
              onClick={() => setActiveTab("editor")}
              className={`mcf-tab ${activeTab === "editor" ? "active" : ""}`}
              disabled={loading}
            >
              Editor Visual
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("source")}
              className={`mcf-tab ${activeTab === "source" ? "active" : ""}`}
              disabled={loading}
            >
              Código Fonte
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`mcf-tab ${activeTab === "preview" ? "active" : ""}`}
              disabled={loading}
            >
              Pré-visualização
            </button>
          </div>

          {activeTab === "editor" && (
            <div className="mcf-form-group">
              <label>Editor Visual (ReactQuill)</label>
              <CustomToolbar />
              <ReactQuill
                value={formData.conteudoHTMLTemplate}
                onChange={(value) => setFormData((prev) => ({ ...prev, conteudoHTMLTemplate: value }))}
                modules={modules}
                formats={formats}
                placeholder="Digite o conteúdo do contrato..."
                className="mcf-quill"
              />
            </div>
          )}

          {activeTab === "source" && (
            <div className="mcf-form-group">
              <label htmlFor="htmlFonte">Código HTML (Fonte)</label>
              <textarea
                id="htmlFonte"
                className="mcf-codearea"
                value={formData.conteudoHTMLTemplate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, conteudoHTMLTemplate: e.target.value }))
                }
              />
            </div>
          )}

          {activeTab === "preview" && (
            <div className="mcf-form-group">
              <label>Pré-visualização do HTML:</label>
              <div
                className="mcf-preview"
                dangerouslySetInnerHTML={{ __html: formData.conteudoHTMLTemplate }}
              />
            </div>
          )}

          <div className="mcf-actions">
            <button type="submit" className="mcf-btn-primary" disabled={loading}>
              {loading ? (isEditMode ? "Atualizando..." : "Salvando...") : "Salvar Modelo"}
            </button>
            <button
              type="button"
              className="mcf-btn-outline"
              onClick={() => navigate("/admin/modelos-contrato")}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>

          <section className="mcf-section">
            <h3>Placeholders Disponíveis para o Template</h3>
            {LISTA_PLACEHOLDERS_DISPONIVEIS.map((grupo, idx) => (
              <div key={idx} className="mcf-ph-group">
                <strong className="mcf-ph-title">{grupo.grupo}</strong>
                <ul className="mcf-ph-list">
                  {grupo.placeholders.map((item) => (
                    <li key={item.ph} className="mcf-ph-item">
                      <button
                        type="button"
                        className="mcf-ph-badge"
                        onClick={() => copyPlaceholder(item.ph)}
                        title="Clique para copiar"
                      >
                        {item.ph}
                      </button>
                      <span className="mcf-ph-desc">{item.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </form>
      </div>
    </div>
  );
}

export default ModeloContratoFormPage;
