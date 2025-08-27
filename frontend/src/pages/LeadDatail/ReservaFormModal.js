// frontend/src/components/ReservaFormModal/ReservaFormModal.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getEmpreendimentos } from '../../api/empreendimentoApi';
import { getUnidades } from '../../api/unidadeApi';
import { getImoveisApi, updateImovelApi } from '../../api/imovelAvulsoApi';
import { createReservaApi } from '../../api/reservaApi';
import ImovelAvulsoQuickCreateModal from '../../components/ImovelAvulso/ImovelAvulsoQuickCreateModal';
import './ReservaFormModal.css';

function ReservaFormModal({ leadId, leadNome, companyId, onClose }) {
  const [tipoImovelSelecionado, setTipoImovelSelecionado] = useState('Unidade'); // 'Unidade' | 'ImovelAvulso'
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [selectedEmpreendimentoId, setSelectedEmpreendimentoId] = useState('');
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
  const [imoveisAvulsos, setImoveisAvulsos] = useState([]);
  const [imovelFinalId, setImovelFinalId] = useState('');

  const [isLoadingEmpreendimentos, setIsLoadingEmpreendimentos] = useState(false);
  const [isLoadingUnidades, setIsLoadingUnidades] = useState(false);
  const [isLoadingImoveisAvulsos, setIsLoadingImoveisAvulsos] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    validadeReserva: '',
    valorSinal: '',
    observacoesReserva: '',
  });

  // NOVO: modal de criação rápida + marcar vendido para imóveis existentes
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [marcarVendidoAoSalvar, setMarcarVendidoAoSalvar] = useState(true);

  // Reset ao trocar o tipo
  useEffect(() => {
    setSelectedEmpreendimentoId('');
    setUnidadesDisponiveis([]);
    setImoveisAvulsos([]);
    setImovelFinalId('');
  }, [tipoImovelSelecionado]);

  // Carrega empreendimentos ou imóveis avulsos
  useEffect(() => {
    if (!companyId) return;

    const fetch = async () => {
      if (tipoImovelSelecionado === 'Unidade') {
        setIsLoadingEmpreendimentos(true);
        try {
          const data = await getEmpreendimentos(1, 1000, { ativo: true, company: companyId });
          setEmpreendimentos(data.empreendimentos || []);
        } catch {
          toast.error('Erro ao buscar empreendimentos.');
        } finally {
          setIsLoadingEmpreendimentos(false);
        }
      } else {
        setIsLoadingImoveisAvulsos(true);
        try {
          // Mantemos apenas Disponível; se o quick-create vier Vendido, adicionamos manualmente à lista local
          const data = await getImoveisApi({ status: 'Disponível', company: companyId });
          setImoveisAvulsos(data.imoveis || []);
        } catch {
          toast.error('Erro ao buscar imóveis avulsos.');
        } finally {
          setIsLoadingImoveisAvulsos(false);
        }
      }
    };

    fetch();
  }, [companyId, tipoImovelSelecionado]);

  // Carrega unidades quando seleciona empreendimento
  useEffect(() => {
    if (tipoImovelSelecionado !== 'Unidade' || !selectedEmpreendimentoId) {
      setUnidadesDisponiveis([]);
      return;
    }
    const fetch = async () => {
      setIsLoadingUnidades(true);
      try {
        const data = await getUnidades(selectedEmpreendimentoId, 1, 1000, { statusUnidade: 'Disponível', company: companyId });
        setUnidadesDisponiveis(data.unidades || []);
      } catch {
        toast.error('Erro ao buscar unidades disponíveis.');
      } finally {
        setIsLoadingUnidades(false);
      }
    };
    fetch();
  }, [selectedEmpreendimentoId, tipoImovelSelecionado, companyId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // NOVO: quando criar pelo quick-create, insere na lista e seleciona
  const handleQuickCreated = (novoImovel) => {
    if (novoImovel && novoImovel._id) {
      setImoveisAvulsos(prev => [novoImovel, ...prev]); // mesmo que esteja "Vendido", fica disponível localmente
      setImovelFinalId(novoImovel._id);
      toast.info('Imóvel criado e selecionado.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imovelFinalId) {
      toast.error('Por favor, selecione um imóvel para a reserva.');
      return;
    }
    if (!formData.validadeReserva) {
      toast.error('A data de validade da reserva é obrigatória.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const payload = {
        leadId,
        imovelId: imovelFinalId,
        tipoImovel: tipoImovelSelecionado, // 'Unidade' | 'ImovelAvulso'
        validadeReserva: formData.validadeReserva,
        valorSinal: formData.valorSinal ? parseFloat(formData.valorSinal) : null,
        observacoesReserva: formData.observacoesReserva,
      };

      await createReservaApi(payload);

      // Se for avulso e você quer marcar como vendido (para imóveis já existentes)
      if (tipoImovelSelecionado === 'ImovelAvulso' && marcarVendidoAoSalvar) {
        try {
          await updateImovelApi(imovelFinalId, { status: 'Vendido' });
        } catch {
          toast.warn('Reserva criada, mas não foi possível marcar o imóvel como Vendido.');
        }
      }

      toast.success('Reserva criada com sucesso!');
      onClose(true);
    } catch (err) {
      const errMsg = err?.error || err?.message || 'Erro ao criar reserva.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="form-modal-overlay" onClick={() => onClose(false)}>
      <div className="form-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <h2>Criar Reserva para: {leadNome || 'Lead'}</h2>
        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSubmit}>
          {/* Tipo de imóvel */}
          <div className="form-group tipo-imovel-selector">
            <label>Tipo de imóvel:</label>
            <div>
              <button
                type="button"
                className={`button ${tipoImovelSelecionado === 'Unidade' ? 'primary-button' : 'outline-button'}`}
                onClick={() => setTipoImovelSelecionado('Unidade')}
              >
                Unidade de Empreendimento
              </button>

              <button
                type="button"
                className={`button ${tipoImovelSelecionado === 'ImovelAvulso' ? 'primary-button' : 'outline-button'}`}
                onClick={() => setTipoImovelSelecionado('ImovelAvulso')}
              >
                Imóvel Avulso
              </button>
            </div>
          </div>

          {/* UNIDADE */}
          {tipoImovelSelecionado === 'Unidade' && (
            <>
              <div className="form-group">
                <label>Empreendimento*</label>
                <select
                  value={selectedEmpreendimentoId}
                  onChange={(e) => { setSelectedEmpreendimentoId(e.target.value); setImovelFinalId(''); }}
                  disabled={isLoadingEmpreendimentos || isSaving}
                  required
                >
                  <option value="">Selecione...</option>
                  {empreendimentos.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.nome}</option>
                  ))}
                </select>
                {!isLoadingEmpreendimentos && empreendimentos.length === 0 && <small>Nenhum empreendimento encontrado.</small>}
              </div>

              <div className="form-group">
                <label>Unidade*</label>
                <select
                  value={imovelFinalId}
                  onChange={(e) => setImovelFinalId(e.target.value)}
                  disabled={!selectedEmpreendimentoId || isLoadingUnidades || isSaving}
                  required
                >
                  <option value="">Selecione...</option>
                  {unidadesDisponiveis.map(un => (
                    <option key={un._id} value={un._id}>
                      {un.identificador} - {un.tipologia} (R$ {un.precoTabela?.toLocaleString('pt-BR')})
                    </option>
                  ))}
                </select>
                {!isLoadingUnidades && selectedEmpreendimentoId && unidadesDisponiveis.length === 0 && <small>Nenhuma unidade disponível.</small>}
              </div>
            </>
          )}

          {/* IMÓVEL AVULSO */}
          {tipoImovelSelecionado === 'ImovelAvulso' && (
            <>
              <div className="form-group">
                <label>Imóvel Avulso*</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={imovelFinalId}
                    onChange={(e) => setImovelFinalId(e.target.value)}
                    disabled={isLoadingImoveisAvulsos || isSaving}
                    required
                    style={{ flex: 1 }}
                  >
                    <option value="">Selecione...</option>
                    {imoveisAvulsos.map(imovel => (
                      <option key={imovel._id} value={imovel._id}>
                        {imovel.titulo} ({imovel.endereco?.cidade})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="button outline-button"
                    onClick={() => setShowQuickCreate(true)}
                    disabled={isSaving}
                  >
                    + Cadastrar
                  </button>
                </div>
                {!isLoadingImoveisAvulsos && imoveisAvulsos.length === 0 && (
                  <small>Nenhum imóvel avulso disponível.</small>
                )}
              </div>

              <div className="form-group">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={marcarVendidoAoSalvar}
                    onChange={(e) => setMarcarVendidoAoSalvar(e.target.checked)}
                    disabled={isSaving}
                  />
                  Marcar este imóvel como <strong>Vendido</strong> ao salvar a reserva
                </label>
              </div>
            </>
          )}

          {/* Infos adicionais */}
          <div className="form-row">
            <div className="form-group">
              <label>Validade da Reserva*</label>
              <input
                type="date"
                name="validadeReserva"
                value={formData.validadeReserva}
                onChange={handleChange}
                required
                disabled={isSaving}
              />
            </div>
            <div className="form-group">
              <label>Valor do Sinal (R$)</label>
              <input
                type="number"
                name="valorSinal"
                value={formData.valorSinal}
                onChange={handleChange}
                step="0.01"
                min="0"
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Observações</label>
            <textarea
              name="observacoesReserva"
              value={formData.observacoesReserva}
              onChange={handleChange}
              rows="3"
              disabled={isSaving}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="button cancel-button" onClick={() => onClose(false)} disabled={isSaving}>
              Cancelar
            </button>
            <button type="submit" className="button submit-button" disabled={isSaving || !imovelFinalId}>
              {isSaving ? 'Salvando...' : 'Criar Reserva'}
            </button>
          </div>
        </form>
      </div>

      {/* MODAL de criação rápida (passa cidade/UF se quiser defaults) */}
      <ImovelAvulsoQuickCreateModal
        open={showQuickCreate}
        onClose={() => setShowQuickCreate(false)}
        onCreated={handleQuickCreated}
        defaultCidade=""
        defaultUF=""
      />
    </div>
  );
}

export default ReservaFormModal;
