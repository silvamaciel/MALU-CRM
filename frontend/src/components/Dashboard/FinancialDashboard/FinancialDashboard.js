import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getFinancialSummaryApi } from '../../../api/dashboardApi'; // A função de API
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts';
import './FinancialDashboard.css'; // O CSS que já criamos

// ... (suas funções helper: formatCurrency, formatSalesByMonthData, formatFunnelData)

function FinancialDashboard({ filter }) { // <<< Recebe apenas o 'filter' como prop
    // VVVVV Estados internos para gerenciar dados, loading e erro VVVVV
    const [summaryData, setSummaryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    // VVVVV useEffect para buscar os dados sempre que o filtro mudar VVVVV
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getFinancialSummaryApi(filter);
                setSummaryData(data);
            } catch (err) {
                setError(err.message || "Erro ao carregar dados financeiros.");
                toast.error(err.message || "Erro ao carregar dados financeiros.");
                setSummaryData(null); // Limpa dados em caso de erro
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [filter]); // <<< Dispara a busca sempre que a prop 'filter' mudar
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    if (loading) {
        return <div className="loading-message">Carregando dados financeiros...</div>;
    }

    if (error || !summaryData) {
        return <div className="error-message">{error || "Não foi possível carregar os dados financeiros."}</div>;
    }

    // A lógica de formatação e renderização continua a mesma, usando 'summaryData'
    const salesByMonthData = formatSalesByMonthData(summaryData.vendasPorMes);
    const funnelData = formatFunnelData(summaryData.funilPorValor);

    return (
        <div className="financial-dashboard">
            <div className="kpi-card-container">
                <div className="kpi-card">
                    <span className="kpi-value">{formatCurrency(summaryData.valorTotalVendidoPeriodo)}</span>
                    <span className="kpi-label">Vendido no Período</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-value">{summaryData.numeroDeVendasPeriodo}</span>
                    <span className="kpi-label">Nº de Vendas no Período</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-value">{formatCurrency(summaryData.ticketMedioPeriodo)}</span>
                    <span className="kpi-label">Ticket Médio no Período</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-value">{formatCurrency(summaryData.valorTotalEmPropostasAtivas)}</span>
                    <span className="kpi-label">Valor em Propostas Ativas</span>
                </div>
            </div>

            <div className="charts-container">
                <div className="chart-wrapper">
                    <h3>Vendas Mensais (Últimos 6 Meses)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={salesByMonthData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(value) => `R$${(value / 1000)}k`} />
                            <Tooltip formatter={(value, name) => [name === "Valor Vendido" ? formatCurrency(value) : value, name]} />
                            <Legend />
                            <Bar dataKey="Valor Vendido" fill="#82ca9d" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="chart-wrapper">
                    <h3>Funil de Vendas por Valor ($)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <FunnelChart>
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Funnel dataKey="value" data={funnelData} isAnimationActive>
                                <LabelList position="right" fill="#000" stroke="none" dataKey="name" formatter={(value) => `<span class="math-inline">\{value\} \(</span>{funnelData.find(f=>f.name===value)?.count || 0})`} />
                            </Funnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

export default FinancialDashboard;