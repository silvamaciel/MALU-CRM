// src/components/LeadCard/LeadCard.js
import React from "react";
import { useNavigate } from "react-router-dom";
import "./LeadCard.css";

// Formata a data
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    const dia = String(date.getUTCDate()).padStart(2, "0");
    const mes = String(date.getUTCMonth() + 1).padStart(2, "0");
    const ano = date.getUTCFullYear();
    const hora = String(date.getUTCHours()).padStart(2, "0");
    const minuto = String(date.getUTCMinutes()).padStart(2, "0");

    return `${dia}/${mes}/${ano}, ${hora}:${minuto}`;
  } catch {
    return "Data inválida";
  }
};

// Status da tarefa
const getNextPendingTaskInfo = (tasks = []) => {
  const pendentes = tasks.filter(t => t.status !== "Concluída" && t.dueDate);
  const ordenadas = [...pendentes].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return {
    nextTask: ordenadas[0] || null,
    remainingCount: pendentes.length > 1 ? pendentes.length - 1 : 0,
  };
};
const getTaskStatus = (task) => {
  if (!task?.dueDate) return null;

  const agora = new Date();
  const dueDate = new Date(task.dueDate);
  agora.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((dueDate - agora) / (1000 * 60 * 60 * 24));
  const formattedDate = dueDate.toLocaleDateString("pt-BR");

  if (diffDays < 0) {
    return { status: "overdue", message: `Atrasada desde ${formattedDate}` };
  }

  if (diffDays <= 2) {
    return { status: "due-soon", message: `Vence em ${formattedDate}` };
  }

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

  const { nextTask, remainingCount } = getNextPendingTaskInfo(lead.tasks || []);
  const taskStatus = nextTask ? getTaskStatus(nextTask) : null;

  const situacaoNome = lead.situacao?.nome || "N/A";
  const origemNome = lead.origem?.nome || "N/A";
  const responsavelNome = lead.responsavel?.nome || "N/A";
  const criadoEm = formatDate(lead.createdAt);
  const atualizadoEm = formatDate(lead.updatedAt);
  const isDescartado = situacaoNome.toLowerCase() === "descartado";

  return (
    <div className="lead-card-kanban">

      <div className="lead-name">
        <h4>{lead.nome}</h4>
      </div>
      <div className="lead-card-header" onClick={() => navigate(`/leads/${lead._id}`)}>
        {nextTask && (
          <div
            className={`task-badge ${taskStatus.status}`}
            title={lead.tasks
              ?.filter(t => t.status !== 'Concluída')
              .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
              .map(t => `${formatDate(t.dueDate)} - ${t.title}`)
              .join('\n')}
          >
            ⏰ {formatDate(nextTask.dueDate)} - {nextTask.title.slice(0, 20)}...
            {remainingCount > 0 && (
              <span className="extra-tasks"> +{remainingCount} tarefa(s)</span>
            )}
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
