import React, { useMemo, useState } from "react";
import { FiDollarSign, FiList, FiSettings } from "react-icons/fi";
import ParcelasTab from "./tabs/ParcelasTab";
import ContasAPagarTab from "./tabs/ContasAPagarTab";
import AdmFinanceiroTab from "./tabs/AdmFinanceiroTab";
import "./FinanceiroPage.css";

const TABS = [
  { key: "receber",  label: "Contas a Receber", icon: <FiDollarSign /> },
  { key: "pagar",    label: "Contas a Pagar",   icon: <FiList /> },
  { key: "adm",      label: "ADM Financeiro",   icon: <FiSettings /> },
];

export default function FinanceiroPage() {
  // tenta ler ?tab= do URL (opcional), senão começa em "receber"
  const initial = useMemo(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get("tab");
      return TABS.some(x => x.key === t) ? t : "receber";
    } catch { return "receber"; }
  }, []);

  const [active, setActive] = useState(initial);

  const setTab = (k) => {
    setActive(k);
    // opcional: atualiza a URL sem recarregar
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.set("tab", k);
      window.history.replaceState({}, "", `${window.location.pathname}?${sp}`);
    } catch {}
  };

  return (
    <div className="financeiro-page">
      <div className="financeiro-container">
        <header className="financeiro-header">
          <div>
            <h1>Financeiro</h1>
            <p className="financeiro-subtitle">
              Controle de Contas a Receber, Contas a Pagar e Administração Financeira.
            </p>
          </div>
        </header>

        <nav className="financeiro-tabs" aria-label="Navegação do módulo financeiro">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`tab-pill ${active === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
              aria-current={active === t.key ? "page" : undefined}
              title={t.label}
            >
              <span className="tab-icon">{t.icon}</span>
              <span className="tab-text">{t.label}</span>
            </button>
          ))}
        </nav>

        <main className="financeiro-main">
          {active === "receber" && <ParcelasTab />}
          {active === "pagar"   && <ContasAPagarTab />}
          {active === "adm"     && <AdmFinanceiroTab />}
        </main>
      </div>
    </div>
  );
}
