// src/components/LeadCard/LeadCard.js
import React from "react";
import { useNavigate } from "react-router-dom";
import "./LeadCard.css";

// Formata a data
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Data inválida";
  }
};

// Status da tarefa
const getTaskStatus = (task) => {
  if (!task || !task.dueDate) return null;

  const agora = new Date();
  const dueDate = new Date(task.dueDate);
  agora.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((dueDate - agora) / (1000 * 60 * 60 * 24));
  const formattedDate = dueDate.toLocaleDateString("pt-BR");

  if (task.status === "Concluída") {
    return { status: "completed", message: `Tarefa concluída (${formattedDate})` };
  }

  if (diffDays < 0) {
    return { status: "overdue", message: `Atrasada desde ${formattedDate}` };
  }

  if (diffDays <= 2) {
    return { status: "due-soon", message: `Vence em ${formattedDate}` };
  }

  // Corrigido: status 'pending' ao invés de 'ok'
  return { status: "pending", message: `Prevista para ${formattedDate}` };
};

function LeadCard({
  lead,
  onDiscardClick,
  onReactivateClick,
  onDeleteClick,
  onTagsClick,
  isProcessingReactivation = false,
}) {
  const navigate = useNavigate();
  if (!lead) return null;

  const situacaoNome = lead.situacao?.nome || "N/A";
  const origemNome = lead.origem?.nome || "N/A";
  const responsavelNome = lead.responsavel?.nome || "N/A";
  const criadoEm = formatDate(lead.createdAt);
  const atualizadoEm = formatDate(lead.updatedAt);
  const isDescartado = situacaoNome.toLowerCase() === "descartado";
  const taskStatus = getTaskStatus(lead.pendingTask);

  return (
    <div className="lead-card-kanban">

      <div className="lead-name">
          <h4>{lead.nome}</h4>
        </div>
      <div className="lead-card-header" onClick={() => navigate(`/leads/${lead._id}`)}>
        {lead.pendingTask && (
          <div
            className={`task-badge ${taskStatus.status}`}
            title={`${formatDate(lead.pendingTask.dueDate)} - ${lead.pendingTask.title}`}
          >
            ⏰ {formatDate(lead.pendingTask.dueDate)} - {lead.pendingTask.title.slice(0, 20)}...
          </div>
        )}
      </div>

      <div className="lead-card-body">
        <p className="lead-card-contato">{lead.contato || "Sem contato"}</p>
        <p><strong>Responsável:</strong> {responsavelNome}</p>
        {lead.tags?.length > 0 && (
          <div className="card-tags-container">
            {lead.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="card-tag">{tag}</span>
            ))}
            {lead.tags.length > 3 && (
              <span className="card-tag more-tags">+{lead.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="lead-card-footer">
        <small>Atualizado: {atualizadoEm}</small>
        <div className="lead-card-actions">
          <button onClick={() => navigate(`/leads/${lead._id}`)} className="action-icon" title="Detalhes">🔍</button>
          <button onClick={() => onTagsClick?.(lead)} className="action-icon" title="Gerenciar Tags">🏷️</button>

          {isDescartado ? (
            <button onClick={() => onReactivateClick?.(lead)} className="action-icon" disabled={isProcessingReactivation} title="Reativar">♻️</button>
          ) : (
            <button onClick={() => onDiscardClick?.(lead)} className="action-icon" disabled={isProcessingReactivation} title="Descartar">🗑️</button>
          )}
          <button onClick={() => onDeleteClick?.(lead)} className="action-icon" disabled={isProcessingReactivation} title="Excluir">❌</button>
        </div>
      </div>
    </div>
  );
}

export default LeadCard;
