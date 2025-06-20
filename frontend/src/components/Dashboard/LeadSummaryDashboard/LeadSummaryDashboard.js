import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getLeadSummaryApi, getAdvancedMetricsApi } from '../../../api/dashboardApi';
import { BarChart, Bar, FunnelChart, Funnel, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './LeadSummaryDashboard.css';

const formatDataForChart = (data, keyName = 'nome', valueName = 'count') => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
        name: item[keyName],
        Leads: item[valueName]
    }));
};

const formatHeatmapData = (data = []) => {
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return Array(24).fill(0).map((_, hour) => {
        const hourData = { name: `${String(hour).padStart(2, '0')}:00` };
        dayNames.forEach((day, dayIndex) => {
            const point = data.find(d => d.day === (dayIndex + 1) && d.hour === hour);
            hourData[day] = point ? point.count : 0;
        });
        return hourData;
    });
};

function LeadSummaryDashboard({ filter }) {
    const [summaryData, setSummaryData] = useState(null);
    const [advancedData, setAdvancedData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [summaryResult, advancedResult] = await Promise.all([
                getLeadSummaryApi(filter),
                getAdvancedMetricsApi(filter)
            ]);
            setSummaryData(summaryResult);
            setAdvancedData(advancedResult);
        } catch (err) {
            setError(err.message || "Falha ao carregar dados.");
            toast.error(err.message || "Falha ao carregar dados.");
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) return <div className="loading-message">Carregando resumo de leads...</div>;
    if (error || !summaryData || !advancedData) return <div className="error-message">{error || "Não foi possível carregar os dados."}</div>;

    const leadsByStageData = formatDataForChart(summaryData.leadsByStage);
    const leadsByOrigemData = formatDataForChart(summaryData.leadsByOrigemData);
    const leadsByResponsavelData = formatDataForChart(summaryData.leadsByResponsavel);
    const heatmapData = formatHeatmapData(advancedData.leadsByDayHour);

    return (
        <div className="lead-summary-dashboard">

            {/* KPIs principais e avançados juntos */}
            <div className="kpi-card-container">
                <div className="kpi-card"><span className="kpi-value">{summaryData.totalLeadsPeriodo || 0}</span><span className="kpi-label">Total de Leads</span></div>
                <div className="kpi-card"><span className="kpi-value">{summaryData.descartadosPeriodo || 0}</span><span className="kpi-label">Descartados</span></div>
                <div className="kpi-card"><span className="kpi-value">{summaryData.leadsUltimos7Dias || 0}</span><span className="kpi-label">Últimos 7 Dias</span></div>
                <div className="kpi-card"><span className="kpi-value">{advancedData.conversionRate.toFixed(2)}%</span><span className="kpi-label">Taxa de Conversão</span></div>
                <div className="kpi-card"><span className="kpi-value">{advancedData.avgConversionTime.toFixed(1)} dias</span><span className="kpi-label">Tempo Médio de Conversão</span></div>
            </div>

            {/* Gráficos */}
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

                <div className="chart-wrapper full-width-chart" style={{ marginTop: 25 }}>
                    <h3>Leads por Dia e Hora</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={heatmapData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day, i) => (
                                <Bar key={day} dataKey={day} stackId="a" fill={`hsl(${(i * 50) % 360}, 70%, 50%)`} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-wrapper" style={{ marginTop: 25 }}>
                    <h3>Funil de Conversão</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <FunnelChart>
                            <Tooltip />
                            <Funnel dataKey="value" data={advancedData.stageFunnelData} isAnimationActive>
                                <LabelList
                                    position="right"
                                    fill="#000"
                                    stroke="none"
                                    dataKey="name"
                                    formatter={val => `${val} (${advancedData.stageFunnelData.find(f => f.name === val)?.value || 0})`}
                                />
                            </Funnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                </div>

            </div>
        </div>
    );
}

export default LeadSummaryDashboard;
