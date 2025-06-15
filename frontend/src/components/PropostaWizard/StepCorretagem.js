// src/components/PropostaWizard/StepCorretagem.js
import React from 'react';

function StepCorretagem({ formData, setFormData, isSaving, brokerContactsList }) {
    // Handler específico para os campos do sub-objeto 'corretagem'
    const handleCorretagemChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            corretagem: {
                ...prev.corretagem,
                [name]: value
            }
        }));
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
                            value={formData.corretagem.corretorPrincipal}
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
                            value={formData.corretagem.valorCorretagem}
                            onChange={handleCorretagemChange}
                            step="0.01"
                            min="0"
                            disabled={isSaving}
                        />
                    </div>
                </div>
                <div className="form-group full-width">
                    <label htmlFor="condicoesPagamentoCorretagem">Condições de Pagamento da Corretagem</label>
                    <textarea
                        id="condicoesPagamentoCorretagem"
                        name="condicoesPagamentoCorretagem"
                        value={formData.corretagem.condicoesPagamentoCorretagem}
                        onChange={handleCorretagemChange}
                        rows="2"
                        disabled={isSaving}
                    ></textarea>
                </div>
                <div className="form-group full-width">
                    <label htmlFor="observacoesCorretagem">Observações da Corretagem</label>
                    <textarea
                        id="observacoesCorretagem"
                        name="observacoesCorretagem"
                        value={formData.corretagem.observacoesCorretagem}
                        onChange={handleCorretagemChange}
                        rows="2"
                        disabled={isSaving}
                    ></textarea>
                </div>
            </div>
        </div>
    );
}

export default StepCorretagem;