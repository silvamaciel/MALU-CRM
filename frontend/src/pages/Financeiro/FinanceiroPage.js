import React, { useState } from 'react';
import ParcelasTab from './componentes/ParcelasTab';
import IndexadoresTab from './componentes/IndexadoresTab';
import ContasAPagarTab from './componentes/ContasAPagarTab'; // <<< NOVO IMPORT
import './FinanceiroPage.css';

function FinanceiroPage() {
    const [activeTab, setActiveTab] = useState('parcelas'); // Começa na aba de parcelas

    const renderContent = () => {
        switch (activeTab) {
            case 'parcelas':
                return <ParcelasTab />;
            case 'pagar':
                return <ContasAPagarTab />;
            case 'indexadores':
                return <IndexadoresTab />;
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
                    <button onClick={() => setActiveTab('parcelas')} className={`tab-button ${activeTab === 'parcelas' ? 'active' : ''}`}>
                        Contas a Receber
                    </button>
                    <button onClick={() => setActiveTab('pagar')} className={`tab-button ${activeTab === 'pagar' ? 'active' : ''}`}>
                        Contas a Pagar
                    </button>
                    <button onClick={() => setActiveTab('indexadores')} className={`tab-button ${activeTab === 'indexadores' ? 'active' : ''}`}>
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