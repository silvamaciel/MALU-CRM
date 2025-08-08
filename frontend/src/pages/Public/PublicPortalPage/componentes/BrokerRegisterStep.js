import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { registerBrokerApi } from '../../../../api/publicApi';

function BrokerRegisterStep({ companyToken, initialIdentifier, onBrokerRegistered }) {
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        contato: '',
        cpfCnpj: initialIdentifier.match(/^\d{11}$|^\d{14}$/) ? initialIdentifier : '',
        creci: !initialIdentifier.match(/^\d{11}$|^\d{14}$/) ? initialIdentifier : ''
    });
    const [isLoading, setIsLoading] = useState(false);
    
    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const registeredBroker = await registerBrokerApi(companyToken, formData);
            onBrokerRegistered(registeredBroker);
        } catch (error) {
            toast.error(error.error || "Falha ao registar. Verifique os dados.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="submission-form">
            <h2>Registo de Novo Parceiro</h2>
            <p>Não encontrámos o seu registo. Por favor, complete os seus dados para continuar.</p>
            <div className="form-group"><label>Nome Completo *</label><input type="text" name="nome" value={formData.nome} onChange={handleChange} required /></div>
            <div className="form-group"><label>Email *</label><input type="email" name="email" value={formData.email} onChange={handleChange} required /></div>
            <div className="form-group"><label>Telefone / WhatsApp *</label><input type="tel" name="contato" value={formData.contato} onChange={handleChange} required /></div>
            <div className="form-group"><label>CPF / CNPJ</label><input type="text" name="cpfCnpj" value={formData.cpfCnpj} onChange={handleChange} /></div>
            <div className="form-group"><label>CRECI</label><input type="text" name="creci" value={formData.creci} onChange={handleChange} /></div>
            <button type="submit" className="button submit-button-public" disabled={isLoading}>{isLoading ? 'A registar...' : 'Registar e Continuar'}</button>
        </form>
    );
}

export default BrokerRegisterStep;