// src/pages/Public/LeadSubmissionPage/LeadSubmissionPage.js
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { checkBrokerApi, submitPublicLeadApi } from '../../../api/publicApi';
import 'react-toastify/dist/ReactToastify.css';
import './LeadSubmissionPage.css';

// Componente para a Etapa 1: Verificação
const BrokerCheckStep = ({ onBrokerVerified }) => {
    const [identifier, setIdentifier] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCheck = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await checkBrokerApi(identifier);
            if (result.exists) {
                toast.success(`Bem-vindo(a) de volta, ${result.broker.nome}!`);
                onBrokerVerified(result.broker); // Passa os dados do corretor para o componente pai
            } else {
                toast.info("Corretor não encontrado. Por favor, faça o seu registo.");
                // Aqui, você pode redirecionar para um formulário de registo ou exibi-lo
            }
        } catch (error) {
            toast.error(error.error || "Falha ao verificar o corretor.");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleCheck} className="submission-form">
            <p>Para começar, por favor, identifique-se com seu CPF ou CRECI.</p>
            <div className="form-group">
                <label htmlFor="identifier">CPF ou CRECI</label>
                <input type="text" id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
            </div>
            <button type="submit" className="button submit-button-public" disabled={isLoading}>
                {isLoading ? 'Verificando...' : 'Verificar'}
            </button>
        </form>
    );
};

// Componente para a Etapa 2: Submissão do Lead
const LeadSubmitStep = ({ broker }) => {
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
            {/* Adapte este formulário para ser igual ao seu LeadFormPage.js */}
            <div className="form-group"><label>Nome do Cliente</label><input type="text" name="nome" value={formData.nome} onChange={handleChange} required /></div>
            <div className="form-group"><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} /></div>
            <div className="form-group"><label>Telefone / WhatsApp</label><input type="tel" name="contato" value={formData.contato} onChange={handleChange} required /></div>
            <div className="form-group"><label>Observações</label><textarea name="comentario" value={formData.comentario} onChange={handleChange} rows="3"></textarea></div>
            <button type="submit" className="button submit-button-public" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando...' : 'Enviar Indicação'}
            </button>
        </form>
    );
};


function PublicLeadSubmissionPage() {
    const [verifiedBroker, setVerifiedBroker] = useState(null);

    return (
        <div className="public-submission-page">
            <ToastContainer position="top-center" />
            <div className="submission-card">
                <header className="submission-header">
                    <h2>Portal de Parceiros</h2>
                </header>
                
                {!verifiedBroker ? (
                    <BrokerCheckStep onBrokerVerified={setVerifiedBroker} />
                ) : (
                    <>
                        <div className="broker-welcome">
                            <p>Olá, <strong>{verifiedBroker.nome}</strong>! Por favor, preencha os dados do seu cliente abaixo.</p>
                        </div>
                        <LeadSubmitStep broker={verifiedBroker} />
                    </>
                )}
            </div>
        </div>
    );
}

export default PublicLeadSubmissionPage;