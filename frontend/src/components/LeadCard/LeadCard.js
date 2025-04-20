// src/components/LeadCard/LeadCard.js
import React from "react";
import { Link } from "react-router-dom"; // Import necessário
import "./LeadCard.css";

// Função auxiliar para formatar data
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

// <<< Recebe as novas props: onReactivateClick, isProcessingReactivation >>>
function LeadCard({
  lead,
  onDiscardClick,
  onReactivateClick,
  isProcessingReactivation,
  onDeleteClick,
}) {
  if (!lead) {
    return null;
  }

  // Extrai informações necessárias
  const situacaoNome = lead.situacao?.nome || "N/A"; // Nome da situação atual
  const origemNome = lead.origem?.nome || "N/A";
  const responsavelNome = lead.responsavel?.nome || "N/A";
  const criadoEm = formatDate(lead.createdAt);
  const atualizadoEm = formatDate(lead.updatedAt);

  // <<< Verifica se a situação atual é "Descartado" >>>
  // !!! Use o nome EXATO como está no seu banco de dados !!!
  const isCurrentlyDiscarded = situacaoNome === "Descartado";

  // Handler interno para chamar a prop de descarte
  const handleDiscard = () => {
    if (onDiscardClick) {
      onDiscardClick(lead._id, lead.nome);
    }
  };

  // Handler interno para chamar a prop de reativação
  const handleReactivate = () => {
    // Só chama se não estiver processando E a prop existir
    if (!isProcessingReactivation && onReactivateClick) {
      onReactivateClick(lead._id);
    }
  };

  // <<< Novo Handler para Delete >>>
  const handleDelete = () => {
    if (onDeleteClick) {
      onDeleteClick(lead._id, lead.nome);
    }
  };

  return (
    <div className="lead-card">
      <h3>{lead.nome || "Lead sem nome"}</h3>
      <p>
        <strong>Email:</strong> {lead.email || "N/A"}
      </p>
      <p>
        <strong>Contato:</strong> {lead.contato || "N/A"}
      </p>
      {lead.cpf && (
        <p>
          <strong>CPF:</strong> {lead.cpf}
        </p>
      )}
      <p>
        <strong>Situação:</strong>{" "}
        <span
          className={`situacao situacao-${situacaoNome
            .toLowerCase()
            .replace(/\s+/g, "-")}`}
        >
          {situacaoNome}
        </span>
      </p>
      <p>
        <strong>Origem:</strong> {origemNome}
      </p>
      <p>
        <strong>Responsável:</strong> {responsavelNome}
      </p>
      {/* Mostra motivo do descarte APENAS se estiver descartado E houver motivo */}
      {isCurrentlyDiscarded && lead.motivoDescarte && (
        <p className="discard-reason">
          <strong>Motivo Descarte:</strong> {lead.motivoDescarte?.nome}{" "}
          {/* Acessa o nome */}
        </p>
      )}
      <p className="datas">
        Criado em: {criadoEm} | Atualizado em: {atualizadoEm}
      </p>

      {/* --- Área de Ações com Botão Condicional --- */}
      <div className="lead-card-actions">
        <Link
          to={`/leads/${lead._id}`}
          className="action-button details-button"
        >
          Detalhes
        </Link>

        {/* Opcional: Não mostrar Editar se estiver descartado */}
        {!isCurrentlyDiscarded && (
          <Link
            to={`/leads/${lead._id}/editar`}
            className="action-button edit-button"
          >
            Editar
          </Link>
        )}

        {/* Renderiza "Reativar" ou "Descartar" baseado no status */}
        {isCurrentlyDiscarded ? (
          <button
            onClick={handleReactivate}
            className="action-button reactivate-button" // Estilo para reativar
            disabled={isProcessingReactivation} // Desabilita durante o clique
          >
            {/* Mostra texto "Reativando..." se for este lead específico */}
            {isProcessingReactivation ? "Reativando..." : "Reativar"}
          </button>
        ) : (
          <button
            onClick={handleDiscard}
            className="action-button discard-button" // Estilo para descartar
          >
            Descartar
          </button>
        )}

        <button onClick={handleDelete} className="action-button delete-button">
          Excluir
        </button>
        {/* --- Fim Botão Condicional --- */}
      </div>
    </div>
  );
}

export default LeadCard;
