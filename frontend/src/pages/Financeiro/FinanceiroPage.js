import React, { useState } from 'react';
import ParcelasTab from './componentes/ParcelasTab';
import ContasAPagarTab from './componentes/ContasAPagarTab';
import AdmFinanceiroTab from './componentes/AdmFinanceiroTab';
import './FinanceiroPage.css';

function FinanceiroPage() {
    const [activeTab, setActiveTab] = useState('receber');

    const renderContent = () => {
        switch (activeTab) {
            case 'receber':
                return <ParcelasTab />;
            case 'pagar':
                return <ContasAPagarTab />;
            case 'adm':
                return <AdmFinanceiroTab />; // <<< USA O NOVO COMPONENTE
            default:
                return <ParcelasTab />;
        }
    };

    return (
        <div className="admin-page financeiro-page">
            <header className="page-header">
                <h1>Módulo Financeiro</h1>
            </header>
            <div className="page-content">
                <div className="tabs-container">
                    <button onClick={() => setActiveTab('receber')} className={`tab-button ${activeTab === 'receber' ? 'active' : ''}`}>
                        Contas a Receber
                    </button>
                    <button onClick={() => setActiveTab('pagar')} className={`tab-button ${activeTab === 'pagar' ? 'active' : ''}`}>
                        Contas a Pagar
                    </button>
                    <button onClick={() => setActiveTab('adm')} className={`tab-button ${activeTab === 'adm' ? 'active' : ''}`}>
                        ADM Financeiro
                    </button>
                </div>

                <div className="tab-content">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
export default FinanceiroPage;