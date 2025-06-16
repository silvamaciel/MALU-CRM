// src/components/Dashboard/LeadSummaryDashboard/LeadSummaryDashboard.js
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './LeadSummaryDashboard.css'; // Criaremos este CSS

const formatDataForChart = (data, keyName = 'nome', valueName = 'count') => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
        name: item[keyName],
        Leads: item[valueName]
    }));
};

function LeadSummaryDashboard({ data, loading, error }) {
    if (loading) {
        return <div className="loading-message">Carregando resumo de leads...</div>;
    }
    if (error || !data) {
        return <div className="error-message">{error || "Não foi possível carregar os dados."}</div>;
    }
    
    const leadsByStageData = formatDataForChart(data.leadsByStage);
    const leadsByOrigemData = formatDataForChart(data.leadsByOrigem);
    const leadsByResponsavelData = formatDataForChart(data.leadsByResponsavel);

    return (
        <div className="lead-summary-dashboard">
            <div className="kpi-card-container">
                <div className="kpi-card">
                    <span className="kpi-value">{data.totalLeadsPeriodo || 0}</span>
                    <span className="kpi-label">Total de Leads no Período</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-value">{data.descartadosPeriodo || 0}</span>
                    <span className="kpi-label">Descartados no Período</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-value">{data.leadsUltimos7Dias || 0}</span>
                    <span className="kpi-label">Leads nos Últimos 7 Dias</span>
                </div>
            </div>

            <div className="charts-container">
                <div className="chart-wrapper">
                    <h3>Leads por Situação</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={leadsByStageData} layout="vertical" /* ... */ >
                            {/* ... seus Bar, XAxis, YAxis ... */}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="chart-wrapper">
                    <h3>Leads por Origem</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={leadsByOrigemData} /* ... */ >
                            {/* ... seus Bar, XAxis, YAxis ... */}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="chart-wrapper full-width-chart">
                    <h3>Leads por Responsável</h3>
                    <ResponsiveContainer width="100%" height={300}>
                         <BarChart data={leadsByResponsavelData} /* ... */ >
                            {/* ... seus Bar, XAxis, YAxis ... */}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

export default LeadSummaryDashboard;