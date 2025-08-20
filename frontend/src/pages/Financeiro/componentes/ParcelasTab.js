import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getFinanceiroDashboardApi, getParcelasApi, registrarBaixaApi } from '../../../api/financeiroApi';

// Componente para os Cards de KPI
const KPICard = ({ title, value, className }) => (
    <div className={`kpi-card ${className}`}>
        <span className="kpi-label">{title}</span>
        <span className="kpi-value">{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
    </div>
);

function ParcelasTab() {
    const [kpis, setKpis] = useState({ totalAReceber: 0, recebidoNoMes: 0, totalVencido: 0 });
    const [parcelas, setParcelas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: 'Pendente' });
    // ... (states para paginação e modal de baixa)

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [kpisData, parcelasData] = await Promise.all([
                getFinanceiroDashboardApi(),
                getParcelasApi(filters)
            ]);
            setKpis(kpisData || {});
            setParcelas(parcelasData.parcelas || []);
        } catch (error) {
            toast.error("Erro ao carregar dados financeiros.");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="parcelas-tab">
            <div className="kpi-container">
                <KPICard title="Total a Receber" value={kpis.totalAReceber} className="kpi-info" />
                <KPICard title="Recebido no Mês" value={kpis.recebidoNoMes} className="kpi-success" />
                <KPICard title="Total Vencido" value={kpis.totalVencido} className="kpi-danger" />
            </div>

            {/* Aqui entrarão os filtros da tabela */}
            <div className="table-container card">
                <h3>Extrato de Parcelas</h3>
                {loading ? <p>A carregar parcelas...</p> : (
                    <table>
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Cliente (Sacado)</th>
                                <th>Vencimento</th>
                                <th>Valor</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parcelas.map(p => (
                                <tr key={p._id}>
                                    <td><span className={`status-badge status-${p.status.toLowerCase().replace(' ', '-')}`}>{p.status}</span></td>
                                    <td><Link to={`/leads/${p.sacado?._id}`}>{p.sacado?.nome || 'N/A'}</Link></td>
                                    <td>{new Date(p.dataVencimento).toLocaleDateString('pt-BR')}</td>
                                    <td>{p.valorPrevisto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td>
                                        <button className="button small-button">Dar Baixa</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                 {(!loading && parcelas.length === 0) && <p className="no-data-message">Nenhuma parcela encontrada para os filtros selecionados.</p>}
            </div>
        </div>
    );
}

export default ParcelasTab;