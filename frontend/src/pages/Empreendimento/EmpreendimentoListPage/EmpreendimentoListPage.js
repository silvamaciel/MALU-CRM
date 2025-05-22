// src/pages/Empreendimento/EmpreendimentoListPage/EmpreendimentoListPage.js
import React from 'react';
// import './EmpreendimentoListPage.css'; // Crie este arquivo depois

function EmpreendimentoListPage() {
  return (
    <div className="admin-page"> {/* Ou uma classe específica para esta página */}
      <header className="page-header">
        <h1>Empreendimentos</h1>
        {/* Botão "Novo Empreendimento" virá aqui */}
      </header>
      <div className="page-content">
        <p>Conteúdo da lista de empreendimentos aparecerá aqui.</p>
        {/* Tabela ou Cards de Empreendimentos virão aqui */}
      </div>
    </div>
  );
}

export default EmpreendimentoListPage;