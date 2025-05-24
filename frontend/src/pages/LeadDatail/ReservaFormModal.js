// src/pages/LeadDetail/ReservaFormModal.js (ou seu caminho preferido)
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getEmpreendimentos } from '../../api/empreendimentoApi'; // API para listar empreendimentos
import { getUnidades } from '../../api/unidadeApi'; // API para listar unidades
import { createReservaApi } from '../../api/reservaApi'; // API para criar reserva
import './ReservaFormModal.css'; // Crie este CSS depois

// Helper para formatar data para input YYYY-MM-DD
const toInputDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `<span class="math-inline">\{year\}\-</span>{month}-${day}`;
};

function ReservaFormModal({ leadId, leadNome, companyId, onClose }) {
    const [empreendimentos, setEmpreendimentos] = useState([]);
    const [selectedEmpreendimentoId, setSelectedEmpreendimentoId] = useState('');
    const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
    const [selectedUnidadeId, setSelectedUnidadeId] = useState('');
    const [formData, setFormData] = useState({
        dataReserva: toInputDate(new Date()), // Default hoje
        validadeReserva: '',
        valorSinal: '',
        observacoesReserva: '',
    });
    const [isLoadingEmpreendimentos, setIsLoadingEmpreendimentos] = useState(false);
    const [isLoadingUnidades, setIsLoadingUnidades] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Buscar Empreendimentos da Empresa
    useEffect(() => {
        const fetchEmpreendimentosDaEmpresa = async () => {
            if (!companyId) return;
            setIsLoadingEmpreendimentos(true);
            try {
                const data = await getEmpreendimentos(1, 1000, { company: companyId, ativo: true }); // Lista todos ativos
                setEmpreendimentos(data.empreendimentos || []);
            } catch (err) {
                toast.error("Falha ao carregar lista de empreendimentos.");
                console.error("Erro buscando empreendimentos:", err);
            } finally {
                setIsLoadingEmpreendimentos(false);
            }
        };
        fetchEmpreendimentosDaEmpresa();
    }, [companyId]);

    // Buscar Unidades Disponíveis quando um Empreendimento é selecionado
    useEffect(() => {
        const fetchUnidadesDisponiveis = async () => {
            if (!selectedEmpreendimentoId || !companyId) {
                setUnidadesDisponiveis([]);
                setSelectedUnidadeId(''); // Limpa seleção de unidade
                return;
            }
            setIsLoadingUnidades(true);
            try {
                const data = await getUnidades(selectedEmpreendimentoId, 1, 1000, { statusUnidade: "Disponível", company: companyId });
                setUnidadesDisponiveis(data.unidades || []);
                if (data.unidades && data.unidades.length > 0) {
                    // setSelectedUnidadeId(data.unidades[0]._id); // Opcional: pré-selecionar primeira
                } else {
                    setSelectedUnidadeId('');
                }
            } catch (err) {
                toast.error("Falha ao carregar unidades disponíveis para este empreendimento.");
                console.error("Erro buscando unidades:", err);
                setUnidadesDisponiveis([]);
            } finally {
                setIsLoadingUnidades(false);
            }
        };
        fetchUnidadesDisponiveis();
    }, [selectedEmpreendimentoId, companyId]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedUnidadeId || !formData.validadeReserva) {
            toast.error("Selecione um empreendimento, uma unidade e defina a data de validade da reserva.");
            return;
        }
        setIsSaving(true);
        setError('');
        try {
            const payload = {
                leadId: leadId,
                unidadeId: selectedUnidadeId,
                empreendimentoId: selectedEmpreendimentoId,
                validadeReserva: formData.validadeReserva,
                valorSinal: formData.valorSinal ? parseFloat(formData.valorSinal) : null,
                observacoesReserva: formData.observacoesReserva,
                // dataReserva e statusReserva serão definidos pelo backend ou com default
            };
            await createReservaApi(payload);
            toast.success("Reserva criada com sucesso!");
            onClose(true); // Fecha o modal e indica sucesso para LeadDetailPage
        } catch (err) {
            const errMsg = err.error || err.message || "Erro ao criar reserva.";
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="form-modal-overlay" onClick={() => onClose(false)}>
            <div className="form-modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '650px'}}>
                <h2>Criar Reserva para: {leadNome || 'Lead'}</h2>
                {error && <p className="error-message" style={{marginBottom: '1rem'}}>{error}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="empreendimento">Empreendimento*</label>
                        <select 
                            id="empreendimento" 
                            value={selectedEmpreendimentoId} 
                            onChange={(e) => {setSelectedEmpreendimentoId(e.target.value); setSelectedUnidadeId(''); setUnidadesDisponiveis([]);}}
                            required
                            disabled={isLoadingEmpreendimentos || isSaving}
                        >
                            <option value="">Selecione um Empreendimento...</option>
                            {empreendimentos.map(emp => (
                                <option key={emp._id} value={emp._id}>{emp.nome}</option>
                            ))}
                        </select>
                        {isLoadingEmpreendimentos && <small>Carregando empreendimentos...</small>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="unidade">Unidade Disponível*</label>
                        <select 
                            id="unidade" 
                            value={selectedUnidadeId} 
                            onChange={(e) => setSelectedUnidadeId(e.target.value)}
                            required
                            disabled={!selectedEmpreendimentoId || isLoadingUnidades || isSaving || unidadesDisponiveis.length === 0}
                        >
                            <option value="">{isLoadingUnidades ? 'Carregando...' : (selectedEmpreendimentoId ? 'Selecione uma Unidade...' : 'Selecione um empreendimento primeiro')}</option>
                            {unidadesDisponiveis.map(un => (
                                <option key={un._id} value={un._id}>
                                    {un.identificador} - {un.tipologia || ''} (R$ {un.precoTabela?.toLocaleString('pt-BR') || 'N/A'})
                                </option>
                            ))}
                        </select>
                        {!isLoadingUnidades && selectedEmpreendimentoId && unidadesDisponiveis.length === 0 && <small>Nenhuma unidade disponível neste empreendimento.</small>}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="dataReserva">Data da Reserva*</label>
                            <input type="date" id="dataReserva" name="dataReserva" value={formData.dataReserva} onChange={handleChange} required disabled={isSaving} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="validadeReserva">Validade da Reserva*</label>
                            <input type="date" id="validadeReserva" name="validadeReserva" value={formData.validadeReserva} onChange={handleChange} required disabled={isSaving} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="valorSinal">Valor do Sinal (R$) (Opcional)</label>
                        <input type="number" id="valorSinal" name="valorSinal" value={formData.valorSinal} onChange={handleChange} step="0.01" min="0" disabled={isSaving} />
                    </div>

                    <div className="form-group">
                        <label htmlFor="observacoesReserva">Observações da Reserva (Opcional)</label>
                        <textarea id="observacoesReserva" name="observacoesReserva" value={formData.observacoesReserva} onChange={handleChange} rows="3" disabled={isSaving}></textarea>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="button cancel-button" onClick={() => onClose(false)} disabled={isSaving}>
                            Cancelar
                        </button>
                        <button type="submit" className="button submit-button" disabled={isSaving || !selectedUnidadeId}>
                            {isSaving ? 'Salvando Reserva...' : 'Criar Reserva'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ReservaFormModal;