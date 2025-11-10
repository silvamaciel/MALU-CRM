import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import './StepFinanceiro.css';

const TIPO_PARCELA_OPCOES = [
  "ATO", "PARCELA MENSAL", "PARCELA BIMESTRAL", "PARCELA TRIMESTRAL",
  "PARCELA SEMESTRAL", "INTERCALADA", "ENTREGA DE CHAVES", "FINANCIAMENTO", "OUTRA"
];

// Utils de moeda (pt-BR)
const parseCurrencyBR = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  let clean = String(value)
    .replace(/[^\d,.-]/g, '') // mantém números, vírgula, ponto, sinal
    .replace(/\./g, '')       // remove separadores de milhar
    .replace(',', '.');       // troca vírgula por ponto
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
};

const formatCurrencyBR = (value) => {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const toNumberFromCurrencyDigits = (value) => {
  const onlyDigits = String(value).replace(/\D/g, '');
  if (!onlyDigits) return 0;
  return parseFloat(onlyDigits) / 100;
};

function StepFinanceiro({ formData, setFormData, isSaving, usuariosCRM, reservaBase }) {
  const [totalParcelas, setTotalParcelas] = useState(0);

  // Inicializa valor da proposta e entrada a partir da reserva
  useEffect(() => {
    if (reservaBase?.imovel && (!formData.valorPropostaContrato || formData.valorPropostaContrato === 0)) {
      const preco = reservaBase.imovel.precoTabela || reservaBase.imovel.preco || 0;
      setFormData(prev => ({ ...prev, valorPropostaContrato: preco }));
    }
    if (reservaBase?.valorSinal && (!formData.valorEntrada || formData.valorEntrada === 0)) {
      setFormData(prev => ({ ...prev, valorEntrada: reservaBase.valorSinal }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservaBase]);

  // Recalcula o total (entrada + parcelas)
  useEffect(() => {
    const totalParcelasSemEntrada = (formData.planoDePagamento || []).reduce((acc, p) => {
      const quantidade = Number(p.quantidade || 0);
      const valorUnitario = Number(p.valorUnitario || 0);
      return acc + (quantidade * valorUnitario);
    }, 0);
    const entrada = Number(formData.valorEntrada || 0);
    setTotalParcelas(totalParcelasSemEntrada + entrada);
  }, [formData.planoDePagamento, formData.valorEntrada]);

  // Handler genérico dos campos top
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (['valorPropostaContrato', 'valorEntrada'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: parseCurrencyBR(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handlers do plano de pagamento
  const handlePlanoDePagamentoChange = (index, event) => {
    const { name, value } = event.target;
    const list = [...(formData.planoDePagamento || [])];

    if (name === 'quantidade') {
      list[index][name] = parseInt(value, 10) || 0;
    } else if (name === 'valorUnitario') {
      list[index][name] = parseCurrencyBR(value);
    } else {
      list[index][name] = value;
    }

    setFormData(prev => ({ ...prev, planoDePagamento: list }));
  };

  // Handler específico p/ Valor Unitário com formatação ao digitar
  const handlePlanoDePagamentoValorUnitarioInput = (index, rawValue) => {
    const list = [...(formData.planoDePagamento || [])];
    list[index].valorUnitario = toNumberFromCurrencyDigits(rawValue);
    setFormData(prev => ({ ...prev, planoDePagamento: list }));
  };

  const handleAddParcela = () => {
    setFormData(prev => ({
      ...prev,
      planoDePagamento: [
        ...(prev.planoDePagamento || []),
        { tipoParcela: TIPO_PARCELA_OPCOES[1], quantidade: 1, valorUnitario: 0, vencimentoPrimeira: '', observacao: '' }
      ]
    }));
  };

  const handleRemoveParcela = (index) => {
    if ((formData.planoDePagamento || []).length <= 1) {
      toast.warn("É necessário pelo menos uma entrada no plano de pagamento.");
      return;
    }
    const list = [...formData.planoDePagamento];
    list.splice(index, 1);
    setFormData(prev => ({ ...prev, planoDePagamento: list }));
  };

  const diferenca = (totalParcelas || 0) - (formData.valorPropostaContrato || 0);

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
              className="currency-input"
              value={formatCurrencyBR(formData.valorPropostaContrato)}
              onChange={handleChange}
              required
              disabled={isSaving}
              inputMode="decimal"
              placeholder="0,00"
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
              {usuariosCRM?.map(user => (
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
              className="currency-input"
              value={formatCurrencyBR(formData.valorEntrada)}
              onChange={handleChange}
              disabled={isSaving}
              inputMode="decimal"
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="condicoesPagamentoGerais">Condições Gerais de Pagamento (Resumo)</label>
          <textarea
            id="condicoesPagamentoGerais"
            name="condicoesPagamentoGerais"
            value={formData.condicoesPagamentoGerais || ''}
            onChange={handleChange}
            rows="3"
            disabled={isSaving}
            placeholder="Ex.: Entrada de X, parcelas mensais/bimestrais de Y, financiamento, etc."
          />
        </div>
      </div>

      <div className="form-section">
        <h4>Plano de Pagamento Detalhado*</h4>

        {(formData.planoDePagamento || []).map((parcela, index) => (
          <div key={index} className="parcela-item-row">
            <div className="parcela-header">
              <p className="parcela-title">Parcela {index + 1}</p>
              {(formData.planoDePagamento || []).length > 1 && (
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
                  type="text"
                  name="valorUnitario"
                  className="currency-input"
                  value={formatCurrencyBR(parcela.valorUnitario)}
                  onChange={(e) => handlePlanoDePagamentoValorUnitarioInput(index, e.target.value)}
                  required
                  disabled={isSaving}
                  inputMode="decimal"
                  placeholder="0,00"
                />
              </div>

              <div className="form-group">
                <label>1º Vencimento</label>
                <input
                  type="date"
                  name="vencimentoPrimeira"
                  value={parcela.vencimentoPrimeira || ''}
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
                value={parcela.observacao || ''}
                onChange={(e) => handlePlanoDePagamentoChange(index, e)}
                disabled={isSaving}
                placeholder="Ex.: carência, condição especial, etc."
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

        <div className="resumo-financeiro-diferenca">
          <p>
            Total Entrada + Parcelas: <strong>{formatCurrencyBR(totalParcelas)}</strong>
          </p>
          <p className={`diferenca 
      ${diferenca === 0 ? 'zero' : diferenca > 0 ? 'positivo' : 'negativo'}`}>
            Diferença para Valor da Proposta: {diferenca > 0 ? '+' : ''}
            <strong>{formatCurrencyBR(diferenca)}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

export default StepFinanceiro;
