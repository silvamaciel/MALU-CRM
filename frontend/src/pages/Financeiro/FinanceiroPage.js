import React, { useState } from 'react';
import ParcelasTab from './componentes/ParcelasTab';
import IndexadoresTab from './componentes/IndexadoresTab';
import './FinanceiroPage.css';

function FinanceiroPage() {
    const [activeTab, setActiveTab] = useState('parcelas');

    return (
        <div className="admin-page financeiro-page">
            <header className="page-header">
                <h1>Módulo Financeiro</h1>
            </header>
            <div className="page-content">
                <div className="tabs-container">
                    <button 
                        onClick={() => setActiveTab('parcelas')}
                        className={`tab-button ${activeTab === 'parcelas' ? 'active' : ''}`}
                    >
                        Parcelas a Receber
                    </button>
                    <button 
                        onClick={() => setActiveTab('indexadores')}
                        className={`tab-button ${activeTab === 'indexadores' ? 'active' : ''}`}
                    >
                        Gestão de Indexadores
                    </button>
                </div>

                <div className="tab-content">
                    {activeTab === 'parcelas' && <ParcelasTab />}
                    {activeTab === 'indexadores' && <IndexadoresTab />}
                </div>
            </div>
        </div>
    );
}
export default FinanceiroPage;