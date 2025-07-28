// src/pages/LeadDetail/components/LeadHistory.js
import React from "react";
import LeadTagsManager from "../../../components/LeadTagsManager/LeadTagsManager";

const formatDate = (dateString) => {
  if (!dateString) return "Não informado";
  return new Date(dateString).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
};

function LeadHistory({ historyList, isLoadingHistory, historyError, leadDetails, onTagsUpdated }) {
  return (
    <div className="lead-history-column">
      <h2>Histórico de Alterações</h2>
      {isLoadingHistory && <p>Carregando histórico...</p>}
      {!isLoadingHistory && historyError && <p className="error-message">{historyError}</p>}
      {!isLoadingHistory && !historyError && (
        <ul className="lead-history-list">
          {historyList.length > 0 ? (
            historyList.map((entry) => (
              <li key={entry._id} className="history-entry">
                <span className="history-timestamp">{formatDate(entry.createdAt)}</span>
                <strong className="history-action">{entry.action}:</strong>
                <span className="history-details">{entry.details || "-"}</span>
                {entry.user && <span className="history-user"> por {entry.user.nome || "?"}</span>}
              </li>
            ))
          ) : (
            <p>Nenhum histórico registrado.</p>
          )}
        </ul>
      )}
      <div className="detail-item-section">
        <LeadTagsManager
          leadId={leadDetails._id}
          currentTags={leadDetails.tags}
          onTagsUpdated={onTagsUpdated}
        />
      </div>
    </div>
  );
}

export default LeadHistory;
