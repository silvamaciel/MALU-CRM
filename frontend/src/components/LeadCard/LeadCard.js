// src/components/LeadCard/LeadCard.js
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import "./LeadCard.css";

// Formata a data para exibição
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
  } catch (e) {
    console.error("Erro ao formatar data:", dateString, e);
    return "Data inválida";
  }
};

// Retorna o status da tarefa pendente
const getTaskStatus = (task) => {
  if (!task || !task.dueDate) return null;

  const agora = new Date();
  const dueDate = new Date(task.dueDate);

  agora.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((dueDate - agora) / (1000 * 60 * 60 * 24));
  const formattedDate = dueDate.toLocaleDateString("pt-BR");

  if (diffDays < 0) return { status: "overdue", message: `Tarefa atrasada desde ${formattedDate}` };
  if (diffDays <= 2) return { status: "due-soon", message: `Tarefa vence em ${formattedDate}` };
  return { status: "ok", message: `Próxima tarefa: ${task.title}` };
};

function LeadCard({
  lead,
  onDiscardClick,
  onReactivateClick,
  isProcessingReactivation,
  onDeleteClick,
}) {
  const navigate = useNavigate();
  if (!lead) return null;

  const situacaoNome = lead.situacao?.nome || "N/A";
  const origemNome = lead.origem?.nome || "N/A";
  const responsavelNome = lead.responsavel?.nome || "N/A";
  const criadoEm = formatDate(lead.createdAt);
  const atualizadoEm = formatDate(lead.updatedAt);
  const isCurrentlyDiscarded = situacaoNome === "Descartado";
  const taskStatus = getTaskStatus(lead.pendingTask);

  const handleDiscard = () => onDiscardClick?.(lead._id, lead.nome);
  const handleReactivate = () => !isProcessingReactivation && onReactivateClick?.(lead._id);
  const handleDelete = () => onDeleteClick?.(lead._id, lead.nome);

  return (
    <div className="lead-card-kanban">
      <div className="lead-card-header" onClick={() => navigate(`/leads/${lead._id}`)}>
        {taskStatus && (taskStatus.status === "overdue" || taskStatus.status === "due-soon") && (
          <div className={`task-alert ${taskStatus.status}`} title={taskStatus.message}>
            ⏰
          </div>
        )}
        <h4>{lead.nome}</h4>
      </div>

      <div className="lead-card-body">
        <p className="lead-card-contato">{lead.contato}</p>
        <p><strong>Origem:</strong> {origemNome}</p>
        <p><strong>Responsável:</strong> {responsavelNome}</p>
        <p><strong>Criado em:</strong> {criadoEm}</p>
        <div className="card-tags-container">
          {(lead.tags || []).slice(0, 3).map((tag) => (
            <span key={tag} className="card-tag">{tag}</span>
          ))}
        </div>
      </div>

      <div className="lead-card-footer">
        <div className="footer-left">
          <small>Atualizado: {atualizadoEm}</small>
        </div>
      </div>

      <div className="lead-card-actions">
        <Link to={`/leads/${lead._id}`} className="action-button details-button">Detalhes</Link>

        {!isCurrentlyDiscarded && (
          <Link to={`/leads/${lead._id}/editar`} className="action-button edit-button">Editar</Link>
        )}

        {isCurrentlyDiscarded ? (
          <button
            onClick={handleReactivate}
            className="action-button reactivate-button"
            disabled={isProcessingReactivation}
          >
            {isProcessingReactivation ? "Reativando..." : "Reativar"}
          </button>
        ) : (
          <button onClick={handleDiscard} className="action-button discard-button">
            Descartar
          </button>
        )}

        <button onClick={handleDelete} className="action-button delete-button">
          Excluir
        </button>
      </div>
    </div>
  );
}

export default LeadCard;
