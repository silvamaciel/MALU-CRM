import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getFinancialSummaryApi } from '../../../api/dashboardApi';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList
} from 'recharts';
import './FinancialDashboard.css';

// ==== HELPERS ====
const formatCurrency = (value) => {
    if (typeof value !== 'number') return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatSalesByMonthData = (data = []) => {
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return data.map(item => ({
        name: `${monthNames[item._id.month - 1]}/${String(item._id.year).slice(2)}`,
        "Valor Vendido": item.totalVendido,
    }));
};

const formatFunnelData = (data = []) => {
    const funnelOrder = ["Em Elaboração", "Aguardando Aprovações", "Aguardando Assinatura Cliente", "Assinado", "Vendido"];
    const colorPalette = ["#8884d8", "#83a6ed", "#8dd1e1", "#82ca9d", "#a4de6c"];
    return data
        .map((item, index) => ({
            name: item._id,
            value: item.valorTotal,
            count: item.count,
            fill: colorPalette[index % colorPalette.length]
        }))
        .sort((a, b) => funnelOrder.indexOf(a.name) - funnelOrder.indexOf(b.name));
};

// ==== COMPONENT ====
function FinancialDashboard({ filter }) {
    const [summaryData, setSummaryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getFinancialSummaryApi(filter);
                setSummaryData(data);
            } catch (err) {
                setError(err.message || "Erro ao carregar dados.");
                toast.error(err.message || "Erro ao carregar dados.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [filter]);

    if (loading) return <div className="loading-message">Carregando dados financeiros...</div>;
    if (error || !summaryData) return <div className="error-message">{error || "Não foi possível carregar os dados financeiros."}</div>;

    const salesByMonthData = formatSalesByMonthData(summaryData.vendasPorMes);
    const funnelData = formatFunnelData(summaryData.funilPorValor);
    const commissionChartData = [
        { name: 'Comissões Pagas', value: summaryData.totalComissaoPaga || 0 },
        { name: 'Comissões a Pagar', value: summaryData.totalComissaoAPagar || 0 },
    ];
    const COLORS = ['#00C49F', '#FFBB28'];

    return (
        <div className="financial-dashboard">
            {/* ==== CARDS ==== */}
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
                    <span className="kpi-label">Ticket Médio</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-value">{formatCurrency(summaryData.valorTotalEmPropostasAtivas)}</span>
                    <span className="kpi-label">Propostas Ativas</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-value">{formatCurrency(summaryData.totalComissao)}</span>
                    <span className="kpi-label">Total em Comissões</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-value">{formatCurrency(summaryData.totalComissaoAPagar)}</span>
                    <span className="kpi-label">Comissões a Pagar</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-value">{formatCurrency(summaryData.totalComissaoPaga)}</span>
                    <span className="kpi-label">Comissões Pagas</span>
                </div>
            </div>

            {/* ==== GRÁFICOS ==== */}
            <div className="charts-container">
                {/* Gráfico de Vendas Mensais */}
                <div className="chart-wrapper">
                    <h3>Vendas Mensais (Últimos 6 Meses)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={salesByMonthData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(value) => `R$${(value / 1000)}k`} />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="Valor Vendido" fill="#82ca9d" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Gráfico de Funil */}
                <div className="chart-wrapper">
                    <h3>Funil de Propostas por Valor</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <FunnelChart>
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Funnel dataKey="value" data={funnelData} isAnimationActive>
                                <LabelList
                                    position="right"
                                    fill="#000"
                                    stroke="none"
                                    dataKey="name"
                                    formatter={(value) => `${value} (${funnelData.find(f => f.name === value)?.count || 0})`}
                                />
                            </Funnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                </div>

                {/* Gráfico de Pizza - Comissões */}
                <div className="chart-wrapper">
                    <h3>Status das Comissões</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={commissionChartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {commissionChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

export default FinancialDashboard;
