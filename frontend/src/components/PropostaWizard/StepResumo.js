import React, { useMemo } from 'react';
import './StepResumo.css';
import './WizardSteps.css';

function StepResumo({ formData, reservaBase }) {
  const formatCurrency = (value) => {
    const n = Number(value || 0);
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(`${dateString}T00:00:00`).toLocaleDateString('pt-BR');
  };

  // Base de valores do imóvel (tabela/avulso)
  const valorTabela = useMemo(() => {
    if (!reservaBase?.imovel) return 0;
    return Number(
      reservaBase.tipoImovel === 'Unidade'
        ? (reservaBase.imovel.precoTabela ?? reservaBase.imovel.preco ?? 0)
        : (reservaBase.imovel.preco ?? reservaBase.imovel.precoTabela ?? 0)
    );
  }, [reservaBase]);

  // Totais financeiros
  const totalParcelas = useMemo(() => {
    const entrada = Number(formData.valorEntrada || 0);
    const somaParcelas = (formData.planoDePagamento || []).reduce(
      (acc, p) => acc + (Number(p.quantidade || 0) * Number(p.valorUnitario || 0)),
      0
    );
    return entrada + somaParcelas;
  }, [formData]);

  const diffTotalVsProposta = useMemo(() => {
    const proposta = Number(formData.valorPropostaContrato || 0);
    return totalParcelas - proposta;
  }, [totalParcelas, formData.valorPropostaContrato]);

  // Classe de cor para a diferença
  const diffClass = diffTotalVsProposta === 0
    ? 'diff-ok'
    : diffTotalVsProposta > 0
      ? 'diff-warn'
      : 'diff-danger';

  // Identificadores
  const empreendimentoNome = reservaBase?.tipoImovel === 'Unidade'
    ? (reservaBase?.imovel?.empreendimento?.nome || 'N/A')
    : (reservaBase?.imovel?.titulo || 'N/A');

  const unidadeIdent = reservaBase?.tipoImovel === 'Unidade'
    ? (reservaBase?.imovel?.identificador || reservaBase?.imovel?.unidade?.identificador || 'N/A')
    : (reservaBase?.imovel?.titulo || 'N/A');

  return (
    <div className="wizard-step">
      <h3>Etapa 4: Resumo e Confirmação</h3>
      <p>Revise todas as informações antes de concluir.</p>

      <div className="resumo-grid">
        {/* Adquirentes */}
        <section className="resumo-section">
          <h4>Adquirentes</h4>
          {formData.adquirentes.map((p, i) => (
            <div key={i} className="resumo-item">
              <strong>{i === 0 ? 'Principal:' : `Coadquirente ${i}`}</strong>
              <span>{p.nome || '—'} {p.cpf ? `(CPF: ${p.cpf})` : ''}</span>
            </div>
          ))}
        </section>

        {/* Empreendimento / Unidade */}
        <section className="resumo-section">
          <h4>Empreendimento</h4>
          <div className="resumo-item">
            <strong>Empreendimento:</strong>
            <span>{empreendimentoNome}</span>
          </div>
          <div className="resumo-item">
            <strong>Unidade:</strong>
            <span>{unidadeIdent}</span>
          </div>
        </section>

        {/* Financeiro */}
        <section className="resumo-section">
          <h4>Financeiro</h4>

          <div className="resumo-item">
            <strong>Valor da Proposta:</strong>
            <span>{formatCurrency(formData.valorPropostaContrato)}</span>
          </div>

          <div className="resumo-item">
            <strong>Valor da Entrada:</strong>
            <span>{formatCurrency(formData.valorEntrada)}</span>
          </div>

          <div className="resumo-subtitle">Plano de Pagamento</div>
          {(formData.planoDePagamento || []).map((p, i) => (
            <p key={i} className="resumo-parcela">
              {p.quantidade}x {p.tipoParcela} de {formatCurrency(p.valorUnitario)} • 1º venc.: {formatDate(p.vencimentoPrimeira)}
            </p>
          ))}

          <div className="totais-wrap">
            <div className="totais-line">
              <span>Total Entrada + Parcelas:</span>
              <strong>{formatCurrency(totalParcelas)}</strong>
            </div>
            {valorTabela > 0 && (
              <div className="totais-line">
                <span>Valor de Tabela:</span>
                <strong>{formatCurrency(valorTabela)}</strong>
              </div>
            )}
            <div className={`diff-banner ${diffClass}`}>
              Diferença para Valor da Proposta:&nbsp;
              <strong>{formatCurrency(diffTotalVsProposta)}</strong>
            </div>
          </div>
        </section>

        {/* Corretagem (se houver) */}
        {Number(formData?.corretagem?.valorCorretagem || 0) > 0 && (
          <section className="resumo-section">
            <h4>Corretagem</h4>
            <div className="resumo-item">
              <strong>Valor:</strong>
              <span>{formatCurrency(formData.corretagem.valorCorretagem)}</span>
            </div>
            <div className="resumo-item">
              <strong>Condições:</strong>
              <span>{formData.corretagem.condicoesPagamentoCorretagem || '—'}</span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default StepResumo;
