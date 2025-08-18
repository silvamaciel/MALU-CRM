// src/pages/LeadForm/LeadFormPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";

// APIs
import { createLead, getLeadById, updateLead } from "../../api/leads";
import { getLeadStages } from "../../api/leadStages";
import { getOrigens } from "../../api/origens";
import { getUsuarios } from "../../api/users";

// UI / CSS
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "./LeadFormPage.css";

// -----------------------
// Constantes e estado inicial
// -----------------------
const ESTADO_CIVIL_OPCOES = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União Estável", "Outro"];
const APROVACAO_OPCOES = ["Aprovado", "Pendente", "Rejeitado"];

const initialState = {
  // Dados do Lead (modelo principal)
  nome: "",
  contato: "",
  email: "",
  cpf: "",
  rg: "",
  nacionalidade: "Brasileiro(a)",
  estadoCivil: "",
  profissao: "",
  nascimento: "",
  endereco: "",

  // Coadquirentes
  coadquirentes: [],

  // Admin / metadados
  situacao: "",
  origem: "",
  responsavel: "",
  comentario: "",
  approvalStatus: "Aprovado",
  submittedByBroker: "",
  corretorResponsavel: "",

  // Campo de UI para tags (texto) -> vira array no submit
  tagsString: "",
};

function LeadFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  // Estado principal
  const [formData, setFormData] = useState(initialState);
  const [initialData, setInitialData] = useState(null);

  // Opções selects
  const [situacoesList, setSituacoesList] = useState([]);
  const [origensList, setOrigensList] = useState([]);
  const [usuariosList, setUsuariosList] = useState([]);

  // Loading/erros
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(isEditMode);
  const [isProcessing, setIsProcessing] = useState(false);
  const [optionsError, setOptionsError] = useState(null);

  // -----------------------
  // Fetch das opções
  // -----------------------
  useEffect(() => {
    const fetchOptions = async () => {
      if (!isEditMode) setLoadingOptions(true);
      setOptionsError(null);
      try {
        const [situacoes, origens, usuarios] = await Promise.all([
          getLeadStages(),
          getOrigens(),
          getUsuarios({ ativo: true }),
        ]);

        // Normaliza para array
        const arrSituacoes = Array.isArray(situacoes?.leadStages) ? situacoes.leadStages :
                             Array.isArray(situacoes?.data) ? situacoes.data :
                             Array.isArray(situacoes) ? situacoes : [];
        const arrOrigens = Array.isArray(origens?.data) ? origens.data :
                           Array.isArray(origens) ? origens : [];
        const arrUsuarios = Array.isArray(usuarios?.users) ? usuarios.users :
                            Array.isArray(usuarios?.data) ? usuarios.data :
                            Array.isArray(usuarios) ? usuarios : [];

        setSituacoesList(arrSituacoes);
        setOrigensList(arrOrigens);
        setUsuariosList(arrUsuarios);
      } catch (error) {
        const errorMsg = error?.message || "Falha ao carregar opções para o formulário.";
        setOptionsError(errorMsg);
        toast.error(errorMsg);
        setSituacoesList([]);
        setOrigensList([]);
        setUsuariosList([]);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, [isEditMode]);

  // -----------------------
  // Fetch dos dados no modo edição
  // -----------------------
  useEffect(() => {
    if (isEditMode && id) {
      setIsLoadingData(true);
      const fetchLead = async () => {
        try {
          const data = await getLeadById(id);

          // Normaliza datas para ISO-only-date
          const nascimento = data?.nascimento ? String(data.nascimento).substring(0, 10) : "";

          // tags -> string separada por vírgula
          const tagsString = Array.isArray(data?.tags) ? data.tags.join(", ") : "";

          const normalized = {
            nome: data?.nome || "",
            contato: data?.contato || "",
            email: data?.email || "",
            cpf: data?.cpf || "",
            rg: data?.rg || "",
            nacionalidade: data?.nacionalidade || "Brasileiro(a)",
            estadoCivil: data?.estadoCivil || "",
            profissao: data?.profissao || "",
            nascimento,
            endereco: data?.endereco || "",

            coadquirentes: Array.isArray(data?.coadquirentes) ? data.coadquirentes.map(c => ({
              nome: c?.nome || "",
              cpf: c?.cpf || "",
              rg: c?.rg || "",
              nacionalidade: c?.nacionalidade || "Brasileiro(a)",
              estadoCivil: c?.estadoCivil || "",
              profissao: c?.profissao || "",
              email: c?.email || "",
              contato: c?.contato || "",
              endereco: c?.endereco || "",
              nascimento: c?.nascimento ? String(c.nascimento).substring(0,10) : "",
            })) : [],

            situacao: data?.situacao?._id || data?.situacao || "",
            origem: data?.origem?._id || data?.origem || "",
            responsavel: data?.responsavel?._id || data?.responsavel || "",

            comentario: data?.comentario || "",
            approvalStatus: data?.approvalStatus || "Aprovado",
            submittedByBroker: data?.submittedByBroker?._id || data?.submittedByBroker || "",
            corretorResponsavel: data?.corretorResponsavel?._id || data?.corretorResponsavel || "",

            tagsString,
          };

          setFormData(normalized);
          setInitialData(normalized);
        } catch (err) {
          toast.error(err?.message || "Falha ao carregar dados do lead.");
        } finally {
          setIsLoadingData(false);
          if (!loadingOptions) setLoadingOptions(false);
        }
      };
      fetchLead();
    } else {
      // criação
      setFormData(initialState);
      setInitialData(null);
      setIsLoadingData(false);
      if (!loadingOptions) setLoadingOptions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditMode]);

  // -----------------------
  // Helpers
  // -----------------------
  const deepEqual = (a, b) => {
    try { return JSON.stringify(a) === JSON.stringify(b); }
    catch { return a === b; }
  };

  const toTagsArray = (s) => {
    if (!s || typeof s !== "string") return [];
    return s
      .split(",")
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => t.toLowerCase());
  };

  // -----------------------
  // Handlers de input
  // -----------------------
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handlePhoneChange = useCallback((value) => {
    setFormData(prev => ({ ...prev, contato: value || "" }));
  }, []);

  // COAD: adicionar
  const handleAddCoadquirente = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      coadquirentes: [
        ...prev.coadquirentes,
        {
          nome: "", cpf: "", rg: "",
          nacionalidade: "Brasileiro(a)",
          estadoCivil: "",
          profissao: "",
          email: "",
          contato: "",
          endereco: "",
          nascimento: "",
        },
      ],
    }));
  }, []);

  // COAD: remover
  const handleRemoveCoadquirente = useCallback((index) => {
    setFormData(prev => {
      const arr = [...prev.coadquirentes];
      arr.splice(index, 1);
      return { ...prev, coadquirentes: arr };
    });
  }, []);

  // COAD: mudar campo texto
  const handleCoadChange = useCallback((index, e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const arr = [...prev.coadquirentes];
      arr[index] = { ...arr[index], [name]: value };
      return { ...prev, coadquirentes: arr };
    });
  }, []);

  // COAD: telefone
  const handleCoadPhoneChange = useCallback((index, value) => {
    setFormData(prev => {
      const arr = [...prev.coadquirentes];
      arr[index] = { ...arr[index], contato: value || "" };
      return { ...prev, coadquirentes: arr };
    });
  }, []);

  // -----------------------
  // Submit
  // -----------------------
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    // Validações básicas
    if (!formData.nome || !formData.contato) {
      toast.warn("Nome e Contato são obrigatórios.");
      setIsProcessing(false);
      return;
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      toast.warn("Formato de email inválido.");
      setIsProcessing(false);
      return;
    }
    if (formData.contato && !isValidPhoneNumber(formData.contato)) {
      toast.warn("Número de telefone do lead é inválido.");
      setIsProcessing(false);
      return;
    }
    for (let i = 0; i < formData.coadquirentes.length; i++) {
      const c = formData.coadquirentes[i];
      if (c.contato && !isValidPhoneNumber(c.contato)) {
        toast.warn(`Telefone do Coadquirente ${i + 1} é inválido.`);
        setIsProcessing(false);
        return;
      }
      if (c.email && !/\S+@\S+\.\S+/.test(c.email)) {
        toast.warn(`Email do Coadquirente ${i + 1} é inválido.`);
        setIsProcessing(false);
        return;
      }
    }

    // Normalizações
    const tags = toTagsArray(formData.tagsString);

    const payloadBase = {
      ...formData,
      tags,
    };

    // remove helpers
    delete payloadBase.tagsString;

    // remove vazios/nulls opcionais (exceto nome/contato)
    const payload = Object.fromEntries(
      Object.entries(payloadBase).filter(([key, val]) => {
        if (["nome", "contato"].includes(key)) return true;
        if (val === "" || val === null || (Array.isArray(val) && val.length === 0)) return false;
        return true;
      })
    );

    try {
      if (isEditMode) {
        // diff inteligente
        if (!initialData) {
          toast.error("Erro: dados iniciais não carregados.");
          setIsProcessing(false);
          return;
        }

        const changed = {};
        for (const key of Object.keys(payload)) {
          const curr = payload[key];
          const init = initialData[key];
          if (!deepEqual(curr, init)) {
            changed[key] = curr;
          }
        }

        if (Object.keys(changed).length === 0) {
          toast.info("Nenhuma alteração detectada.");
          setIsProcessing(false);
          return;
        }

        await updateLead(id, changed);
        toast.success("Lead atualizado!");
        setTimeout(() => navigate(`/leads/${id}`), 600);
      } else {
        await createLead(payload);
        toast.success("Lead cadastrado!");
        setTimeout(() => navigate("/leads"), 600);
      }
    } catch (err) {
      toast.error(err?.message || `Falha ao ${isEditMode ? "atualizar" : "cadastrar"}.`);
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [formData, initialData, isEditMode, id, navigate]);

  // -----------------------
  // Render
  // -----------------------
  if (loadingOptions || isLoadingData) {
    return <div className="lead-form-page loading"><p>Carregando...</p></div>;
  }
  if (optionsError) {
    return <div className="lead-form-page error"><p className="error-message">{optionsError}</p></div>;
  }

  return (
    <div className="lead-form-page">
      <h1>
        {isEditMode ? `Editar Lead: ${initialData?.nome || formData.nome || ""}` : "Cadastrar Novo Lead"}
      </h1>

      {isEditMode && (
        <div className="form-top-actions">
          <Link to={`/leads/${id}`} className="button back-to-detail-button">
            <i className="fas fa-arrow-left" /> Cancelar Edição
          </Link>
          <Link to="/leads" className="button back-to-list-button">
            <i className="fas fa-list" /> Voltar para Lista
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="lead-form">
        {/* ============ BLOCO: DADOS DO LEAD ============ */}
        <section className="section-card section-lead">
          <div className="section-header">
            <span className="section-chip">Dados do Lead</span>
          </div>

          <div className="section-content">
            <div className="form-group">
              <label>Nome Completo *</label>
              <input type="text" name="nome" value={formData.nome} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Telefone de Contato *</label>
              <PhoneInput
                id="contato"
                defaultCountry="BR"
                value={formData.contato}
                onChange={handlePhoneChange}
                className="phone-input-control"
                required
              />
              {formData.contato && !isValidPhoneNumber(formData.contato) && (
                <small className="helper" style={{ color: "var(--_danger)" }}>Número inválido</small>
              )}
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>CPF</label>
              <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="00000000000" maxLength={11} />
            </div>

            <div className="form-group">
              <label>RG</label>
              <input type="text" name="rg" value={formData.rg} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Data de Nascimento</label>
              <input type="date" name="nascimento" value={formData.nascimento} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Estado Civil</label>
              <select name="estadoCivil" value={formData.estadoCivil} onChange={handleChange}>
                <option value="">Selecione...</option>
                {ESTADO_CIVIL_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Profissão</label>
              <input type="text" name="profissao" value={formData.profissao} onChange={handleChange} />
            </div>

            <div className="form-group full">
              <label>Endereço Completo</label>
              <input type="text" name="endereco" value={formData.endereco} onChange={handleChange} />
            </div>
          </div>
        </section>

        {/* ============ BLOCO: COADQUIRENTES ============ */}
        <section className="section-card section-coad">
          <div className="section-header">
            <span className="section-chip">Coadquirentes</span>
            <button type="button" className="button outline-button" onClick={handleAddCoadquirente}>
              + Adicionar Coadquirente
            </button>
          </div>

          <div className="section-content">
            <div className="coad-list">
              {formData.coadquirentes.length === 0 && (
                <small className="helper">Nenhum coadquirente adicionado.</small>
              )}

              {formData.coadquirentes.map((coad, index) => (
                <div key={index} className="coad-card">
                  <div className="coad-card-head">
                    <div className="coad-card-title">
                      <span className="dot" />
                      <strong>Coadquirente {index + 1}</strong>
                    </div>
                    <button
                      type="button"
                      className="button-link danger"
                      onClick={() => handleRemoveCoadquirente(index)}
                    >
                      Remover
                    </button>
                  </div>

                  <div className="coad-grid">
                    <div className="form-group">
                      <label>Nome Completo*</label>
                      <input type="text" name="nome" value={coad.nome} onChange={(e) => handleCoadChange(index, e)} required />
                    </div>
                    <div className="form-group">
                      <label>CPF</label>
                      <input type="text" name="cpf" value={coad.cpf || ""} onChange={(e) => handleCoadChange(index, e)} />
                    </div>

                    <div className="form-group">
                      <label>RG</label>
                      <input type="text" name="rg" value={coad.rg || ""} onChange={(e) => handleCoadChange(index, e)} />
                    </div>
                    <div className="form-group">
                      <label>Data de Nascimento</label>
                      <input
                        type="date"
                        name="nascimento"
                        value={coad.nascimento || ""}
                        onChange={(e) => handleCoadChange(index, e)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Estado Civil</label>
                      <select name="estadoCivil" value={coad.estadoCivil || ""} onChange={(e) => handleCoadChange(index, e)}>
                        <option value="">Selecione...</option>
                        {ESTADO_CIVIL_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Profissão</label>
                      <input type="text" name="profissao" value={coad.profissao || ""} onChange={(e) => handleCoadChange(index, e)} />
                    </div>

                    <div className="form-group">
                      <label>Telefone</label>
                      <PhoneInput
                        defaultCountry="BR"
                        value={coad.contato || ""}
                        onChange={(v) => handleCoadPhoneChange(index, v)}
                        className="phone-input-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" name="email" value={coad.email || ""} onChange={(e) => handleCoadChange(index, e)} />
                    </div>

                    <div className="form-group full">
                      <label>Endereço</label>
                      <input type="text" name="endereco" value={coad.endereco || ""} onChange={(e) => handleCoadChange(index, e)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ BLOCO: DADOS ADMINISTRATIVOS ============ */}
        <section className="section-card section-admin">
          <div className="section-header">
            <span className="section-chip">Dados Administrativos</span>
          </div>

          <div className="section-content">
            <div className="form-group">
              <label>Situação</label>
              <select name="situacao" value={formData.situacao} onChange={handleChange}>
                <option value=""></option>
                {situacoesList.map(s => (
                  <option key={s._id} value={s._id}>{s.nome}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Origem</label>
              <select name="origem" value={formData.origem} onChange={handleChange}>
                <option value=""></option>
                {origensList.map(o => (
                  <option key={o._id} value={o._id}>{o.nome}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Responsável</label>
              <select name="responsavel" value={formData.responsavel} onChange={handleChange}>
                <option value=""></option>
                {usuariosList.map(u => (
                  <option key={u._id} value={u._id}>{u.nome}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Status de Aprovação</label>
              <select name="approvalStatus" value={formData.approvalStatus} onChange={handleChange}>
                {APROVACAO_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Tags (separadas por vírgula)</label>
              <input
                type="text"
                name="tagsString"
                placeholder="ex.: vip, investidor"
                value={formData.tagsString}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full">
              <label>Comentário</label>
              <textarea name="comentario" value={formData.comentario} onChange={handleChange} />
            </div>
          </div>
        </section>

        {/* Ações */}
        <div className="form-actions">
          <button type="submit" disabled={isProcessing} className="submit-button">
            {isProcessing
              ? (isEditMode ? "Salvando..." : "Cadastrando...")
              : (isEditMode ? "Salvar Alterações" : "Cadastrar Lead")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default LeadFormPage;
