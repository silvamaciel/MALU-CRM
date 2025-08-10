// src/pages/Dashboard/DashboardPage.js
import React, { useState } from 'react';
import './DashboardPage.css';
import LeadSummaryDashboard from '../../components/Dashboard/LeadSummaryDashboard/LeadSummaryDashboard';
import FinancialDashboard from '../../components/Dashboard/FinancialDashboard/FinancialDashboard';

function DashboardPage() {
  const [activeView, setActiveView] = useState('leads');
  const [timeFilter, setTimeFilter] = useState('month');

  return (
    <div className="admin-page dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <h1 className="dashboard-title">Dashboard</h1>

          {/* Bloco de filtros/abas empacotado e responsivo */}
          <div className="filters-stack">
            {/* VISÃO */}
            <div className="segmented view-toggle-buttons" role="tablist" aria-label="Visão">
              <button
                role="tab"
                aria-selected={activeView === 'leads'}
                onClick={() => setActiveView('leads')}
                className={`button ${activeView === 'leads' ? 'primary-button' : 'outline-button'}`}
              >
                Visão de Leads
              </button>
              <button
                role="tab"
                aria-selected={activeView === 'financeiro'}
                onClick={() => setActiveView('financeiro')}
                className={`button ${activeView === 'financeiro' ? 'primary-button' : 'outline-button'}`}
              >
                Visão Financeira
              </button>
            </div>

            {/* PERÍODO */}
            <div className="segmented time-filter-buttons" role="tablist" aria-label="Período">
              <button
                role="tab"
                aria-selected={timeFilter === 'month'}
                onClick={() => setTimeFilter('month')}
                className={`button small-button ${timeFilter === 'month' ? 'active' : ''}`}
              >
                Este Mês
              </button>
              <button
                role="tab"
                aria-selected={timeFilter === 'year'}
                onClick={() => setTimeFilter('year')}
                className={`button small-button ${timeFilter === 'year' ? 'active' : ''}`}
              >
                Este Ano
              </button>
              <button
                role="tab"
                aria-selected={timeFilter === 'all'}
                onClick={() => setTimeFilter('all')}
                className={`button small-button ${timeFilter === 'all' ? 'active' : ''}`}
              >
                Total
              </button>
            </div>
          </div>
        </header>

        <main className="dashboard-body">
          <section className="dashboard-content">
            {activeView === 'leads' && <LeadSummaryDashboard filter={timeFilter} />}
            {activeView === 'financeiro' && <FinancialDashboard filter={timeFilter} />}
          </section>
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;
