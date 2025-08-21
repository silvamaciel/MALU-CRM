import React, { useState } from 'react';
import ParcelasTab from './tabs/ParcelasTab';
import ContasAPagarTab from './tabs/ContasAPagarTab';
import AdmFinanceiroTab from './componentes/AdmFinanceiroTab';
import { FiList, FiDollarSign, FiSettings } from 'react-icons/fi';

import './FinanceiroPage.css'

export default function FinanceiroPage() {
  const [active, setActive] = useState('parcelas');

  return (
    <div className="financeiro-page">
      <header className="financeiro-header">
        <h1>Financeiro</h1>
        <div className="tabs">
          <button
            className={`tab ${active==='parcelas'?'active':''}`}
            onClick={()=>setActive('parcelas')}
            title="Contas a Receber"
          >
            <FiDollarSign /> Receber
          </button>
          <button
            className={`tab ${active==='pagar'?'active':''}`}
            onClick={()=>setActive('pagar')}
            title="Contas a Pagar"
          >
            <FiList /> Pagar
          </button>
          <button
            className={`tab ${active==='adm'?'active':''}`}
            onClick={()=>setActive('adm')}
            title="Administração Financeira"
          >
            <FiSettings /> ADM
          </button>
        </div>
      </header>

      <main>
        {active === 'parcelas' && <ParcelasTab />}
        {active === 'pagar' && <ContasAPagarTab />}
        {active === 'adm' && <AdmFinanceiroTab />}
      </main>
    </div>
  );
}
