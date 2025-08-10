import React, { useEffect, useState, useCallback } from "react";
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

const initialState = {
  nome: "",
  contato: "",
  email: "",
  nascimento: "",
  endereco: "",
  cpf: "",
  situacao: "",
  origem: "",
  responsavel: "",
  comentario: "",
  corretorResponsavel: "", // novo campo (vai só no payload)
};

function LeadFormModal({
  isOpen,
  onClose,
  leadId = null,
  onSaved,
  prefill,
  hideFields = [],
  corretorInfo, // { id, nome }
  createApi
}) {
  const createFn = createApi
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
    setFormData(initialState);
    setInitialData(null);
    setOptionsError(null);
    setIsProcessing(false);
    if (!isEditMode && prefill) {
      setFormData((prev) => ({ ...prev, ...prefill }));
    }
  }, [isOpen, isEditMode, prefill]);

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
        const data = await getLeadById(leadId);
        const formattedNascimento = data.nascimento ? data.nascimento.substring(0, 10) : "";
        const formDataToSet = {
          nome: data.nome || "",
          contato: data.contato || "",
          email: data.email || "",
          nascimento: formattedNascimento,
          endereco: data.endereco || "",
          cpf: data.cpf || "",
          situacao: data.situacao?._id || "",
          origem: data.origem?._id || "",
          responsavel: data.responsavel?._id || "",
          comentario: data.comentario || "",
          corretorResponsavel: data.corretorResponsavel?._id || "", // se existir
        };
        setFormData((prev) => ({ ...prev, ...formDataToSet }));
        setInitialData(formDataToSet);
      } catch (err) {
        toast.error(err?.message || "Falha ao carregar lead.");
      } finally {
        setIsLoadingData(false);
      }
    })();
  }, [isOpen, isEditMode, leadId]);

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

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (isProcessing) return;
      setIsProcessing(true);

      // Min validações
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

      try {
        if (isEditMode) {
          if (!initialData) {
            toast.error("Dados iniciais não carregados.");
            setIsProcessing(false);
            return;
          }
          const changed = {};
          Object.keys(formData).forEach((k) => {
            if (isHidden(k)) return; // ignora campo oculto no diff
            const curr = formData[k] ?? "";
            const init = initialData[k] ?? "";
            if (curr !== init) changed[k] = curr === "" ? null : curr;
          });
          if (Object.keys(changed).length === 0) {
            toast.info("Nenhuma alteração detectada.");
            setIsProcessing(false);
            return;
          }
          const payload = stripHiddenFields(changed);
          await updateLead(leadId, payload);
          toast.success("Lead atualizado!");
        } else {
          const payload = stripHiddenFields({ ...formData });
          Object.keys(payload).forEach((k) => {
            if (!["nome", "contato"].includes(k) && (payload[k] === "" || payload[k] === null)) {
              delete payload[k];
            }
          });
          if (payload.cpf && payload.cpf.replace(/\D/g, "") === "") delete payload.cpf;
          await createFn(payload);
          toast.success("Lead cadastrado!");
          setFormData(initialState);
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
    [formData, initialData, isEditMode, leadId, isProcessing, hideFields, onSaved, onClose]
  );

  if (!isOpen) return null;

  return createPortal(
    <div className="lfm-backdrop" onMouseDown={handleBackdropClick}>
      <div className="lfm-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="lfm-header">
          <h2>{isEditMode ? `Editar Lead${initialData?.nome ? `: ${initialData.nome}` : ""}` : "Cadastrar Lead"}</h2>
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

              {/* READ-ONLY: Corretor Responsável (quando vier) */}
              {corretorInfo?.id && (
                <div className="lfm-field lfm-col-2">
                  <label>Corretor Responsável</label>
                  <div className="lfm-readonly">
                    <span>{corretorInfo.nome}</span>
                    <small>ID: {corretorInfo.id}</small>
                  </div>
                </div>
              )}

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
