// src/components/PropostaWizard/StepResumo.js
import React from 'react';
import './StepResumo.css';
import './WizardSteps.css';

function StepResumo({ formData, reservaBase }) {
    const formatCurrency = (value) => {
        const number = parseFloat(value);
        if (isNaN(number)) return 'N/A';
        return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString + "T00:00:00").toLocaleDateString('pt-BR');
    };

    return (
        <div className="wizard-step">
            <h3>Etapa 4: Resumo e Confirmação</h3>
            <p>Por favor, revise todos os dados abaixo antes de criar a Proposta/Contrato.</p>

            <div className="resumo-grid">
                <div className="resumo-section">
                    <h4>Adquirentes</h4>
                    {formData.adquirentes.map((p, i) => (
                        <div key={i} className="resumo-item">
                            <strong>{i === 0 ? 'Principal:' : `Coadquirente ${i + 1}:`}</strong>
                            <span>{p.nome} (CPF: {p.cpf || 'N/A'})</span>
                        </div>
                    ))}
                </div>

                <div className="resumo-section">
                    <h4>Empreendimento</h4>
                    <div className="resumo-item">
                        <strong>Empreendimento:</strong>
                        <span>
                            {reservaBase?.tipoImovel === 'Unidade'
                                ? reservaBase?.imovel?.empreendimento?.nome || 'N/A'
                                : reservaBase?.imovel?.titulo || 'N/A'}
                        </span>
                    </div>
                    <div className="resumo-item">
                        <strong>Unidade:</strong>
                        <span>
                            {reservaBase?.tipoImovel === 'Unidade'
                                ? reservaBase?.imovel?.unidade?.identificador || 'N/A'
                                : reservaBase?.imovel?.titulo || 'N/A'}
                        </span>
                    </div>
                </div>

                <div className="resumo-section">
                    <h4>Financeiro</h4>
                    <div className="resumo-item">
                        <strong>Valor da Proposta:</strong>
                        <span>{formatCurrency(formData.valorPropostaContrato)}</span>
                    </div>
                    <div className="resumo-item">
                        <strong>Valor da Entrada:</strong>
                        <span>{formatCurrency(formData.valorEntrada)}</span>
                    </div>

                    <h5>Plano de Pagamento:</h5>
                    {formData.planoDePagamento.map((p, i) => (
                        <p key={i} className="resumo-parcela">
                            {p.quantidade}x {p.tipoParcela} de {formatCurrency(p.valorUnitario)} (1º Venc: {formatDate(p.vencimentoPrimeira)})
                        </p>
                    ))}
                </div>

                {formData.corretagem?.valorCorretagem > 0 && (
                    <div className="resumo-section">
                        <h4>Corretagem</h4>
                        <div className="resumo-item">
                            <strong>Valor:</strong>
                            <span>{formatCurrency(formData.corretagem.valorCorretagem)}</span>
                        </div>
                        <div className="resumo-item">
                            <strong>Condições:</strong>
                            <span>{formData.corretagem.condicoesPagamentoCorretagem || 'N/A'}</span>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}

export default StepResumo;
