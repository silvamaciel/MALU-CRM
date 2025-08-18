import React, { useMemo } from 'react';
import './WizardSteps.css';
import './StepCorretagem.css';

function StepCorretagem({ formData, setFormData, isSaving, brokerContactsList }) {
  const corretagem = formData.corretagem || {};

  const valorBase = Number(formData.valorPropostaContrato || 0);
  const modo = corretagem.modoCalculo || 'valor'; // 'valor' | 'percent'

  const percentual = corretagem.percentual || ''; // guardamos no estado, mas só enviamos valorCorretagem

  // Calcula valorCorretagem quando o modo é percentual (para exibir e gravar)
  const valorCorretagemCalc = useMemo(() => {
    if (modo !== 'percent') return Number(corretagem.valorCorretagem || 0);
    const p = Number(percentual || 0);
    return (p / 100) * valorBase;
  }, [modo, percentual, valorBase, corretagem.valorCorretagem]);

  const handleCorretagemChange = (e) => {
    const { name, value } = e.target;

    // Troca de modo
    if (name === 'modoCalculo') {
      setFormData(prev => ({
        ...prev,
        corretagem: {
          ...prev.corretagem,
          modoCalculo: value, // 'valor' | 'percent'
        }
      }));
      return;
    }

    // Entrada do percentual
    if (name === 'percentual') {
      const pct = value === '' ? '' : Math.max(0, Number(value));
      setFormData(prev => ({
        ...prev,
        corretagem: {
          ...prev.corretagem,
          percentual: pct,
          // Mantemos valorCorretagem coerente no estado para o submit final
          valorCorretagem: ((pct || 0) / 100) * Number(prev.valorPropostaContrato || 0),
        }
      }));
      return;
    }

    // Entrada direta do valor em R$
    if (name === 'valorCorretagem') {
      const v = value === '' ? '' : Math.max(0, Number(value));
      setFormData(prev => ({
        ...prev,
        corretagem: {
          ...prev.corretagem,
          valorCorretagem: v,
        }
      }));
      return;
    }

    // Demais campos (selects/textarea)
    setFormData(prev => ({
      ...prev,
      corretagem: {
        ...prev.corretagem,
        [name]: value
      }
    }));
  };

  const formatBRL = (num) =>
    Number(num || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const pctFromValor = useMemo(() => {
    const v = Number(corretagem.valorCorretagem || 0);
    return valorBase > 0 ? (v / valorBase) * 100 : 0;
  }, [corretagem.valorCorretagem, valorBase]);

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
            <label>Forma de cálculo</label>
            <div className="modo-switch">
              <label className={`pill ${modo === 'valor' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="modoCalculo"
                  value="valor"
                  checked={modo === 'valor'}
                  onChange={handleCorretagemChange}
                  disabled={isSaving}
                />
                Valor (R$)
              </label>
              <label className={`pill ${modo === 'percent' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="modoCalculo"
                  value="percent"
                  checked={modo === 'percent'}
                  onChange={handleCorretagemChange}
                  disabled={isSaving}
                />
                Percentual (%)
              </label>
            </div>
          </div>
        </div>

        {/* Campos condicionais */}
        {modo === 'valor' ? (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="valorCorretagem">Valor da Corretagem (R$)</label>
              <input
                type="number"
                id="valorCorretagem"
                name="valorCorretagem"
                value={corretagem.valorCorretagem === '' ? '' : Number(corretagem.valorCorretagem || 0)}
                onChange={handleCorretagemChange}
                step="0.01"
                min="0"
                disabled={isSaving}
                placeholder="0,00"
              />
              <small className="money-preview">
                {formatBRL(corretagem.valorCorretagem || 0)} {valorBase > 0 ? `(~${pctFromValor.toFixed(2)}%)` : ''}
              </small>
            </div>
          </div>
        ) : (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="percentual">Percentual da Corretagem (%)</label>
              <input
                type="number"
                id="percentual"
                name="percentual"
                value={percentual === '' ? '' : Number(percentual)}
                onChange={handleCorretagemChange}
                step="0.01"
                min="0"
                disabled={isSaving}
                placeholder="ex.: 6"
              />
              <small className="money-preview">
                Base: {formatBRL(valorBase)} • Calculado: <strong>{formatBRL(valorCorretagemCalc)}</strong>
              </small>
            </div>
          </div>
        )}

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
