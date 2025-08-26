import React, { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import { createLead, getLeadById, updateLead } from "../../api/leads";
import { getLeadStages } from "../../api/leadStages";
import { getOrigens } from "../../api/origens";
import { getUsuarios } from "../../api/users";

import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

import "./LeadFormModal.css";

const ESTADO_CIVIL_OPCOES = [
  "Solteiro(a)",
  "Casado(a)",
  "Divorciado(a)",
  "Viúvo(a)",
  "União Estável",
  "Outro",
];

const initialState = {
  // LeadRequest base
  nome: "",
  contato: "",
  email: "",
  nascimento: "",
  endereco: "",
  cpf: "",
  rg: "",
  nacionalidade: "Brasileiro(a)",
  estadoCivil: "",
  profissao: "",
  comentario: "",
  origem: "",         // ObjectId
  responsavel: "",    // usuário interno (não está no LeadRequest, mas mantido como antes)
  // metadados
  tags: [],           // array de strings
  // corretor
  corretorResponsavel: "",   // ObjectId (broker) — required no LeadRequest
  submittedByBroker: "",     // ObjectId (broker) — required no LeadRequest
  // coadquirentes (opcional, só envia se tiver pelo botão)
  coadquirentes: [],  // [{nome, cpf, rg, nacionalidade, estadoCivil, profissao, email, contato, endereco, nascimento}]
};

function LeadFormModal({
  isOpen,
  onClose,
  leadId = null,
  onSaved,
  prefill,
  hideFields = [],
  corretorInfo, // { id, nome }
  createApi,    // opcional para sobrescrever o create padrão
}) {
  const createFn = createApi || createLead;
  const isEditMode = Boolean(leadId);
  const isHidden = (f) => hideFields.includes(f);

  const [formData, setFormData] = useState(initialState);
  const [initialData, setInitialData] = useState(null);

  const [situacoesList, setSituacoesList] = useState([]);
  const [origensList, setOrigensList] = useState([]);
  const [usuariosList, setUsuariosList] = useState([]);

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [optionsError, setOptionsError] = useState(null);

  // Reset + prefill (create only)
  useEffect(() => {
    if (!isOpen) return;
    setFormData((prev) => {
      const base = { ...initialState };
      // se vier corretorInfo, pré-seta corretorResponsavel e submittedByBroker
      if (corretorInfo?.id) {
        base.corretorResponsavel = corretorInfo.id;
        base.submittedByBroker = corretorInfo.id;
      }
      // prefill (somente create)
      if (!isEditMode && prefill) Object.assign(base, prefill);
      return base;
    });
    setInitialData(null);
    setOptionsError(null);
    setIsProcessing(false);
  }, [isOpen, isEditMode, prefill, corretorInfo]);

  // ESC close
  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e) => e.key === "Escape" && !isProcessing && onClose?.();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen, isProcessing, onClose]);

  // Carregar opções (apenas o que será exibido)
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoadingOptions(true);
      setOptionsError(null);
      try {
        const jobs = [];
        jobs.push(!isHidden("situacao") ? getLeadStages() : Promise.resolve([]));
        jobs.push(!isHidden("origem") ? getOrigens() : Promise.resolve([]));
        jobs.push(!isHidden("responsavel") ? getUsuarios() : Promise.resolve([]));
        const [situacoesData, origensData, usuariosData] = await Promise.all(jobs);
        setSituacoesList(Array.isArray(situacoesData) ? situacoesData : []);
        setOrigensList(Array.isArray(origensData) ? origensData : []);
        setUsuariosList(Array.isArray(usuariosData) ? usuariosData : []);
      } catch (err) {
        const msg = err?.message || "Falha ao carregar opções.";
        setOptionsError(msg);
        toast.error(msg);
      } finally {
        setLoadingOptions(false);
      }
    })();
  }, [isOpen, hideFields]);

  // Carregar dados (edição)
  useEffect(() => {
    if (!isOpen || !isEditMode || !leadId) return;
    (async () => {
      setIsLoadingData(true);
      try {
        // Observação: getLeadById pode não trazer todos os campos do LeadRequest.
        // Vamos fazer mapping defensivo para não quebrar.
        const data = await getLeadById(leadId);

        const formattedNascimento = data.nascimento ? String(data.nascimento).substring(0, 10) : "";

        const formDataToSet = {
          nome: data.nome || "",
          contato: data.contato || "",
          email: data.email || "",
          nascimento: formattedNascimento,
          endereco: data.endereco || "",
          cpf: data.cpf || "",
          rg: data.rg || "",
          nacionalidade: data.nacionalidade || "Brasileiro(a)",
          estadoCivil: data.estadoCivil || "",
          profissao: data.profissao || "",
          situacao: data.situacao?._id || "",
          origem: data.origem?._id || "",
          responsavel: data.responsavel?._id || "",
          comentario: data.comentario || "",
          // arrays / metadados
          tags: Array.isArray(data.tags) ? data.tags : [],
          // corretor
          corretorResponsavel: data.corretorResponsavel?._id || corretorInfo?.id || "",
          submittedByBroker: data.submittedByBroker?._id || corretorInfo?.id || "",
          // coadquirentes (se existir no retorno)
          coadquirentes: Array.isArray(data.coadquirentes)
            ? data.coadquirentes.map((c) => ({
              nome: c.nome || "",
              cpf: c.cpf || "",
              rg: c.rg || "",
              nacionalidade: c.nacionalidade || "Brasileiro(a)",
              estadoCivil: c.estadoCivil || "",
              profissao: c.profissao || "",
              email: c.email || "",
              contato: c.contato || "",
              endereco: c.endereco || "",
              nascimento: c.nascimento ? String(c.nascimento).substring(0, 10) : "",
            }))
            : [],
        };

        setFormData((prev) => ({ ...prev, ...formDataToSet }));
        setInitialData(formDataToSet);
      } catch (err) {
        toast.error(err?.message || "Falha ao carregar lead.");
      } finally {
        setIsLoadingData(false);
      }
    })();
  }, [isOpen, isEditMode, leadId, corretorInfo]);

  // helpers
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handlePhoneChange = useCallback((value) => {
    setFormData((prev) => ({ ...prev, contato: value || "" }));
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("lfm-backdrop") && !isProcessing) onClose?.();
  };

  const stripHiddenFields = (obj) => {
    const clone = { ...obj };
    hideFields.forEach((f) => delete clone[f]);
    return clone;
  };

  // ====== TAGS ======
  const [tagInput, setTagInput] = useState("");
  const addTag = useCallback(() => {
    const t = (tagInput || "").trim().toLowerCase();
    if (!t) return;
    if (formData.tags.includes(t)) {
      setTagInput("");
      return;
    }
    setFormData((prev) => ({ ...prev, tags: [...prev.tags, t] }));
    setTagInput("");
  }, [tagInput, formData.tags]);

  const removeTag = useCallback((tag) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  }, []);

  const onTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  // ====== COADQUIRENTES ======
  const addCoadquirente = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      coadquirentes: [
        ...prev.coadquirentes,
        {
          nome: "",
          cpf: "",
          rg: "",
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

  const removeCoadquirente = useCallback((idx) => {
    setFormData((prev) => {
      const next = [...prev.coadquirentes];
      next.splice(idx, 1);
      return { ...prev, coadquirentes: next };
    });
  }, []);

  const handleCoadqChange = useCallback((idx, field, value) => {
    setFormData((prev) => {
      const next = [...prev.coadquirentes];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, coadquirentes: next };
    });
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (isProcessing) return;
      setIsProcessing(true);

      // Validações mínimas
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
        toast.warn("Telefone inválido.");
        setIsProcessing(false);
        return;
      }
      // Se estiver usando o modelo LeadRequest: corretor é obrigatório
      if (!formData.corretorResponsavel || !formData.submittedByBroker) {
        toast.warn("Corretor responsável não definido.");
        setIsProcessing(false);
        return;
      }

      try {
        // Normaliza payload
        const basePayload = { ...formData };

        // Limpa CPF vazio
        if (basePayload.cpf && basePayload.cpf.replace(/\D/g, "") === "") delete basePayload.cpf;
        // coadquirentes: só envia se houver pelo menos 1
        if (!Array.isArray(basePayload.coadquirentes) || basePayload.coadquirentes.length === 0) {
          delete basePayload.coadquirentes;
        } else {
          basePayload.coadquirentes = basePayload.coadquirentes.map((c) => {
            const copy = { ...c };
            if (copy.cpf && copy.cpf.replace(/\D/g, "") === "") delete copy.cpf;
            // remove campos vazios para não poluir
            Object.keys(copy).forEach((k) => {
              if (copy[k] === "" || copy[k] === null) delete copy[k];
            });
            return copy;
          });
        }
        // Tags: garante array de strings
        if (!Array.isArray(basePayload.tags)) basePayload.tags = [];

        const payload = stripHiddenFields(basePayload);

        if (isEditMode) {
          if (!initialData) {
            toast.error("Dados iniciais não carregados.");
            setIsProcessing(false);
            return;
          }
          // diff apenas nos campos que mudaram (inclui novos campos)
          const changed = {};
          Object.keys(payload).forEach((k) => {
            if (isHidden(k)) return;
            const curr = payload[k];
            const init = initialData[k];

            const isEqual =
              Array.isArray(curr) && Array.isArray(init)
                ? JSON.stringify(curr) === JSON.stringify(init)
                : curr === init;

            if (!isEqual) {
              changed[k] = curr === "" ? null : curr;
            }
          });

          if (Object.keys(changed).length === 0) {
            toast.info("Nenhuma alteração detectada.");
            setIsProcessing(false);
            return;
          }
          await updateLead(leadId, changed);
          toast.success("Lead atualizado!");
        } else {
          // Create: remove chaves vazias não obrigatórias
          Object.keys(payload).forEach((k) => {
            if (!["nome", "contato", "corretorResponsavel", "submittedByBroker"].includes(k)) {
              if (payload[k] === "" || payload[k] === null) delete payload[k];
            }
          });
          await createFn(payload);
          toast.success("Lead cadastrado!");
          // Reset preservando corretor, se existir
          setFormData((prev) => ({
            ...initialState,
            corretorResponsavel: prev.corretorResponsavel,
            submittedByBroker: prev.submittedByBroker,
          }));
        }

        onSaved?.();
        onClose?.();
      } catch (err) {
        toast.error(err?.message || `Falha ao ${isEditMode ? "atualizar" : "cadastrar"}.`);
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    },
    [formData, initialData, isEditMode, leadId, isProcessing, hideFields, onSaved, onClose, createFn]
  );

  if (!isOpen) return null;

  return createPortal(
    <div className="lfm-backdrop" onMouseDown={handleBackdropClick}>
      <div className="lfm-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="lfm-header">
          <h2>
            {isEditMode
              ? `Editar Lead${initialData?.nome ? `: ${initialData.nome}` : ""}`
              : "Cadastrar Lead"}
          </h2>
          <button
            type="button"
            className="lfm-close"
            onClick={() => !isProcessing && onClose?.()}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {(loadingOptions || isLoadingData) && <div className="lfm-loading"><p>Carregando…</p></div>}
        {optionsError && !loadingOptions && <div className="lfm-error"><p>{optionsError}</p></div>}

        {!loadingOptions && !isLoadingData && !optionsError && (
          <form className="lfm-form" onSubmit={handleSubmit}>
            <div className="lfm-grid">
              {/* Básicos */}
              {!isHidden("nome") && (
                <div className="lfm-field">
                  <label htmlFor="lfm-nome">Nome Completo *</label>
                  <input id="lfm-nome" name="nome" value={formData.nome} onChange={handleChange} required />
                </div>
              )}

              {!isHidden("contato") && (
                <div className="lfm-field">
                  <label htmlFor="lfm-contato">Contato *</label>
                  <PhoneInput
                    id="lfm-contato"
                    value={formData.contato}
                    onChange={handlePhoneChange}
                    defaultCountry="BR"
                    international
                    limitMaxLength
                    required
                    className="lfm-phone"
                  />
                  {formData.contato && !isValidPhoneNumber(formData.contato) && (
                    <small className="lfm-error-text">Número inválido</small>
                  )}
                </div>
              )}

              {!isHidden("email") && (
                <div className="lfm-field">
                  <label htmlFor="lfm-email">Email</label>
                  <input id="lfm-email" name="email" type="email" value={formData.email} onChange={handleChange} />
                </div>
              )}

              {!isHidden("cpf") && (
                <div className="lfm-field">
                  <label htmlFor="lfm-cpf">CPF</label>
                  <input id="lfm-cpf" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="Somente números" maxLength={11} />
                </div>
              )}

              {!isHidden("rg") && (
                <div className="lfm-field">
                  <label htmlFor="lfm-rg">RG</label>
                  <input id="lfm-rg" name="rg" value={formData.rg} onChange={handleChange} />
                </div>
              )}

              {!isHidden("nacionalidade") && (
                <div className="lfm-field">
                  <label htmlFor="lfm-nacionalidade">Nacionalidade</label>
                  <input id="lfm-nacionalidade" name="nacionalidade" value={formData.nacionalidade} onChange={handleChange} />
                </div>
              )}

              {!isHidden("estadoCivil") && (
                <div className="lfm-field">
                  <label htmlFor="lfm-estado-civil">Estado Civil</label>
                  <select id="lfm-estado-civil" name="estadoCivil" value={formData.estadoCivil} onChange={handleChange}>
                    <option value=""></option>
                    {ESTADO_CIVIL_OPCOES.map((ec) => (
                      <option key={ec} value={ec}>{ec}</option>
                    ))}
                  </select>
                </div>
              )}

              {!isHidden("profissao") && (
                <div className="lfm-field">
                  <label htmlFor="lfm-profissao">Profissão</label>
                  <input id="lfm-profissao" name="profissao" value={formData.profissao} onChange={handleChange} />
                </div>
              )}

              {!isHidden("nascimento") && (
                <div className="lfm-field">
                  <label htmlFor="lfm-nasc">Data de Nascimento</label>
                  <input id="lfm-nasc" name="nascimento" type="date" value={formData.nascimento} onChange={handleChange} />
                </div>
              )}

              {!isHidden("endereco") && (
                <div className="lfm-field">
                  <label htmlFor="lfm-endereco">Endereço</label>
                  <input id="lfm-endereco" name="endereco" value={formData.endereco} onChange={handleChange} />
                </div>
              )}

              {!isHidden("comentario") && (
                <div className="lfm-field lfm-col-2">
                  <label htmlFor="lfm-comentario">Comentário</label>
                  <textarea id="lfm-comentario" name="comentario" value={formData.comentario} onChange={handleChange} />
                </div>
              )}

              {/* TAGS */}
              {!isHidden("tags") && (
                <div className="lfm-field lfm-col-2">
                  <label>Tags</label>
                  <div className="lfm-tags">
                    <div className="lfm-tags-list">
                      {formData.tags.map((tag) => (
                        <span key={tag} className="lfm-tag">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)} aria-label={`Remover ${tag}`}>×</button>
                        </span>
                      ))}
                    </div>
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={onTagKeyDown}
                      placeholder="Digite a tag e pressione Enter"
                    />
                    <button type="button" className="lfm-btn small" onClick={addTag}>Adicionar</button>
                  </div>
                </div>
              )}

              {/* READ-ONLY: Corretor (se vier) */}
              {(corretorInfo?.id || formData.corretorResponsavel) && !isHidden("corretorResponsavel") && (
                <div className="lfm-field lfm-col-2">
                  <label>Corretor Responsável</label>
                  <div className="lfm-readonly">
                    <span>{corretorInfo?.nome || "Definido"}</span>
                    <small>ID: {corretorInfo?.id || formData.corretorResponsavel}</small>
                  </div>
                </div>
              )}

              {/* Campos já existentes (listas) */}
              {!isHidden("situacao") && (
                <div className="lfm-field">
                  <label htmlFor="lfm-situacao">Situação</label>
                  <select id="lfm-situacao" name="situacao" value={formData.situacao} onChange={handleChange}>
                    <option value=""></option>
                    {situacoesList.map((s) => (
                      <option key={s._id} value={s._id}>{s.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {!isHidden("origem") && (
                <div className="lfm-field">
                  <label htmlFor="lfm-origem">Origem</label>
                  <select id="lfm-origem" name="origem" value={formData.origem} onChange={handleChange}>
                    <option value=""></option>
                    {origensList.map((o) => (
                      <option key={o._id} value={o._id}>{o.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {!isHidden("responsavel") && (
                <div className="lfm-field">
                  <label htmlFor="lfm-responsavel">Responsável</label>
                  <select id="lfm-responsavel" name="responsavel" value={formData.responsavel} onChange={handleChange}>
                    <option value=""></option>
                    {usuariosList.map((u) => (
                      <option key={u._id} value={u._id}>{u.nome}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* COADQUIRENTES - apenas botão visível por padrão */}
            {!isHidden("coadquirentes") && (
              <div className="lfm-coadquirentes lfm-col-2">
                <div className="lfm-coadq-header">
                  <h3>Coadquirentes</h3>
                  <button type="button" className="lfm-btn outline" onClick={addCoadquirente}>+ Adicionar coadquirente</button>
                </div>

                {formData.coadquirentes.length > 0 && formData.coadquirentes.map((c, idx) => (
                  <div key={idx} className="lfm-coadq-item">
                    <div className="lfm-coadq-grid">
                      <div className="lfm-field">
                        <label>Nome *</label>
                        <input
                          value={c.nome}
                          onChange={(e) => handleCoadqChange(idx, "nome", e.target.value)}
                          required
                        />
                      </div>
                      <div className="lfm-field">
                        <label>Contato</label>
                        <PhoneInput
                          defaultCountry="BR"
                          international
                          limitMaxLength
                          value={c.contato || ""}
                          onChange={(value) => handleCoadqChange(idx, "contato", value || "")}
                          className="lfm-phone"
                        />
                        {c.contato && !isValidPhoneNumber(c.contato) && (
                          <small className="lfm-error-text">Número inválido</small>
                        )}
                      </div>
                      <div className="lfm-field">
                        <label>Email</label>
                        <input
                          type="email"
                          value={c.email || ""}
                          onChange={(e) => handleCoadqChange(idx, "email", e.target.value)}
                        />
                      </div>
                      <div className="lfm-field">
                        <label>CPF</label>
                        <input
                          maxLength={11}
                          value={c.cpf || ""}
                          onChange={(e) => handleCoadqChange(idx, "cpf", e.target.value)}
                        />
                      </div>
                      <div className="lfm-field">
                        <label>RG</label>
                        <input
                          value={c.rg || ""}
                          onChange={(e) => handleCoadqChange(idx, "rg", e.target.value)}
                        />
                      </div>
                      <div className="lfm-field">
                        <label>Nacionalidade</label>
                        <input
                          value={c.nacionalidade || "Brasileiro(a)"}
                          onChange={(e) => handleCoadqChange(idx, "nacionalidade", e.target.value)}
                        />
                      </div>
                      <div className="lfm-field">
                        <label>Estado Civil</label>
                        <select
                          value={c.estadoCivil || ""}
                          onChange={(e) => handleCoadqChange(idx, "estadoCivil", e.target.value)}
                        >
                          <option value=""></option>
                          {ESTADO_CIVIL_OPCOES.map((ec) => (
                            <option key={ec} value={ec}>{ec}</option>
                          ))}
                        </select>
                      </div>
                      <div className="lfm-field">
                        <label>Profissão</label>
                        <input
                          value={c.profissao || ""}
                          onChange={(e) => handleCoadqChange(idx, "profissao", e.target.value)}
                        />
                      </div>
                      <div className="lfm-field">
                        <label>Data de Nascimento</label>
                        <input
                          type="date"
                          value={c.nascimento || ""}
                          onChange={(e) => handleCoadqChange(idx, "nascimento", e.target.value)}
                        />
                      </div>
                      <div className="lfm-field lfm-col-2">
                        <label>Endereço</label>
                        <input
                          value={c.endereco || ""}
                          onChange={(e) => handleCoadqChange(idx, "endereco", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="lfm-coadq-actions">
                      <button type="button" className="lfm-btn ghost" onClick={() => removeCoadquirente(idx)}>
                        Remover coadquirente
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="lfm-actions">
              <button type="button" className="lfm-btn ghost" onClick={() => !isProcessing && onClose?.()}>
                Cancelar
              </button>
              <button type="submit" className="lfm-btn primary" disabled={isProcessing}>
                {isProcessing ? (isEditMode ? "Salvando..." : "Cadastrando...") : (isEditMode ? "Salvar" : "Cadastrar")}
              </button>
            </div>
          </form>
        )}

        {isEditMode && (
          <div className="lfm-footer-links">
            <Link to={`/leads/${leadId}`} onClick={onClose}>Ver Detalhes</Link>
            <Link to="/leads" onClick={onClose}>Ir para Lista</Link>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default LeadFormModal;
