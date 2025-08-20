// src/pages/LeadDetail/components/LeadInfo.js
import React, { useState } from "react";
import { toast } from "react-toastify";
import { updateLead } from "../../../api/leads";
import "./LeadInfo.css";

/* ================= Helpers de data ================= */
// Data+hora (para createdAt/updatedAt etc.)
const formatDateTime = (value) => {
  if (!value) return "Não informado";
  try {
    return new Date(value).toLocaleString("pt-BR"); // usa fuso do usuário
  } catch {
    return "Não informado";
  }
};

// Data "pura" (sem hora/fuso) — mostra exatamente a data salva (ex.: nascimento)
const formatDateOnlyBR = (value) => {
  if (!value) return "Não informado";
  try {
    const d = new Date(value);
    // fixa UTC para não sofrer deslocamento de timezone
    return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);
  } catch {
    return "Não informado";
  }
};

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const statusClassFor = (nome) => {
  const n = norm(nome);
  if (!n) return "is-neutral";
  if (n.includes("descart")) return "is-danger";
  if (n.includes("vendid")) return "is-danger";
  if (n.includes("reserva")) return "is-warning";
  if (n.includes("atendimento")) return "is-info";
  if (n.includes("novo")) return "is-primary";
  if (n.includes("qualific")) return "is-primary";
  return "is-neutral";
};

const extractTags = (leadDetails) => {
  const raw = leadDetails?.tags || leadDetails?.etiquetas || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => (typeof t === "string" ? t : t?.nome ?? "")).filter(Boolean);
};

const refToName = (ref, fallback = "N/A") => {
  if (!ref) return fallback;
  if (typeof ref === "string") return ref;
  return ref.nome || ref.titulo || ref.razaoSocial || fallback;
};

