import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { criarCredorApi } from '../../../api/financeiroApi';

function CriarCredorModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        nome: '',
        cpfCnpj: '',
        tipo: 'Fornecedor',
        contato: '',
        email: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await criarCredorApi(formData);
            toast.success("Credor registado com sucesso!");
            onSuccess(); // Notifica o pai para atualizar a lista
        } catch (error) {
            toast.error(error.message || "Falha ao registar credor.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Registar Novo Credor</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nome</label>
                        <input type="text" name="nome" onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Tipo</label>
                        <select name="tipo" value={formData.tipo} onChange={handleChange}>
                            <option value="Fornecedor">Fornecedor</option>
                            <option value="Corretor">Corretor</option>
                            <option value="Funcionário">Funcionário</option>
                            <option value="Outro">Outro</option>
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>CPF / CNPJ</label>
                            <input type="text" name="cpfCnpj" onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Telefone</label>
                            <input type="tel" name="contato" onChange={handleChange} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" name="email" onChange={handleChange} />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="button cancel-button" onClick={onClose} disabled={isSaving}>Cancelar</button>
                        <button type="submit" className="button submit-button" disabled={isSaving}>
                            {isSaving ? 'A salvar...' : 'Salvar Credor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CriarCredorModal;