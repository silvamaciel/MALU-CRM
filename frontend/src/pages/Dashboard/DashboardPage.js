// src/pages/Dashboard/DashboardPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { getDashboardSummary } from '../../api/dashboard'; // API que acabamos de criar
import { toast } from 'react-toastify';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js'; // Importa elementos do Chart.js
import { Doughnut } from 'react-chartjs-2'; // Importa o componente do gráfico

import './DashboardPage.css'; // Criaremos este CSS

// Registra os elementos necessários para o Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, Title);

function DashboardPage() {
    const [summaryData, setSummaryData] = useState({ totalActiveLeads: 0, leadsByStatus: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Busca os dados do dashboard
    const fetchSummary = useCallback(async () => {
        setIsLoading(true); setError(null);
        try {
            const data = await getDashboardSummary();
            setSummaryData({
                 totalActiveLeads: data.totalActiveLeads || 0,
                 leadsByStatus: Array.isArray(data.leadsByStatus) ? data.leadsByStatus : []
            });
        } catch (err) {
            const errorMsg = err.message || "Falha ao carregar dados do dashboard.";
            setError(errorMsg); toast.error(errorMsg);
             setSummaryData({ totalActiveLeads: 0, leadsByStatus: [] }); // Reseta em caso de erro
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    // --- Prepara dados para o Gráfico de Pizza (Doughnut) ---
    const statusChartData = {
        // Labels (Nomes das situações)
        labels: summaryData.leadsByStatus.map(item => item.name),
        datasets: [
            {
                label: 'Leads por Situação',
                // Data (Contagens)
                data: summaryData.leadsByStatus.map(item => item.count),
                // Cores (pode definir cores fixas ou gerar dinamicamente)
                backgroundColor: [
                    'rgba(54, 162, 235, 0.7)', // Blue
                    'rgba(255, 206, 86, 0.7)', // Yellow
                    'rgba(75, 192, 192, 0.7)', // Green
                    'rgba(153, 102, 255, 0.7)', // Purple
                    'rgba(255, 159, 64, 0.7)', // Orange
                    'rgba(255, 99, 132, 0.7)', // Red
                    'rgba(201, 203, 207, 0.7)'  // Grey
                    // Adicione mais cores se tiver mais status
                ],
                borderColor: [ // Cor da borda das fatias
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(201, 203, 207, 1)'
                ],
                borderWidth: 1,
            },
        ],
    };

    const chartOptions = {
        responsive: true, // Torna o gráfico responsivo
        maintainAspectRatio: false, // Permite controlar altura/largura via CSS/container
        plugins: {
            legend: {
                position: 'top', // Posição da legenda
            },
            title: {
                display: true,
                text: 'Distribuição de Leads por Situação', // Título do Gráfico
                font: { size: 16 }
            },
             tooltip: {
                 callbacks: { // Formata o que aparece ao passar o mouse
                     label: function(context) {
                         let label = context.label || '';
                         if (label) { label += ': '; }
                         let value = context.raw || 0;
                         // Pega o total para calcular porcentagem (opcional)
                         const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                         const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                         label += `${value} (${percentage})`;
                         return label;
                     }
                 }
             }
        },
    };


    // --- Renderização ---
    if (isLoading) { return <div className="dashboard-page loading">Carregando Dashboard...</div>; }
    if (error) { return <div className="dashboard-page error"><p className="error-message">{error}</p></div>; }

    return (
        <div className="dashboard-page">
            <h1>Dashboard</h1>

            {/* Seção de Cards de Resumo */}
            <div className="summary-cards">
                <div className="summary-card">
                    <h2>Leads Ativos</h2>
                    <p className="summary-value">{summaryData.totalActiveLeads}</p>
                    <small>(Leads que não estão na situação "Descartado")</small>
                </div>
                {/* Adicione outros cards aqui (ex: Total de Leads, Novas Propostas, etc.) */}
                 <div className="summary-card placeholder">
                    <h2>Novos Leads (Mês)</h2>
                    <p className="summary-value">-</p>
                     <small>(Dados futuros)</small>
                </div>
                 <div className="summary-card placeholder">
                    <h2>Taxa de Conversão</h2>
                    <p className="summary-value">-</p>
                     <small>(Dados futuros)</small>
                </div>
            </div>

            {/* Seção de Gráficos */}
            <div className="charts-section">
                {/* Gráfico de Leads por Situação */}
                <div className="chart-container">
                    {summaryData.leadsByStatus && summaryData.leadsByStatus.length > 0 ? (
                         <Doughnut data={statusChartData} options={chartOptions} />
                    ) : (
                        <p>Não há dados de leads por situação para exibir.</p>
                    )}
                </div>

                {/* Adicione outros gráficos aqui (Leads por Origem, por Responsável, etc.) */}
                 <div className="chart-container placeholder">
                     <h3>Leads por Origem</h3>
                      <p><i>(Gráfico futuro)</i></p>
                 </div>
            </div>
        </div>
    );
}

export default DashboardPage;