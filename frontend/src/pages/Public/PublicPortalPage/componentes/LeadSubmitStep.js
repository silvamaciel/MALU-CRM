import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { submitPublicLeadApi } from '../../../../api/publicApi';

function LeadSubmitStep({ broker }) {
    const [formData, setFormData] = useState({ nome: '', email: '', contato: '', comentario: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        console.log("A submeter lead para o broker:", broker);
        console.log("A usar o token de submissão:", broker?.publicSubmissionToken);

        if (!broker || !broker.publicSubmissionToken) {
            toast.error("Erro: Token do parceiro não encontrado. Por favor, verifique a sua identidade novamente.");
            setIsSubmitting(false);
            return;
        }

        await submitPublicLeadApi(broker.publicSubmissionToken, formData);
        setSubmissionSuccess(true);
    } catch (error) {
        toast.error(error.error || "Falha ao enviar o lead.");
    } finally {
        setIsSubmitting(false);
    }
};
    
    if (submissionSuccess) {
        return (
            <div className="submission-success">
                <h3>Obrigado!</h3>
                <p>A sua indicação foi recebida com sucesso e será analisada pela nossa equipa.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="submission-form">
            <div className="form-group"><label>Nome do Cliente *</label><input type="text" name="nome" value={formData.nome} onChange={handleChange} required /></div>
            <div className="form-group"><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} /></div>
            <div className="form-group"><label>Telefone / WhatsApp *</label><input type="tel" name="contato" value={formData.contato} onChange={handleChange} required /></div>
            <div className="form-group"><label>Observações</label><textarea name="comentario" value={formData.comentario} onChange={handleChange} rows="3"></textarea></div>
            <button type="submit" className="button submit-button-public" disabled={isSubmitting}>
                {isSubmitting ? 'A enviar...' : 'Enviar Indicação'}
            </button>
        </form>
    );
}

export default LeadSubmitStep;