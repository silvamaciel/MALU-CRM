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
            <header className="page-header">
                <h1>Dashboard</h1>
                <div className="dashboard-controls">
                    {/* Botões para alternar a VISÃO */}
                    <div className="view-toggle-buttons">
                        <button onClick={() => setActiveView('leads')} className={`button ${activeView === 'leads' ? 'primary-button' : 'outline-button'}`}>Visão de Leads</button>
                        <button onClick={() => setActiveView('financeiro')} className={`button ${activeView === 'financeiro' ? 'primary-button' : 'outline-button'}`}>Visão Financeira</button>
                    </div>
                    {/* Botões para alternar o PERÍODO */}
                    <div className="time-filter-buttons">
                        <button onClick={() => setTimeFilter('month')} className={`button small-button ${timeFilter === 'month' ? 'active' : ''}`}>Este Mês</button>
                        <button onClick={() => setTimeFilter('year')} className={`button small-button ${timeFilter === 'year' ? 'active' : ''}`}>Este Ano</button>
                        <button onClick={() => setTimeFilter('all')} className={`button small-button ${timeFilter === 'all' ? 'active' : ''}`}>Total</button>
                    </div>
                </div>
            </header>
            <div className="page-content">
                {/* Renderiza o componente de dashboard correto, passando o filtro */}
                {activeView === 'leads' && <LeadSummaryDashboard filter={timeFilter} />}
                {activeView === 'financeiro' && <FinancialDashboard filter={timeFilter} />}
            </div>
        </div>
    );
}

export default DashboardPage;