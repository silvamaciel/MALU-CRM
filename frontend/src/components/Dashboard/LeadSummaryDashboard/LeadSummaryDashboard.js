// src/components/Dashboard/LeadSummaryDashboard/LeadSummaryDashboard

import React, { useState, useEffect, useCallback } from 'react';
import { getDashboardSummary } from '../../../api/dashboard';
// import { toast } from 'react-toastify'; // Removido import não usado
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend, Title, CategoryScale, LinearScale, BarElement, PointElement, LineElement
} from 'chart.js';
import { Doughnut, Pie, Bar, Line } from 'react-chartjs-2';
import './LeadSummaryDashboard.css';

// Registra elementos Chart.js
ChartJS.register(
    ArcElement, Tooltip, Legend, Title, CategoryScale, LinearScale, BarElement, PointElement, LineElement
);

// Função auxiliar para cores
const generateBgColors = (count) => {
    const colors = [
        'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)', 'rgba(255, 99, 132, 0.7)',
        'rgba(201, 203, 207, 0.7)', 'rgba(100, 180, 120, 0.7)', 'rgba(240, 130, 190, 0.7)',
        'rgba(0, 210, 210, 0.7)', 'rgba(170, 140, 255, 0.7)', 'rgba(255, 180, 100, 0.7)'
    ];
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
};
const generateBorderColors = (bgColors) => bgColors.map(c => c.replace('0.7', '1'));


function DashboardPage() {
    const [summaryData, setSummaryData] = useState({
        totalActiveLeads: 0, leadsByStatus: [], leadsByOrigin: [],
        leadsByResponsible: [], leadsByDate: [], totalDiscardedLeads: 0, totalNewLeadsThisMonth: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Busca dados
    const fetchSummary = useCallback(async () => {
        setIsLoading(true); setError(null);
        try {
            const data = await getDashboardSummary();
            setSummaryData({
                 totalActiveLeads: data.totalActiveLeads ?? 0,
                 leadsByStatus: Array.isArray(data.leadsByStatus) ? data.leadsByStatus : [],
                 leadsByOrigin: Array.isArray(data.leadsByOrigin) ? data.leadsByOrigin : [],
                 leadsByResponsible: Array.isArray(data.leadsByResponsible) ? data.leadsByResponsible : [],
                 leadsByDate: Array.isArray(data.leadsByDate) ? data.leadsByDate : [],
                 totalDiscardedLeads: data.totalDiscardedLeads ?? 0,
                 totalNewLeadsThisMonth: data.totalNewLeadsThisMonth ?? 0 
            });
        } catch (err) {
            const errorMsg = err.message || "Falha ao carregar dados do dashboard.";
            setError(errorMsg);
            // Poderia usar toast aqui se quisesse: toast.error(errorMsg);
             setSummaryData({ totalActiveLeads: 0, leadsByStatus: [], leadsByOrigin: [], leadsByResponsible: [], leadsByDate: [], totalDiscardedLeads: 0, totalNewLeadsThisMonth: 0});
        } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    // --- Prepara dados para os Gráficos ---
    const chartOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' }, title: { display: false },
             tooltip: { callbacks: { label: function(context) { /* ... formatação tooltip ... */ } } }
        },
    };
    // (Coloque aqui a implementação completa da função de callback do tooltip se precisar)
    const statusChartData = {
        labels: summaryData.leadsByStatus.map(item => item.name),
        datasets: [{ label: 'Leads por Situação', data: summaryData.leadsByStatus.map(item => item.count),
                     backgroundColor: generateBgColors(summaryData.leadsByStatus.length),
                     borderColor: generateBorderColors(generateBgColors(summaryData.leadsByStatus.length)), borderWidth: 1 }],
    };
    const statusChartOptions = { ...chartOptions, plugins: { ...chartOptions.plugins, title: {display: true, text: 'Leads por Situação'}}};
    const originChartData = {
        labels: summaryData.leadsByOrigin.map(item => item.name),
        datasets: [{ label: 'Leads por Origem', data: summaryData.leadsByOrigin.map(item => item.count),
                     backgroundColor: generateBgColors(summaryData.leadsByOrigin.length),
                     borderColor: generateBorderColors(generateBgColors(summaryData.leadsByOrigin.length)), borderWidth: 1 }],
    };
    const originChartOptions = { ...chartOptions, plugins: { ...chartOptions.plugins, title: {display: true, text: 'Leads por Origem'}}};
    const responsibleChartData = {
        labels: summaryData.leadsByResponsible.map(item => item.name),
        datasets: [{ label: 'Leads por Responsável', data: summaryData.leadsByResponsible.map(item => item.count),
                     backgroundColor: generateBgColors(summaryData.leadsByResponsible.length) }],
    };
     const responsibleChartOptions = { responsive: true, maintainAspectRatio: false, indexAxis: 'y', // Barras Horizontais
        plugins: { legend: { display: false }, title: { display: true, text: 'Leads por Responsável'}},
        scales: { x: { beginAtZero: true } } };
    const dateChartData = {
        labels: summaryData.leadsByDate.map(item => item.date),
        datasets: [{ label: 'Leads Criados por Dia', data: summaryData.leadsByDate.map(item => item.count),
                     fill: true, borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.2)', tension: 0.1 }],
    };
    const dateChartOptions = { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: true, text: 'Leads Criados (Últimos 30 dias)'}},
        scales: { y: { beginAtZero: true } } };

    // --- Renderização ---
    if (isLoading) { return <div className="dashboard-page loading">Carregando Dashboard...</div>; }
    if (error) { return <div className="dashboard-page error"><p className="error-message">{error}</p></div>; }

    return (
        <div className="dashboard-page">
            <h1>Dashboard</h1>
            {/* Cards de Resumo */}
            <div className="summary-cards">
                <div className="summary-card"><h2>Leads Ativos</h2><p className="summary-value">{summaryData.totalActiveLeads}</p><small>(Não descartados)</small></div>
                <div className="summary-card"><h2>Novos Leads (Mês)</h2><p className="summary-value">{summaryData.totalNewLeadsThisMonth}</p><small>(Leads cadastrados neste mês)</small></div>
                <div className="summary-card"><h2>Leads Descartados</h2><p className="summary-value">{summaryData.totalDiscardedLeads}</p><small>(Todos os Leads Descartados)</small></div>
            </div>
            {/* Seção de Gráficos */}
            <div className="charts-section">
                {/* Gráfico Situação */}
                <div className="chart-container">
                    {summaryData.leadsByStatus.length > 0 ? (
                         <Doughnut data={statusChartData} options={statusChartOptions} /> 
                    ) : ( <p>Sem dados por situação.</p> )}
                </div>
                 {/* Gráfico Origem */}
                <div className="chart-container">
                     {summaryData.leadsByOrigin.length > 0 ? (
                          <Pie data={originChartData} options={originChartOptions} />
                     ) : ( <p>Sem dados por origem.</p> )}
                 </div>
                  {/* Gráfico Responsável */}
                  <div className="chart-container chart-container-bar">
                     {summaryData.leadsByResponsible.length > 0 ? (
                          <Bar data={responsibleChartData} options={responsibleChartOptions} />
                     ) : ( <p>Sem dados por responsável.</p> )}
                 </div>
                  {/* Gráfico Data */}
                  <div className="chart-container chart-container-line">
                     {summaryData.leadsByDate.length > 0 ? (
                          <Line data={dateChartData} options={dateChartOptions} />
                     ) : ( <p>Sem dados de leads recentes.</p> )}
                 </div>
            </div>
        </div>
    );
}

export default DashboardPage;