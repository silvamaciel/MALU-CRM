import React, { useState, useEffect, useCallback } from 'react';
import './DashboardPage.css';
import { getLeadSummaryApi, getFinancialSummaryApi } from '../../api/dashboardApi';
import LeadSummaryDashboard from '../../components/Dashboard/LeadSummaryDashboard/LeadSummaryDashboard';
import FinancialDashboard from '../../components/Dashboard/FinancialDashboard/FinancialDashboard';


function DashboardPage() {
    const [activeView, setActiveView] = useState('leads'); // 'leads' ou 'financeiro'
    const [timeFilter, setTimeFilter] = useState('month'); // 'month', 'year', 'all'
    
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let data;
            if (activeView === 'leads') {
                data = await getLeadSummaryApi(timeFilter);
            } else { // activeView === 'financeiro'
                data = await getFinancialSummaryApi(timeFilter);
            }
            setDashboardData(data);
        } catch (err) {
            setError(err.message || "Falha ao carregar dados do dashboard.");
        } finally {
            setLoading(false);
        }
    }, [activeView, timeFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="admin-page dashboard-page">
            <header className="page-header">
                <h1>Dashboard</h1>
                <div className="dashboard-controls">
                    <div className="view-toggle-buttons">
                        <button onClick={() => setActiveView('leads')} className={`button ${activeView === 'leads' ? 'primary-button' : 'outline-button'}`}>
                            Visão de Leads
                        </button>
                        <button onClick={() => setActiveView('financeiro')} className={`button ${activeView === 'financeiro' ? 'primary-button' : 'outline-button'}`}>
                            Visão Financeira
                        </button>
                    </div>
                    <div className="time-filter-buttons">
                        <button onClick={() => setTimeFilter('month')} className={`button small-button ${timeFilter === 'month' ? 'active' : ''}`}>Este Mês</button>
                        <button onClick={() => setTimeFilter('year')} className={`button small-button ${timeFilter === 'year' ? 'active' : ''}`}>Este Ano</button>
                        <button onClick={() => setTimeFilter('all')} className={`button small-button ${timeFilter === 'all' ? 'active' : ''}`}>Total</button>
                    </div>
                </div>
            </header>
            <div className="page-content">
                {activeView === 'leads' ? (
                    <LeadSummaryDashboard data={dashboardData} loading={loading} error={error} />
                ) : (
                    <FinancialDashboard data={dashboardData} loading={loading} error={error} />
                )}
            </div>
        </div>
    );
}

export default DashboardPage;