/* ================= Modal: Informações completas ================= */
function LeadInfoFullModal({ isOpen, onClose, leadDetails }) {
  if (!isOpen) return null;

  const situacaoNome = leadDetails.situacao?.nome || "N/A";
  const tags = extractTags(leadDetails);

  const responsavelLabel = leadDetails.responsavel
    ? typeof leadDetails.responsavel === "string"
      ? leadDetails.responsavel
      : `${leadDetails.responsavel?.nome || "N/A"}${
          leadDetails.responsavel?.perfil ? ` (${leadDetails.responsavel.perfil})` : ""
        }`
    : "N/A";

  return (
    <div className="li-modal-overlay" role="dialog" aria-modal="true" aria-label="Informações completas do lead">
      <div className="li-modal">
        <div className="li-modal-header">
          <h3>Informações completas</h3>
          <button className="li-close-btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <div className="li-modal-body">
          <div className="li-grid">
            {/* Identificação */}
            <div className="li-card">
              <span className="li-label">Nome</span>
              <span className="li-value">{leadDetails.nome || "—"}</span>
            </div>
            <div className="li-card">
              <span className="li-label">Contato</span>
              <span className="li-value">{leadDetails.contato || "—"}</span>
            </div>
            <div className="li-card">
              <span className="li-label">Email</span>
              <span className="li-value">{leadDetails.email || "—"}</span>
            </div>

            {/* Documentos / pessoais */}
            <div className="li-card">
              <span className="li-label">CPF</span>
              <span className="li-value">{leadDetails.cpf || "—"}</span>
            </div>
            <div className="li-card">
              <span className="li-label">RG</span>
              <span className="li-value">{leadDetails.rg || "—"}</span>
            </div>
            <div className="li-card">
              <span className="li-label">Nacionalidade</span>
              <span className="li-value">{leadDetails.nacionalidade || "—"}</span>
            </div>
            <div className="li-card">
              <span className="li-label">Estado Civil</span>
              <span className="li-value">{leadDetails.estadoCivil || "—"}</span>
            </div>
            <div className="li-card">
              <span className="li-label">Profissão</span>
              <span className="li-value">{leadDetails.profissao || "—"}</span>
            </div>
            <div className="li-card">
              <span className="li-label">Nascimento</span>
              <span className="li-value">{formatDateOnlyBR(leadDetails.nascimento)}</span>
            </div>

            {/* Endereço */}
            <div className="li-card span-2">
              <span className="li-label">Endereço</span>
              <span className="li-value">{leadDetails.endereco || "—"}</span>
            </div>

            {/* Situação / Origem / Responsável / Empresa / Aprovação */}
            <div className="li-card">
              <span className="li-label">Situação</span>
              <span className="li-value">
                <span className={`pill status ${statusClassFor(situacaoNome)}`}>{situacaoNome}</span>
              </span>
            </div>
            <div className="li-card">
              <span className="li-label">Origem</span>
              <span className="li-value">{refToName(leadDetails.origem, "N/A")}</span>
            </div>
            <div className="li-card">
              <span className="li-label">Responsável</span>
              <span className="li-value">{responsavelLabel}</span>
            </div>
            <div className="li-card">
              <span className="li-label">Empresa</span>
              <span className="li-value">{refToName(leadDetails.company, "N/A")}</span>
            </div>
            <div className="li-card">
              <span className="li-label">Status de Aprovação</span>
              <span className="li-value">{leadDetails.approvalStatus || "—"}</span>
            </div>

            {/* Intermediários */}
            <div className="li-card">
              <span className="li-label">Enviado por Corretor</span>
              <span className="li-value">{refToName(leadDetails.submittedByBroker, "—")}</span>
            </div>
            <div className="li-card">
              <span className="li-label">Corretor Responsável</span>
              <span className="li-value">{refToName(leadDetails.corretorResponsavel, "—")}</span>
            </div>

            {/* Comentário / Motivo */}
            <div className="li-card note span-2">
              <span className="li-label">Comentário</span>
              <span className="li-value" style={{ whiteSpace: "pre-wrap" }}>
                {leadDetails.comentario || "—"}
              </span>
            </div>

            {leadDetails.motivoDescarte && (
              <div className="li-card tone-danger span-2">
                <span className="li-label">Motivo do Descarte</span>
                <span className="li-value">{refToName(leadDetails.motivoDescarte, "—")}</span>
              </div>
            )}

            {/* Tags */}
            <div className="li-card span-2">
              <span className="li-label">Tags</span>
              <div className="li-tags">
                {tags.length ? tags.map((tg) => <span key={tg} className="tag-chip">{tg}</span>) : <span className="li-value">—</span>}
              </div>
            </div>

            {/* Datas do sistema */}
            <div className="li-card">
              <span className="li-label">Criado em</span>
              <span className="li-value">{formatDateTime(leadDetails.createdAt)}</span>
            </div>
            <div className="li-card">
              <span className="li-label">Atualizado em</span>
              <span className="li-value">{formatDateTime(leadDetails.updatedAt)}</span>
            </div>

            {/* Coadquirentes */}
            {Array.isArray(leadDetails.coadquirentes) && leadDetails.coadquirentes.length > 0 && (
              <div className="li-card span-2">
                <span className="li-label">Coadquirentes</span>
                <div className="li-grid" style={{ marginTop: 6 }}>
                  {leadDetails.coadquirentes.map((c, idx) => (
                    <div key={idx} className="li-card">
                      <span className="li-label">Nome</span>
                      <span className="li-value">{c?.nome || "—"}</span>

                      <span className="li-label">CPF</span>
                      <span className="li-value">{c?.cpf || "—"}</span>

                      <span className="li-label">RG</span>
                      <span className="li-value">{c?.rg || "—"}</span>

                      <span className="li-label">Nascimento</span>
                      <span className="li-value">{formatDateOnlyBR(c?.nascimento)}</span>

                      <span className="li-label">Contato</span>
                      <span className="li-value">{c?.contato || "—"}</span>

                      <span className="li-label">Email</span>
                      <span className="li-value">{c?.email || "—"}</span>

                      <span className="li-label">Endereço</span>
                      <span className="li-value">{c?.endereco || "—"}</span>

                      <span className="li-label">Nacionalidade</span>
                      <span className="li-value">{c?.nacionalidade || "—"}</span>

                      <span className="li-label">Estado Civil</span>
                      <span className="li-value">{c?.estadoCivil || "—"}</span>

                      <span className="li-label">Profissão</span>
                      <span className="li-value">{c?.profissao || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="li-modal-footer">
          <button className="info-more-btn" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

/* ================= Modal: Gerenciar tags ================= */
function TagsModal({ isOpen, onClose, initialTags = [], onSave, saving }) {
  const [input, setInput] = useState("");
  const [tags, setTags] = useState(initialTags);
  if (!isOpen) return null;

  const addFromInput = () => {
    const parts = input.split(/[,;\n]/g).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setTags(Array.from(new Set([...tags, ...parts])));
    setInput("");
  };
  const removeTag = (tg) => setTags(tags.filter((t) => t !== tg));
  const onSubmit = () => onSave(tags);

  return (
    <div className="li-modal-overlay" role="dialog" aria-modal="true" aria-label="Gerenciar tags">
      <div className="li-modal small">
        <div className="li-modal-header">
          <h3>Gerenciar tags</h3>
          <button className="li-close-btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="li-modal-body">
          <div className="tags-edit-row">
            <input
              className="tags-input"
              placeholder="Digite tags e pressione Adicionar (separe por vírgula)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addFromInput(); }}
            />
            <button className="info-more-btn" onClick={addFromInput}>Adicionar</button>
          </div>
          <div className="tags-wrap editable">
            {tags.length ? (
              tags.map((tg) => (
                <span key={tg} className="tag-chip editable">
                  {tg}
                  <button className="chip-x" onClick={() => removeTag(tg)} aria-label={`Remover ${tg}`}>×</button>
                </span>
              ))
            ) : (
              <span className="tags-empty">Nenhuma tag adicionada.</span>
            )}
          </div>
        </div>
        <div className="li-modal-footer">
          <button className="btn-neutral" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="info-more-btn" onClick={onSubmit} disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= LeadInfo (resumo + tags + modais) ================= */
function LeadInfo({ leadDetails, onTagsUpdated }) {
  const [openFull, setOpenFull] = useState(false);
  const [openTags, setOpenTags] = useState(false);
  const [savingTags, setSavingTags] = useState(false);

  const situacaoNome = leadDetails.situacao?.nome || "N/A";
  const situacaoClass = statusClassFor(situacaoNome);
  const tags = extractTags(leadDetails);

  const persistTags = async (nextTags) => {
    try {
      setSavingTags(true);
      await updateLead(leadDetails._id, { tags: nextTags });
      toast.success("Tags atualizadas!");
      onTagsUpdated?.();
      setOpenTags(false);
    } catch (e) {
      toast.error(e?.message || "Falha ao atualizar tags.");
    } finally {
      setSavingTags(false);
    }
  };

  return (
    <div className="lead-details-column">
      <div className="lead-info-header">
        <h2 className="ldp-section-title">Informações do Lead</h2>
        <button className="info-more-btn" onClick={() => setOpenFull(true)}>Ver informações completas</button>
      </div>

      {/* GRID 12 colunas (3 blocos + extras) */}
      <div className="lead-info-grid">
        {/* Linha 1: Nome (6) | Contato+Email (6) */}
        <div className="card span-6">
          <div className="label">Nome</div>
          <div className="value strong">{leadDetails.nome || "—"}</div>
        </div>
        <div className="card span-6">
          <div className="label">Contato / Email</div>
          <div className="value">
            <div>{leadDetails.contato || "N/I"}</div>
            <div className="muted">{leadDetails.email || "N/I"}</div>
          </div>
        </div>

        {/* Linha 2: Situação (4) | Origem (4) | Responsável (4) */}
        <div className="card span-4">
          <div className="label">Situação</div>
          <div className="value"><span className={`pill status ${situacaoClass}`}>{situacaoNome}</span></div>
        </div>
        <div className="card span-4">
          <div className="label">Origem</div>
          <div className="value"><span className="pill pill-soft is-primary">{refToName(leadDetails.origem, "N/A")}</span></div>
        </div>
        <div className="card span-4">
          <div className="label">Responsável</div>
          <div className="value">
            <span className="pill pill-soft is-neutral">
              {leadDetails.responsavel
                ? typeof leadDetails.responsavel === "string"
                  ? leadDetails.responsavel
                  : `${leadDetails.responsavel?.nome || "N/A"}${leadDetails.responsavel?.perfil ? ` (${leadDetails.responsavel.perfil})` : ""}`
                : "N/A"}
            </span>
          </div>
        </div>

        {/* Linha extra: Estado civil / Profissão / Nascimento */}
        <div className="card span-4">
          <div className="label">Estado Civil</div>
          <div className="value">{leadDetails.estadoCivil || "—"}</div>
        </div>
        <div className="card span-4">
          <div className="label">Profissão</div>
          <div className="value">{leadDetails.profissao || "—"}</div>
        </div>
        <div className="card span-4">
          <div className="label">Nascimento</div>
          <div className="value">{formatDateOnlyBR(leadDetails.nascimento)}</div>
        </div>

        {/* Linha única: Endereço */}
        <div className="card span-12">
          <div className="label">Endereço</div>
          <div className="value wrap">{leadDetails.endereco || "—"}</div>
        </div>

        {/* Comentário (12) ou Comentário (6) + Motivo (6) */}
        <div className={`card ${leadDetails.motivoDescarte ? "span-6" : "span-12"} note`}>
          <div className="label">Comentário</div>
          <div className="value wrap">{leadDetails.comentario || "—"}</div>
        </div>
        {leadDetails.motivoDescarte && (
          <div className="card span-6 tone-danger">
            <div className="label">Motivo do Descarte</div>
            <div className="value wrap">{refToName(leadDetails.motivoDescarte, "—")}</div>
          </div>
        )}
      </div>

      {/* Última atualização */}
      <div className="last-updated">
        Última atualização: <strong>{formatDateTime(leadDetails.updatedAt)}</strong>
      </div>

      {/* Tags (chips) + Gerenciar */}
      <div className="tags-inline">
        <div className="tags-head">
          <div className="tags-title">Tags</div>
          <button className="btn-link" onClick={() => setOpenTags(true)}>Gerenciar tags</button>
        </div>
        <div className="tags-wrap">
          {tags.length ? tags.map((tg) => <span key={tg} className="tag-chip">{tg}</span>) : <span className="tags-empty">—</span>}
        </div>
      </div>

      {/* Modais */}
      <LeadInfoFullModal isOpen={openFull} onClose={() => setOpenFull(false)} leadDetails={leadDetails} />
      <TagsModal
        isOpen={openTags}
        onClose={() => setOpenTags(false)}
        initialTags={tags}
        onSave={async (next) => await persistTags(next)}
        saving={savingTags}
      />
    </div>
  );
}

export default LeadInfo;
