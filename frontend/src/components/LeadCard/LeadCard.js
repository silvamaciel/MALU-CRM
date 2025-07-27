// src/components/LeadCard/LeadCard.js
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LeadCard.css";

// Formatador de data
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

// Avaliador de status da tarefa
const getTaskStatus = (task) => {
  if (!task || !task.dueDate) return null;

  const now = new Date();
  const due = new Date(task.dueDate);
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  const formattedDate = due.toLocaleDateString("pt-BR");

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
    <div className="lead-card">
      <div className="lead-card-header" onClick={() => navigate(`/leads/${lead._id}`)}>
        <h3>{lead.nome || "Lead sem nome"}</h3>
        {taskStatus && (taskStatus.status === 'overdue' || taskStatus.status === 'due-soon') && (
          <div className={`task-alert ${taskStatus.status}`} title={taskStatus.message}>
            <i className="fas fa-clock" />
          </div>
        )}
      </div>

      <p><strong>Email:</strong> {lead.email || "N/A"}</p>
      <p><strong>Contato:</strong> {lead.contato || "N/A"}</p>
      {lead.cpf && <p><strong>CPF:</strong> {lead.cpf}</p>}

      <p>
        <strong>Situação:</strong>{" "}
        <span className={`situacao situacao-${situacaoNome.toLowerCase().replace(/\s+/g, "-")}`}>
          {situacaoNome}
        </span>
      </p>
      <p><strong>Origem:</strong> {origemNome}</p>
      <p><strong>Responsável:</strong> {responsavelNome}</p>

      {isCurrentlyDiscarded && lead.motivoDescarte && (
        <p className="discard-reason">
          <strong>Motivo Descarte:</strong> {lead.motivoDescarte?.nome}
        </p>
      )}

      <p className="datas">Criado em: {criadoEm} | Atualizado em: {atualizadoEm}</p>

      <div className="lead-card-actions">
        <Link to={`/leads/${lead._id}`} className="action-button details-button">Detalhes</Link>

        {!isCurrentlyDiscarded && (
          <Link to={`/leads/${lead._id}/editar`} className="action-button edit-button">
            Editar
          </Link>
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
