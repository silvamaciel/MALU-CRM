// src/pages/LeadDetail/components/LeadInfo.js
import React from "react";

const formatDate = (dateString) => {
  if (!dateString) return "Não informado";
  return new Date(dateString).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
};

function LeadInfo({ leadDetails }) {
  return (
    <div className="lead-details-column">
      <h2>Informações do Lead</h2>
      <div className="detail-grid">
        {[
          { label: "Nome", value: leadDetails.nome },
          { label: "Email", value: leadDetails.email },
          { label: "Contato", value: leadDetails.contato || "N/I" },
          { label: "CPF", value: leadDetails.cpf || "N/I" },
          { label: "Nascimento", value: formatDate(leadDetails.nascimento) },
          { label: "Endereço", value: leadDetails.endereco || "N/I" },
          { label: "Situação", value: leadDetails.situacao?.nome || "N/A" },
          { label: "Origem", value: leadDetails.origem?.nome || "N/A" },
          { label: "Responsável", value: `${leadDetails.responsavel?.nome || "N/A"} (${leadDetails.responsavel?.perfil || "N/A"})` },
          { label: "Criação", value: formatDate(leadDetails.createdAt) },
          { label: "Atualização", value: formatDate(leadDetails.updatedAt) },
        ].map((item, i) => (
          <div key={i} className="detail-item">
            <span className="detail-label">{item.label}:</span>
            <span className="detail-value">{item.value}</span>
          </div>
        ))}
        {leadDetails.motivoDescarte && (
          <div className="detail-item discard-info">
            <span className="detail-label">Motivo Descarte:</span>
            <span className="detail-value">{leadDetails.motivoDescarte?.nome || "(Erro ao carregar nome)"}</span>
          </div>
        )}
        <div className="detail-item comentario">
          <span className="detail-label">Comentário:</span>
          <span className="detail-value comentario-value">{leadDetails.comentario || "-"}</span>
        </div>
      </div>
    </div>
  );
}

export default LeadInfo;
