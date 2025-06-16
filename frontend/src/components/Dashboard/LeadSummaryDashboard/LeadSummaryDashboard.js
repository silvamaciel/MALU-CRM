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
                        <BarChart data={leadsByStageData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" width={120} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Leads" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="chart-wrapper">
                    <h3>Leads por Origem</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={leadsByOrigemData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Leads" fill="#82ca9d" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="chart-wrapper full-width-chart">
                    <h3>Leads por Responsável</h3>
                    <ResponsiveContainer width="100%" height={300}>
                         <BarChart data={leadsByResponsavelData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Leads" fill="#ffc658" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

export default LeadSummaryDashboard;