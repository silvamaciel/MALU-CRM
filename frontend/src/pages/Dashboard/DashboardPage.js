// src/pages/Dashboard/DashboardPage.js
import React, { useState } from 'react';
import './DashboardPage.css';

// Importe seu dashboard de leads existente e o novo financeiro
import LeadSummaryDashboard from '../../components/Dashboard/LeadSummaryDashboard/LeadSummaryDashboard'; // <<< ENVOLVA SEU DASHBOARD ATUAL NISTO
import FinancialDashboard from '../../components/Dashboard/FinancialDashboard/FinancialDashboard';     // <<< IMPORTE O NOVO

function DashboardPage() {
    // Estado para controlar a visão ativa
    const [activeView, setActiveView] = useState('leads'); // 'leads' ou 'financeiro'

    return (
        <div className="admin-page dashboard-page">
            <header className="page-header">
                <h1>Dashboard</h1>
                {/* VVVVV BOTÕES DE ALTERNÂNCIA DE VISÃO VVVVV */}
                <div className="view-toggle-buttons">
                    <button 
                        onClick={() => setActiveView('leads')}
                        className={`button ${activeView === 'leads' ? 'primary-button' : 'outline-button'}`}
                    >
                        Visão de Leads
                    </button>
                    <button 
                        onClick={() => setActiveView('financeiro')}
                        className={`button ${activeView === 'financeiro' ? 'primary-button' : 'outline-button'}`}
                    >
                        Visão Financeira
                    </button>
                </div>
                {/* ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ */}
            </header>
            <div className="page-content">
                {/* Renderiza o dashboard correto com base na visão ativa */}
                {activeView === 'leads' ? <LeadSummaryDashboard /> : <FinancialDashboard />}
            </div>
        </div>
    );
}

export default DashboardPage;