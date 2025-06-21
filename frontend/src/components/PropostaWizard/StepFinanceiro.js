import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import './StepFinanceiro.css';

const TIPO_PARCELA_OPCOES = [
  "ATO", "PARCELA MENSAL", "PARCELA BIMESTRAL", "PARCELA TRIMESTRAL",
  "PARCELA SEMESTRAL", "INTERCALADA", "ENTREGA DE CHAVES", "FINANCIAMENTO", "OUTRA"
];

function StepFinanceiro({ formData, setFormData, isSaving, usuariosCRM, reservaBase }) {
  useEffect(() => {
    if (!formData.valorPropostaContrato && reservaBase?.unidade?.preco) {
      setFormData(prev => ({
        ...prev,
        valorPropostaContrato: reservaBase.unidade.preco
      }));
    }
  }, [formData.valorPropostaContrato, reservaBase, setFormData]);

  const formatCurrency = (value) => {
    const number = Number(value || 0);
    return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const parseCurrencyInput = (value) => {
    if (typeof value === 'string') {
      return Number(value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
    }
    return Number(value) || 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes("valor") ? parseCurrencyInput(value) : value
    }));
  };

  const handlePlanoDePagamentoChange = (index, event) => {
    const { name, value } = event.target;
    const list = [...formData.planoDePagamento];
    list[index][name] = name.includes("valorUnitario") || name === 'quantidade'
      ? parseCurrencyInput(value)
      : value;
    setFormData(prev => ({ ...prev, planoDePagamento: list }));
  };

  const handleAddParcela = () => {
    setFormData(prev => ({
      ...prev,
      planoDePagamento: [
        ...prev.planoDePagamento,
        {
          tipoParcela: TIPO_PARCELA_OPCOES[1],
          quantidade: 1,
          valorUnitario: '',
          vencimentoPrimeira: '',
          observacao: ''
        }
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

  const valorProposta = Number(formData.valorPropostaContrato || 0);
  const totalParcelas = formData.planoDePagamento.reduce((acc, p) => {
    return acc + (Number(p.quantidade) * Number(p.valorUnitario || 0));
  }, 0);

  return (
    <div className="wizard-step">
      <h3>Etapa 2: Dados da Proposta e Pagamento</h3>

      <div className="form-section">
        <h4>Valores e Responsáveis</h4>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="valorPropostaContrato">Valor da Proposta (R$)*</label>
            <input
              type="text"
              id="valorPropostaContrato"
              name="valorPropostaContrato"
              value={formatCurrency(formData.valorPropostaContrato)}
              onChange={handleChange}
              required
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
              type="text"
              id="valorEntrada"
              name="valorEntrada"
              value={formatCurrency(formData.valorEntrada)}
              onChange={handleChange}
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
          ></textarea>
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
                >Remover</button>
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
                  {TIPO_PARCELA_OPCOES.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
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
                  type="text"
                  name="valorUnitario"
                  value={formatCurrency(parcela.valorUnitario)}
                  onChange={(e) => handlePlanoDePagamentoChange(index, e)}
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

        <button
          type="button"
          onClick={handleAddParcela}
          className="button outline-button"
          disabled={isSaving}
        >
          + Adicionar Parcela
        </button>

        <div className="form-group" style={{ marginTop: '20px' }}>
          <label>Diferença entre valor da proposta e soma das parcelas:</label>
          <p style={{ color: totalParcelas === valorProposta ? 'green' : 'red' }}>
            {formatCurrency(valorProposta - totalParcelas)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default StepFinanceiro;
