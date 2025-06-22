// src/components/PropostaWizard/StepCorretagem.js
import React from 'react';
import './WizardSteps.css';
import './StepCorretagem.css';

function StepCorretagem({ formData, setFormData, isSaving, brokerContactsList }) {
  const corretagem = formData.corretagem || {};

  const handleCorretagemChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      corretagem: {
        ...prev.corretagem,
        [name]: name === 'valorCorretagem' ? parseFloat(value) || 0 : value
      }
    }));
  };

  const formatCurrency = (value) => {
    const number = parseFloat(value);
    if (isNaN(number)) return '';
    return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className="wizard-step">
      <h3>Etapa 3: Detalhes da Corretagem</h3>

      <div className="form-section">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="corretorPrincipal">Corretor Principal</label>
            <select
              id="corretorPrincipal"
              name="corretorPrincipal"
              value={corretagem.corretorPrincipal || ''}
              onChange={handleCorretagemChange}
              disabled={isSaving || brokerContactsList.length === 0}
            >
              <option value="">
                {brokerContactsList.length === 0 ? 'Nenhum corretor cadastrado' : 'Selecione um corretor...'}
              </option>
              {brokerContactsList.map(broker => (
                <option key={broker._id} value={broker._id}>
                  {broker.nome} ({broker.creci || 'Sem CRECI'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="valorCorretagem">Valor da Corretagem (R$)</label>
            <input
              type="number"
              id="valorCorretagem"
              name="valorCorretagem"
              value={corretagem.valorCorretagem || ''}
              onChange={handleCorretagemChange}
              step="0.01"
              min="0"
              disabled={isSaving}
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="form-group full-width">
          <label htmlFor="condicoesPagamentoCorretagem">Condições de Pagamento</label>
          <textarea
            id="condicoesPagamentoCorretagem"
            name="condicoesPagamentoCorretagem"
            value={corretagem.condicoesPagamentoCorretagem || ''}
            onChange={handleCorretagemChange}
            rows="2"
            placeholder="Ex: Pagamento em até 15 dias após assinatura..."
            disabled={isSaving}
          />
        </div>

        <div className="form-group full-width">
          <label htmlFor="observacoesCorretagem">Observações</label>
          <textarea
            id="observacoesCorretagem"
            name="observacoesCorretagem"
            value={corretagem.observacoesCorretagem || ''}
            onChange={handleCorretagemChange}
            rows="2"
            placeholder="Informações adicionais relevantes..."
            disabled={isSaving}
          />
        </div>
      </div>
    </div>
  );
}

export default StepCorretagem;
