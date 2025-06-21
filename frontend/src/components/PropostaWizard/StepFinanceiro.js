import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import './StepFinanceiro.css';

const TIPO_PARCELA_OPCOES = [
  "ATO", "PARCELA MENSAL", "PARCELA BIMESTRAL", "PARCELA TRIMESTRAL",
  "PARCELA SEMESTRAL", "INTERCALADA", "ENTREGA DE CHAVES", "FINANCIAMENTO", "OUTRA"
];

function StepFinanceiro({ formData, setFormData, isSaving, usuariosCRM, reservaBase }) {
  const [totalParcelas, setTotalParcelas] = useState(0);

  // Inicializa valores com base na reserva (valor do imóvel e entrada)
  useEffect(() => {
    if (reservaBase?.imovel && (!formData.valorPropostaContrato || formData.valorPropostaContrato === 0)) {
      const preco = reservaBase.imovel.precoTabela || reservaBase.imovel.preco || 0;
      setFormData(prev => ({ ...prev, valorPropostaContrato: preco }));
      console.log('[DEBUG] valorPropostaContrato definido como:', preco);
    }

    if (reservaBase?.valorSinal && (!formData.valorEntrada || formData.valorEntrada === 0)) {
      setFormData(prev => ({ ...prev, valorEntrada: reservaBase.valorSinal }));
      console.log('[DEBUG] valorEntrada definida como:', reservaBase.valorSinal);
    }
  }, [reservaBase]);

  // Recalcula total considerando entrada + parcelas
  useEffect(() => {
    const totalParcelasSemEntrada = formData.planoDePagamento.reduce((acc, p) => {
      const quantidade = Number(p.quantidade || 0);
      const valorUnitario = Number(p.valorUnitario || 0);
      return acc + (quantidade * valorUnitario);
    }, 0);
    const entrada = Number(formData.valorEntrada || 0);
    setTotalParcelas(totalParcelasSemEntrada + entrada);
  }, [formData.planoDePagamento, formData.valorEntrada]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const parsed = ['valorPropostaContrato', 'valorEntrada'].includes(name) ? parseFloat(value) : value;
    setFormData(prev => ({ ...prev, [name]: parsed }));
  };

  const handlePlanoDePagamentoChange = (index, event) => {
    const { name, value } = event.target;
    const list = [...formData.planoDePagamento];
    let processedValue = value;
    if (['quantidade', 'valorUnitario'].includes(name)) {
      processedValue = value === '' ? '' : Number(value);
    }
    list[index][name] = processedValue;
    setFormData(prev => ({ ...prev, planoDePagamento: list }));
  };

  const handleAddParcela = () => {
    setFormData(prev => ({
      ...prev,
      planoDePagamento: [
        ...prev.planoDePagamento,
        { tipoParcela: TIPO_PARCELA_OPCOES[1], quantidade: 1, valorUnitario: '', vencimentoPrimeira: '', observacao: '' }
      ]
    }));
  };

  const handleRemoveParcela = (index) => {
    if (formData.planoDePagamento.length <= 1) {
      toast.warn("É necessário pelo menos uma entrada no plano de pagamento.");
      return;
    }
    const list = [...formData.planoDePagamento];
    list.splice(index, 1);
    setFormData(prev => ({ ...prev, planoDePagamento: list }));
  };

  const formatCurrency = (value) => {
    const number = parseFloat(value);
    if (isNaN(number)) return 'R$ 0,00';
    return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const diferenca = totalParcelas- (formData.valorPropostaContrato || 0);

  return (
    <div className="wizard-step">
      <h3>Etapa 2: Dados da Proposta e Pagamento</h3>

      <div className="form-section">
        <h4>Valores e Responsáveis</h4>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="valorPropostaContrato">Valor da Proposta (R$)*</label>
            <input
              type="number"
              id="valorPropostaContrato"
              name="valorPropostaContrato"
              value={formData.valorPropostaContrato || ''}
              onChange={handleChange}
              required
              step="0.01"
              min="0"
              disabled={isSaving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="responsavelNegociacao">Responsável pela Negociação (CRM)*</label>
            <select
              id="responsavelNegociacao"
              name="responsavelNegociacao"
              value={formData.responsavelNegociacao}
              onChange={handleChange}
              required
              disabled={isSaving || !usuariosCRM || usuariosCRM.length === 0}
            >
              <option value="">
                {(!usuariosCRM || usuariosCRM.length === 0) ? 'Nenhum usuário' : 'Selecione um responsável...'}
              </option>
              {usuariosCRM.map(user => (
                <option key={user._id} value={user._id}>
                  {user.nome} ({user.perfil})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="valorEntrada">Valor da Entrada/Sinal (R$) (Opcional)</label>
            <input
              type="number"
              id="valorEntrada"
              name="valorEntrada"
              value={formData.valorEntrada || ''}
              onChange={handleChange}
              step="0.01"
              min="0"
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="condicoesPagamentoGerais">Condições Gerais de Pagamento (Resumo)</label>
          <textarea
            id="condicoesPagamentoGerais"
            name="condicoesPagamentoGerais"
            value={formData.condicoesPagamentoGerais}
            onChange={handleChange}
            rows="3"
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="form-section">
        <h4>Plano de Pagamento Detalhado*</h4>
        {formData.planoDePagamento.map((parcela, index) => (
          <div key={index} className="parcela-item-row">
            <div className="parcela-header">
              <p className="parcela-title">Parcela {index + 1}</p>
              {formData.planoDePagamento.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveParcela(index)}
                  className="button-link delete-link"
                  disabled={isSaving}
                >
                  Remover
                </button>
              )}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Tipo</label>
                <select
                  name="tipoParcela"
                  value={parcela.tipoParcela}
                  onChange={(e) => handlePlanoDePagamentoChange(index, e)}
                  required
                  disabled={isSaving}
                >
                  {TIPO_PARCELA_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Quantidade</label>
                <input
                  type="number"
                  name="quantidade"
                  value={parcela.quantidade}
                  onChange={(e) => handlePlanoDePagamentoChange(index, e)}
                  min="1"
                  required
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Valor Unitário (R$)</label>
                <input
                  type="number"
                  name="valorUnitario"
                  value={parcela.valorUnitario}
                  onChange={(e) => handlePlanoDePagamentoChange(index, e)}
                  step="0.01"
                  min="0"
                  required
                  disabled={isSaving}
                />
              </div>
              <div className="form-group">
                <label>1º Vencimento</label>
                <input
                  type="date"
                  name="vencimentoPrimeira"
                  value={parcela.vencimentoPrimeira}
                  onChange={(e) => handlePlanoDePagamentoChange(index, e)}
                  required
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="form-group full-width">
              <label>Observação</label>
              <input
                type="text"
                name="observacao"
                value={parcela.observacao}
                onChange={(e) => handlePlanoDePagamentoChange(index, e)}
                disabled={isSaving}
              />
            </div>
          </div>
        ))}
        <button type="button" onClick={handleAddParcela} className="button outline-button" disabled={isSaving}>+ Adicionar Parcela</button>

        <div className="resumo-financeiro-diferenca">
            <p>Total Entrada + Parcelas: <strong>{formatCurrency(totalParcelas)}</strong></p>
            <p className={diferenca < 0 ? 'red' : 'green'}>
                Diferença para Valor da Proposta: {diferenca > 0 ? '+' : ''}<strong>{formatCurrency(diferenca)}</strong>
            </p>
        </div>
      </div>
    </div>
  );
}

export default StepFinanceiro;
