import React from 'react';
import { formatCurrencyBRL } from '../../../utils/currency';
import { FiTrendingUp, FiTrendingDown, FiAlertCircle } from 'react-icons/fi';

const Card = ({ icon: Icon, label, value }) => (
  <div className="card kpi-card">
    <div className="kpi-icon"><Icon /></div>
    <div className="kpi-content">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{formatCurrencyBRL(value)}</div>
    </div>
  </div>
);

export default function KpiCards({ totalAReceber = 0, recebidoNoMes = 0, totalVencido = 0 }) {
  return (
    <div className="kpi-grid">
      <Card icon={FiTrendingUp}   label="Total a Receber" value={totalAReceber} />
      <Card icon={FiTrendingDown} label="Recebido no Mês" value={recebidoNoMes} />
      <Card icon={FiAlertCircle}  label="Total Vencido"   value={totalVencido} />
    </div>
  );
}
