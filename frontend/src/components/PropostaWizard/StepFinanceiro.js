// src/components/PropostaWizard/StepFinanceiro.js
import React from 'react';
import { toast } from 'react-toastify';
import './StepFinanceiro.css';

const TIPO_PARCELA_OPCOES = [
  "ATO", "PARCELA MENSAL", "PARCELA BIMESTRAL", "PARCELA TRIMESTRAL", 
  "PARCELA SEMESTRAL", "INTERCALADA", "ENTREGA DE CHAVES", "FINANCIAMENTO", "OUTRA"
];

// <<< O COMPONENTE AGORA RECEBE 'usuariosCRM' COMO PROP >>>
function StepFinanceiro({ formData, setFormData, isSaving, usuariosCRM }) {
    // Handler para campos de primeiro nível (valorPropostaContrato, responsavelNegociacao, etc.)
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handlers para o Plano de Pagamento Dinâmico (como antes)
    const handlePlanoDePagamentoChange = (index, event) => {
        const { name, value } = event.target;
        const list = [...formData.planoDePagamento];
        let processedValue = value;
        if (name === 'quantidade' || name === 'valorUnitario') {
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
                            value={formData.valorPropostaContrato}
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
                        <input type="number" id="valorEntrada" name="valorEntrada" value={formData.valorEntrada} onChange={handleChange} step="0.01" min="0" disabled={isSaving}/>
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="condicoesPagamentoGerais">Condições Gerais de Pagamento (Resumo)</label>
                    <textarea id="condicoesPagamentoGerais" name="condicoesPagamentoGerais" value={formData.condicoesPagamentoGerais} onChange={handleChange} rows="3" disabled={isSaving}></textarea>
                </div>
            </div>

            <div className="form-section">
                <h4>Plano de Pagamento Detalhado*</h4>
                {/* ... Seu JSX do plano de pagamento dinâmico como antes ... */}
                {formData.planoDePagamento.map((parcela, index) => (
                    <div key={index} className="parcela-item-row">
                        {/* ... inputs para tipo, quantidade, valor, vencimento ... */}
                    </div>
                ))}
                <button type="button" onClick={handleAddParcela} className="button outline-button" disabled={isSaving}>+ Adicionar Parcela</button>
            </div>
        </div>
    );
}

export default StepFinanceiro;