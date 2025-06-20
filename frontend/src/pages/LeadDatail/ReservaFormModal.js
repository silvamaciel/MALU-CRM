import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getEmpreendimentos } from '../../api/empreendimentoApi';
import { getUnidades } from '../../api/unidadeApi';
import { getImoveisApi } from '../../api/imovelAvulsoApi';
import { createReservaApi } from '../../api/reservaApi';
import './ReservaFormModal.css';

const toInputDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function ReservaFormModal({ leadId, leadNome, companyId, onClose }) {
    const [tipoImovelSelecionado, setTipoImovelSelecionado] = useState('Unidade'); // 'Unidade' ou 'ImovelAvulso'
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

    // Reset geral ao trocar tipo de imóvel
    useEffect(() => {
        setSelectedEmpreendimentoId('');
        setUnidadesDisponiveis([]);
        setImoveisAvulsos([]);
        setImovelFinalId('');
    }, [tipoImovelSelecionado]);

    // Buscar dados com base no tipo
    useEffect(() => {
        if (!companyId) return;

        const fetch = async () => {
            if (tipoImovelSelecionado === 'Unidade') {
                setIsLoadingEmpreendimentos(true);
                try {
                    const data = await getEmpreendimentos(1, 1000, { ativo: true, company: companyId });
                    setEmpreendimentos(data.empreendimentos || []);
                } catch (err) {
                    toast.error("Erro ao buscar empreendimentos.");
                } finally {
                    setIsLoadingEmpreendimentos(false);
                }
            } else {
                setIsLoadingImoveisAvulsos(true);
                try {
                    const data = await getImoveisApi({ status: 'Disponível', company: companyId });
                    setImoveisAvulsos(data.imoveis || []);
                } catch (err) {
                    toast.error("Erro ao buscar imóveis avulsos.");
                } finally {
                    setIsLoadingImoveisAvulsos(false);
                }
            }
        };

        fetch();
    }, [companyId, tipoImovelSelecionado]);

    // Buscar unidades de um empreendimento
    useEffect(() => {
        if (tipoImovelSelecionado !== 'Unidade' || !selectedEmpreendimentoId) {
            setUnidadesDisponiveis([]);
            return;
        }

        const fetch = async () => {
            setIsLoadingUnidades(true);
            try {
                const data = await getUnidades(selectedEmpreendimentoId, 1, 1000, { statusUnidade: "Disponível", company: companyId });
                setUnidadesDisponiveis(data.unidades || []);
            } catch (err) {
                toast.error("Erro ao buscar unidades disponíveis.");
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!imovelFinalId) {
            toast.error("Por favor, selecione um imóvel para a reserva.");
            return;
        }
        if (!formData.validadeReserva) {
            toast.error("A data de validade da reserva é obrigatória.");
            return;
        }

        setIsSaving(true);
        setError('');
        try {
            const payload = {
                leadId: leadId,
                imovelId: imovelFinalId,
                tipoImovel: tipoImovelSelecionado, // 'Unidade' ou 'ImovelAvulso'
                validadeReserva: formData.validadeReserva,
                valorSinal: formData.valorSinal ? parseFloat(formData.valorSinal) : null,
                observacoesReserva: formData.observacoesReserva,
            };

            await createReservaApi(payload);
            toast.success("Reserva criada com sucesso!");
            onClose(true);
        } catch (err) {
            const errMsg = err?.error || err?.message || "Erro ao criar reserva.";
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="form-modal-overlay" onClick={() => onClose(false)}>
            <div className="form-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
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
                            >Unidade de Empreendimento</button>

                            <button
                                type="button"
                                className={`button ${tipoImovelSelecionado === 'ImovelAvulso' ? 'primary-button' : 'outline-button'}`}
                                onClick={() => setTipoImovelSelecionado('ImovelAvulso')}
                            >Imóvel Avulso</button>
                        </div>
                    </div>

                    {/* Se for UNIDADE */}
                    {tipoImovelSelecionado === 'Unidade' && (
                        <>
                            <div className="form-group">
                                <label>Empreendimento*</label>
                                <select
                                    value={selectedEmpreendimentoId}
                                    onChange={(e) => {
                                        setSelectedEmpreendimentoId(e.target.value);
                                        setImovelFinalId('');
                                    }}
                                    disabled={isLoadingEmpreendimentos || isSaving}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {empreendimentos.map(emp => (
                                        <option key={emp._id} value={emp._id}>{emp.nome}</option>
                                    ))}
                                </select>
                                {!isLoadingEmpreendimentos && empreendimentos.length === 0 && (
                                    <small>Nenhum empreendimento encontrado.</small>
                                )}
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
                                {!isLoadingUnidades && selectedEmpreendimentoId && unidadesDisponiveis.length === 0 && (
                                    <small>Nenhuma unidade disponível.</small>
                                )}
                            </div>
                        </>
                    )}

                    {/* Se for IMÓVEL AVULSO */}
                    {tipoImovelSelecionado === 'ImovelAvulso' && (
                        <div className="form-group">
                            <label>Imóvel Avulso*</label>
                            <select
                                value={imovelFinalId}
                                onChange={(e) => setImovelFinalId(e.target.value)}
                                disabled={isLoadingImoveisAvulsos || isSaving}
                                required
                            >
                                <option value="">Selecione...</option>
                                {imoveisAvulsos.map(imovel => (
                                    <option key={imovel._id} value={imovel._id}>
                                        {imovel.titulo} ({imovel.endereco?.cidade})
                                    </option>
                                ))}
                            </select>
                            {!isLoadingImoveisAvulsos && imoveisAvulsos.length === 0 && (
                                <small>Nenhum imóvel avulso disponível.</small>
                            )}
                        </div>
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

                    {/* Ações */}
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
        </div>
    );
}

export default ReservaFormModal;
