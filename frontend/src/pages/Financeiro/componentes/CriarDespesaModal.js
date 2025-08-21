import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { criarDespesaApi, listarCredoresApi } from '../../../api/financeiroApi';

function CriarDespesaModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        descricao: '',
        credor: '',
        valor: '',
        dataVencimento: '',
        centroDeCusto: 'Outros'
    });
    const [credores, setCredores] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Carrega a lista de credores quando o modal é aberto
        if (isOpen) {
            listarCredoresApi()
                .then(data => setCredores(data || []))
                .catch(() => toast.error("Erro ao carregar a lista de credores."));
        }
    }, [isOpen]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await criarDespesaApi(formData);
            toast.success("Despesa adicionada com sucesso!");
            onSuccess();
        } catch (error) {
            toast.error(error.message || "Falha ao criar despesa.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Adicionar Nova Despesa</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Descrição</label>
                        <input type="text" name="descricao" onChange={handleChange} required />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Credor</label>
                            <select name="credor" onChange={handleChange} required>
                                <option value="">Selecione...</option>
                                {credores.map(c => <option key={c._id} value={c._id}>{c.nome}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Centro de Custo</label>
                            <select name="centroDeCusto" value={formData.centroDeCusto} onChange={handleChange}>
                                <option>Outros</option>
                                <option>Comissões</option>
                                <option>Marketing</option>
                                <option>Operacional</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Valor (R$)</label>
                            <input type="number" step="0.01" name="valor" onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Data de Vencimento</label>
                            <input type="date" name="dataVencimento" onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="button cancel-button" onClick={onClose} disabled={isSaving}>Cancelar</button>
                        <button type="submit" className="button submit-button" disabled={isSaving}>
                            {isSaving ? 'A salvar...' : 'Salvar Despesa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CriarDespesaModal;