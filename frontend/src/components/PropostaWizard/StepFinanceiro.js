import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { NumericFormat } from 'react-number-format';
import './StepFinanceiro.css';

const TIPO_PARCELA_OPCOES = [
  "ATO", "PARCELA MENSAL", "PARCELA BIMESTRAL", "PARCELA TRIMESTRAL", 
  "PARCELA SEMESTRAL", "INTERCALADA", "ENTREGA DE CHAVES", "FINANCIAMENTO", "OUTRA"
];

function StepFinanceiro({ formData, setFormData, isSaving, usuariosCRM, valorImovelAtual }) {
  const [totalParcelas, setTotalParcelas] = useState(0);
  const [diferenca, setDiferenca] = useState(0);

  useEffect(() => {
    const total = formData.planoDePagamento.reduce((acc, parcela) => {
      const qtd = Number(parcela.quantidade || 0);
      const valor = Number(parcela.valorUnitario || 0);
      return acc + (qtd * valor);
    }, 0);
    setTotalParcelas(total);
    setDiferenca((formData.valorPropostaContrato || 0) - total);
  }, [formData.planoDePagamento, formData.valorPropostaContrato]);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePlanoDePagamentoChange = (index, name, value) => {
    const list = [...formData.planoDePagamento];
    list[index][name] = value;
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

  return (
    <div className="wizard-step">
      <h3>Etapa 2: Dados da Proposta e Pagamento</h3>

      <div className="form-section">
        <h4>Valores e Responsáveis</h4>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="valorPropostaContrato">Valor da Proposta (R$)*</label>
            <NumericFormat
              id="valorPropostaContrato"
              thousandSeparator="."
              decimalSeparator=","
              prefix="R$ "
              value={formData.valorPropostaContrato}
              onValueChange={({ floatValue }) => handleChange("valorPropostaContrato", floatValue || 0)}
              disabled={isSaving}
              allowNegative={false}
              decimalScale={2}
              fixedDecimalScale
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="responsavelNegociacao">Responsável pela Negociação (CRM)*</label>
            <select
              id="responsavelNegociacao"
              name="responsavelNegociacao"
              value={formData.responsavelNegociacao}
              onChange={(e) => handleChange("responsavelNegociacao", e.target.value)}
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
            <label htmlFor="valorEntrada">Valor da Entrada/Sinal (R$)</label>
            <NumericFormat
              id="valorEntrada"
              thousandSeparator="."
              decimalSeparator=","
              prefix="R$ "
              value={formData.valorEntrada}
              onValueChange={({ floatValue }) => handleChange("valorEntrada", floatValue || 0)}
              disabled={isSaving}
              allowNegative={false}
              decimalScale={2}
              fixedDecimalScale
              className="form-control"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="condicoesPagamentoGerais">Condições Gerais de Pagamento (Resumo)</label>
          <textarea
            id="condicoesPagamentoGerais"
            name="condicoesPagamentoGerais"
            value={formData.condicoesPagamentoGerais}
            onChange={(e) => handleChange("condicoesPagamentoGerais", e.target.value)}
            rows="3"
            disabled={isSaving}
          />
        </div>

        <div className="info-dinamica">
          <p><strong>Valor do Imóvel:</strong> R$ {Number(valorImovelAtual || 0).toLocaleString('pt-BR')}</p>
          <p><strong>Total das Parcelas:</strong> R$ {totalParcelas.toLocaleString('pt-BR')}</p>
          <p><strong>Diferença:</strong> <span style={{ color: diferenca === 0 ? 'green' : 'red' }}>
            R$ {diferenca.toLocaleString('pt-BR')}
          </span></p>
          {diferenca !== 0 && <p style={{ color: 'orange' }}>⚠ O valor das parcelas não bate com o valor da proposta.</p>}
        </div>
      </div>

      <div className="form-section">
        <h4>Plano de Pagamento Detalhado*</h4>
        {formData.planoDePagamento.map((parcela, index) => (
          <div key={index} className="parcela-item-row">
            <div className="parcela-header">
              <p className="parcela-title">Parcela {index + 1}</p>
              {formData.planoDePagamento.length > 1 && (
                <button type="button" onClick={() => handleRemoveParcela(index)} className="button-link delete-link" disabled={isSaving}>Remover</button>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tipo</label>
                <select name="tipoParcela" value={parcela.tipoParcela} onChange={(e) => handlePlanoDePagamentoChange(index, 'tipoParcela', e.target.value)} required disabled={isSaving}>
                  {TIPO_PARCELA_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Quantidade</label>
                <input
                  type="number"
                  name="quantidade"
                  value={parcela.quantidade}
                  onChange={(e) => handlePlanoDePagamentoChange(index, 'quantidade', Number(e.target.value))}
                  min="1"
                  required
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Valor Unitário (R$)</label>
                <NumericFormat
                  thousandSeparator="."
                  decimalSeparator=","
                  prefix="R$ "
                  value={parcela.valorUnitario}
                  onValueChange={({ floatValue }) => handlePlanoDePagamentoChange(index, 'valorUnitario', floatValue || 0)}
                  disabled={isSaving}
                  allowNegative={false}
                  decimalScale={2}
                  fixedDecimalScale
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>1º Vencimento</label>
                <input type="date" name="vencimentoPrimeira" value={parcela.vencimentoPrimeira} onChange={(e) => handlePlanoDePagamentoChange(index, 'vencimentoPrimeira', e.target.value)} required disabled={isSaving} />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Observação</label>
              <input type="text" name="observacao" value={parcela.observacao} onChange={(e) => handlePlanoDePagamentoChange(index, 'observacao', e.target.value)} disabled={isSaving} />
            </div>
          </div>
        ))}
        <button type="button" onClick={handleAddParcela} className="button outline-button" disabled={isSaving}>+ Adicionar Parcela</button>
      </div>
    </div>
  );
}

export default StepFinanceiro;
