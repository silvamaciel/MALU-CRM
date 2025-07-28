// src/pages/LeadDetail/components/LeadHeaderActions.js
import React from "react";
import { Link } from "react-router-dom";

function LeadHeaderActions({ id, leadDetails, situacoesList, isReactivating, onDiscard, onReactivate, onDelete, onReserva }) {
  const isCurrentlyDiscarded = leadDetails?.situacao?.nome === "Descartado";
  const isReservaInvalida = ["Em Reserva", "Proposta", "Vendido"].includes(leadDetails?.situacao?.nome);

  return (
    <div className="detail-header">
      <h1>Detalhes do Lead: {leadDetails.nome}</h1>
      <div className="header-actions">
        <Link to="/leads" className="button back-button">Voltar</Link>
        {!isCurrentlyDiscarded && (
          <Link to={`/leads/${id}/editar`} className="button edit-button">Editar</Link>
        )}
        {isCurrentlyDiscarded ? (
          <button className="button reactivate-button" onClick={onReactivate} disabled={isReactivating}>
            {isReactivating ? "Reativando..." : "Reativar Lead"}
          </button>
        ) : (
          <button className="button discard-button-detail" onClick={onDiscard}>Descartar Lead</button>
        )}
        <button className="button delete-button-detail" onClick={onDelete}>Excluir</button>
        {!isCurrentlyDiscarded && !isReservaInvalida && (
          <button className="button action-button" onClick={onReserva} style={{ marginLeft: "10px" }}>
            Criar Reserva
          </button>
        )}
      </div>
    </div>
  );
}

export default LeadHeaderActions;
