// src/pages/Dashboard/DashboardPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { getDashboardSummary } from '../../api/dashboard';
import { toast } from 'react-toastify';
// <<< 1. Importar mais elementos do Chart.js e os novos tipos de gráfico >>>
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend, Title, CategoryScale, LinearScale, BarElement, PointElement, LineElement
} from 'chart.js';
import { Doughnut, Pie, Bar, Line } from 'react-chartjs-2'; // Importa Pie, Bar, Line

import './DashboardPage.css'; // Mantém o CSS

// <<< 2. Registrar os novos elementos necessários >>>
ChartJS.register(
    ArcElement, Tooltip, Legend, Title, // Para Pie/Doughnut
    CategoryScale, LinearScale, BarElement, // Para Bar
    PointElement, LineElement // Para Line
);

// Função auxiliar para gerar cores (opcional)
const generateBgColors = (count) => {
    const colors = [
        'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)', 'rgba(255, 99, 132, 0.7)',
        'rgba(201, 203, 207, 0.7)', 'rgba(100, 180, 120, 0.7)', 'rgba(240, 130, 190, 0.7)',
        'rgba(0, 210, 210, 0.7)', 'rgba(170, 140, 255, 0.7)', 'rgba(255, 180, 100, 0.7)'
    ];
    // Repete cores se necessário
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}


function DashboardPage() {
    // State para guardar TODOS os dados do resumo
    const [summaryData, setSummaryData] = useState({
        totalActiveLeads: 0,
        leadsByStatus: [],
        leadsByOrigin: [],      // <<< Novo
        leadsByResponsible: [], // <<< Novo
        leadsByDate: []         // <<< Novo
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Busca os dados (função não muda)
    const fetchSummary = useCallback(async () => {
        setIsLoading(true); setError(null);
        try {
            const data = await getDashboardSummary();
            setSummaryData({ // Salva todos os dados recebidos
                 totalActiveLeads: data.totalActiveLeads || 0,
                 leadsByStatus: Array.isArray(data.leadsByStatus) ? data.leadsByStatus : [],
                 leadsByOrigin: Array.isArray(data.leadsByOrigin) ? data.leadsByOrigin : [],
                 leadsByResponsible: Array.isArray(data.leadsByResponsible) ? data.leadsByResponsible : [],
                 leadsByDate: Array.isArray(data.leadsByDate) ? data.leadsByDate : []
            });
        } catch (err) { /* ... tratamento erro ... */ }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    // --- Preparação de Dados para os Gráficos ---

    // Gráfico por Situação (Doughnut) - Igual antes
    const statusChartData = {
        labels: summaryData.leadsByStatus.map(item => item.name),
        datasets: [{
            label: 'Leads por Situação',
            data: summaryData.leadsByStatus.map(item => item.count),
            backgroundColor: generateBgColors(summaryData.leadsByStatus.length),
            borderWidth: 1,
        }],
    };

    // <<< NOVO: Gráfico por Origem (Pie/Doughnut) >>>
    const originChartData = {
        labels: summaryData.leadsByOrigin.map(item => item.name),
        datasets: [{
            label: 'Leads por Origem',
            data: summaryData.leadsByOrigin.map(item => item.count),
            backgroundColor: generateBgColors(summaryData.leadsByOrigin.length),
            borderWidth: 1,
        }],
    };

     // <<< NOVO: Gráfico por Responsável (Bar) >>>
     const responsibleChartData = {
        labels: summaryData.leadsByResponsible.map(item => item.name), // Nomes no eixo X
        datasets: [{
            label: 'Leads por Responsável',
            data: summaryData.leadsByResponsible.map(item => item.count), // Altura das barras
            backgroundColor: generateBgColors(summaryData.leadsByResponsible.length), // Cores das barras
            // Pode adicionar bordas se quiser:
            // borderColor: generateBgColors(summaryData.leadsByResponsible.length).map(c => c.replace('0.7', '1')),
            // borderWidth: 1,
        }],
    };
     const responsibleChartOptions = {
        indexAxis: 'y', // <<< Deixa as barras na horizontal (opcional)
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: true, text: 'Leads por Responsável', font: { size: 16 }}},
        scales: { x: { beginAtZero: true } } // Garante que eixo X começa em 0
    };


     // <<< NOVO: Gráfico Leads Criados por Data (Line) >>>
      const dateChartData = {
        labels: summaryData.leadsByDate.map(item => item.date), // Datas (YYYY-MM-DD) no eixo X
        datasets: [{
            label: 'Leads Criados por Dia (Últimos 30 dias)',
            data: summaryData.leadsByDate.map(item => item.count), // Contagens no eixo Y
            fill: false, // Não preenche área abaixo da linha
            borderColor: 'rgb(75, 192, 192)', // Cor da linha
            tension: 0.1 // Suaviza a linha (0 = reto)
        }],
    };
     const dateChartOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: true, text: 'Leads Criados Recentemente', font: { size: 16 }}},
        scales: { y: { beginAtZero: true } } // Garante que eixo Y começa em 0
    };


    // --- Renderização ---
    if (isLoading) { /* ... loading ... */ }
    if (error) { /* ... error ... */ }

    return (
        <div className="dashboard-page">
            <h1>Dashboard</h1>

            {/* Cards de Resumo (igual antes) */}
            <div className="summary-cards">
                <div className="summary-card">
                    <h2>Leads Ativos</h2>
                    <p className="summary-value">{summaryData.totalActiveLeads}</p>
                    <small>(Não descartados)</small>
                </div>
                <div className="summary-card placeholder"> /* ... */ </div>
                <div className="summary-card placeholder"> /* ... */ </div>
            </div>

            {/* Seção de Gráficos ATUALIZADA */}
            <div className="charts-section">
                {/* Gráfico Situação */}
                <div className="chart-container">
                    {summaryData.leadsByStatus.length > 0 ? (
                         <Doughnut data={statusChartData} options={chartOptions} />
                    ) : ( <p>Sem dados por situação.</p> )}
                </div>

                 {/* <<< NOVO Gráfico Origem >>> */}
                <div className="chart-container">
                     <h3>Leads por Origem</h3> {/* Título opcional acima do chart */}
                     {summaryData.leadsByOrigin.length > 0 ? (
                          <Pie data={originChartData} options={{...chartOptions, title: { display: true, text: 'Leads por Origem'}}} /> // Usando Pie, pode ser Doughnut
                     ) : ( <p>Sem dados por origem.</p> )}
                 </div>

                  {/* <<< NOVO Gráfico Responsável >>> */}
                  <div className="chart-container chart-container-bar"> {/* Classe extra opcional para ajustar altura */}
                     {summaryData.leadsByResponsible.length > 0 ? (
                          <Bar data={responsibleChartData} options={responsibleChartOptions} />
                     ) : ( <p>Sem dados por responsável.</p> )}
                 </div>

                  {/* <<< NOVO Gráfico Data >>> */}
                  <div className="chart-container chart-container-line"> {/* Classe extra opcional */}
                     {summaryData.leadsByDate.length > 0 ? (
                          <Line data={dateChartData} options={dateChartOptions} />
                     ) : ( <p>Sem dados de leads recentes.</p> )}
                 </div>

            </div>
        </div>
    );
}

export default DashboardPage;