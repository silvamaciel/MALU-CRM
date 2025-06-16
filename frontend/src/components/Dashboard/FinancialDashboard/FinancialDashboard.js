// src/components/Dashboard/FinancialDashboard/FinancialDashboard.js
import React, { useState, useEffect } from 'react';
import { getFinancialSummaryApi } from '../../../api/dashboard';
import { toast } from 'react-toastify';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts';
import './FInancialDashboard.css';

const formatCurrency = (value) => {
    if (typeof value !== 'number') return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Helper para formatar dados do gráfico de vendas mensais
const formatSalesByMonthData = (data) => {
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return data.map(item => ({
        name: `<span class="math-inline">\{monthNames\[item\.\_id\.month \- 1\]\}/</span>{String(item._id.year).slice(2)}`,
        "Valor Vendido": item.totalVendido,
        "Qtd. Vendas": item.count,
    }));
};

// Helper para formatar dados do funil
const formatFunnelData = (data) => {
    // Ordem do funil
    const funnelOrder = ["Em Elaboração", "Aguardando Aprovações", "Aguardando Assinatura Cliente", "Assinado", "Vendido"];
    const colorPalette = ["#8884d8", "#83a6ed", "#8dd1e1", "#82ca9d", "#a4de6c"];

    const formatted = data
        .map((item, index) => ({
            name: item._id,
            value: item.valorTotal,
            count: item.count,
            fill: colorPalette[index % colorPalette.length]
        }))
        .sort((a, b) => funnelOrder.indexOf(a.name) - funnelOrder.indexOf(b.name));

    return formatted;
};


function FinancialDashboard() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await getFinancialSummaryApi();
                setSummary(data);
            } catch (err) {
                setError(err.message || "Erro ao carregar dados.");
                toast.error(err.message || "Erro ao carregar dados.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="loading-message">Carregando dados financeiros...</div>;
    }

    if (error || !summary) {
        return <div className="error-message">{error || "Não foi possível carregar os dados financeiros."}</div>;
    }

    const salesByMonthData = formatSalesByMonthData(summary.vendasPorMes);
    const funnelData = formatFunnelData(summary.funilPorValor);

    return (
        <div className="financial-dashboard">
            <div className="kpi-card-container">
                <div className="kpi-card">
                    <span className="kpi-value">{formatCurrency(summary.valorTotalVendidoMes)}</span>
                    <span className="kpi-label">Vendido no Mês</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-value">{summary.numeroDeVendasMes}</span>
                    <span className="kpi-label">Nº de Vendas no Mês</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-value">{formatCurrency(summary.ticketMedioMes)}</span>
                    <span className="kpi-label">Ticket Médio no Mês</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-value">{formatCurrency(summary.valorTotalEmPropostasAtivas)}</span>
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