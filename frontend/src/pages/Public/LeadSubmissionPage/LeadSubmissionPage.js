// src/pages/Public/LeadSubmissionPage/LeadSubmissionPage.js
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { submitPublicLeadApi } from '../../../api/publicApi';
import 'react-toastify/dist/ReactToastify.css';
import './LeadSubmissionPage.css'; // Criaremos este CSS

function LeadSubmissionPage() {
    const { brokerToken } = useParams();
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        contato: '',
        comentario: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nome || !formData.contato) {
            toast.error("Nome e Contato são obrigatórios.");
            return;
        }
        setIsSubmitting(true);
        try {
            await submitPublicLeadApi(brokerToken, formData);
            setSubmissionSuccess(true); // Exibe a mensagem de sucesso
            toast.success("Lead enviado com sucesso! Agradecemos a sua parceria.");
        } catch (error) {
            toast.error(error.error || error.message || "Não foi possível enviar o lead. Verifique o link ou tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="public-submission-page">
            <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
            <div className="submission-card">
                <header className="submission-header">
                    {/* Pode colocar o logo da sua empresa aqui */}
                    <h2>Indicação de Novo Cliente</h2>
                    <p>Preencha os dados abaixo para submeter um novo lead.</p>
                </header>
                
                {submissionSuccess ? (
                    <div className="submission-success">
                        <h3>Obrigado!</h3>
                        <p>A sua indicação foi recebida e será analisada pela nossa equipa comercial.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="submission-form">
                        <div className="form-group">
                            <label htmlFor="nome">Nome do Cliente</label>
                            <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="contato">Telefone / WhatsApp</label>
                            <input type="tel" id="contato" name="contato" value={formData.contato} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="comentario">Observações</label>
                            <textarea id="comentario" name="comentario" value={formData.comentario} onChange={handleChange} rows="3"></textarea>
                        </div>
                        <button type="submit" className="button submit-button-public" disabled={isSubmitting}>
                            {isSubmitting ? 'Enviando...' : 'Enviar Indicação'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default LeadSubmissionPage;