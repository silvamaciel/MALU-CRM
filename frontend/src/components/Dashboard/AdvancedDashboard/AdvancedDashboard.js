// Crie: src/components/Dashboard/AdvancedDashboard/AdvancedDashboard.js
import React, { useState, useEffect } from 'react';
import { getAdvancedMetricsApi } from '../../../api/dashboardApi';
import { toast } from 'react-toastify';
import { BarChart, Bar, FunnelChart, Funnel, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './AdvancedDashboard.css'; // Criaremos este CSS

// Helper para formatar dados para o gráfico de heatmap/barras
const formatHeatmapData = (data) => {
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const heatmapData = Array(24).fill(0).map((_, hour) => {
        const hourData = { name: `${String(hour).padStart(2, '0')}:00` };
        dayNames.forEach((day, dayIndex) => {
            const point = data.find(d => d._id.day === (dayIndex + 1) && d._id.hour === hour);
            hourData[day] = point ? point.count : 0;
        });
        return hourData;
    });
    return heatmapData;
};

function AdvancedDashboard({ filter }) { // Recebe o filtro do pai
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const result = await getAdvancedMetricsApi(filter);
                setData(result);
            } catch (err) {
                toast.error(err.message || "Erro ao carregar métricas avançadas.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [filter]); // Re-busca quando o filtro muda

    if (loading) return <div className="loading-message">Carregando métricas avançadas...</div>;
    if (!data) return <div className="error-message">Não foi possível carregar os dados.</div>;

    const heatmapData = formatHeatmapData(data.leadsByDayHour);
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    
    return (
        <div className="advanced-dashboard">
            <div className="kpi-card-container">
                <div className="kpi-card">
                    <span className="kpi-value">{data.conversionRate.toFixed(2)}%</span>
                    <span className="kpi-label">Taxa de Conversão</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-value">{data.avgConversionTime.toFixed(1)} dias</span>
                    <span className="kpi-label">Tempo Médio de Conversão</span>
                </div>
            </div>
            <div className="charts-container">
                <div className="chart-wrapper full-width-chart">
                    <h3>Leads por Dia e Hora</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={heatmapData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {dayNames.map((day, index) => (
                                <Bar key={day} dataKey={day} stackId="a" fill={`hsl(${(index * 50) % 360}, 70%, 50%)`} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="chart-wrapper">
                    <h3>Funil de Conversão (Estágios)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <FunnelChart>
                            <Tooltip />
                            <Funnel dataKey="value" data={data.stageFunnelData} isAnimationActive>
                                <LabelList position="right" fill="#000" stroke="none" dataKey="name" formatter={(value) => `${value} (${data.stageFunnelData.find(f=>f.name===value)?.value || 0})`} />
                            </Funnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

export default AdvancedDashboard;