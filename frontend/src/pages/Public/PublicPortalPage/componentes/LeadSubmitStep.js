import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { submitPublicLeadApi } from '../../../../api/publicApi';
import LeadFormModal from '../../../../components/LeadFormModal/LeadFormModal';

function LeadSubmitStep({ broker }) {
    const [formData, setFormData] = useState({ nome: '', email: '', contato: '', comentario: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);




    // modal state
    const [openLeadModal, setOpenLeadModal] = useState(false);
    const [origemParceriaId, setOrigemParceriaId] = useState(null);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const openCrmModal = async () => {
        try {
            const origem = await ensureOrigemApi('Canal de parceria'); // será criada se não existir
            setOrigemParceriaId(origem?._id || null);
            setOpenLeadModal(true);
        } catch (e) {
            toast.error('Falha ao garantir a origem "Canal de parceria".');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (!broker || !broker.publicSubmissionToken) {
                toast.error("Erro: Token do parceiro não encontrado. Refaça a verificação.");
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
        <>
            <form onSubmit={handleSubmit} className="submission-form">
                <div className="form-group">
                    <label>Nome do Cliente *</label>
                    <input type="text" name="nome" value={formData.nome} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label>Telefone / WhatsApp *</label>
                    <input type="tel" name="contato" value={formData.contato} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Observações</label>
                    <textarea name="comentario" value={formData.comentario} onChange={handleChange} rows="3" />
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button type="submit" className="button submit-button-public" disabled={isSubmitting}>
                        {isSubmitting ? 'A enviar...' : 'Enviar Indicação'}
                    </button>

                    {/* Ação alternativa: cadastro direto no CRM via modal */}
                    <button
                        type="button"
                        className="button"
                        onClick={() => setOpenLeadModal(true)}
                        disabled={isSubmitting}
                    >
                        Cadastrar no CRM
                    </button>
                </div>

                {/* dica visual opcional */}
                {/* <small>Ou cadastre internamente no CRM para já direcionar estágio, origem e responsável.</small> */}
            </form>

            {/* Modal plugado com prefill */}
            <button type="button" className="button" onClick={openCrmModal}>
                Cadastrar no CRM
            </button>

            <LeadFormModal
                isOpen={openLeadModal}
                onClose={() => setOpenLeadModal(false)}
                prefill={{
                    nome: formData.nome || '',
                    contato: formData.contato || '',
                    email: formData.email || '',
                    comentario: formData.comentario || '',
                    origem: origemParceriaId,                 // fixado
                    corretorResponsavel: broker?._id || null, // novo campo
                }}
                hideFields={[
                    'origem', 'responsavel', 'cpf', 'nascimento', 'endereco', 'corretorResponsavel'
                ]}
                onSaved={() => {
                    setOpenLeadModal(false);
                    toast.success('Lead criado no CRM.');
                }}
            />

        </>
    );
}

export default LeadSubmitStep;
