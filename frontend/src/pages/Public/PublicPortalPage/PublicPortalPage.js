import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import BrokerCheckStep from './componentes/BrokerCheckStep';
import BrokerRegisterStep from './componentes/BrokerRegisterStep';

import LeadFormModal from '../../../components/LeadFormModal/LeadFormModal';

import { submitLeadRequestPublicApi } from '../../../api/leadRequests';



import './PublicPortalPage.css';

function PublicPortalPage() {
    const [searchParams] = useSearchParams();
    const companyId = searchParams.get('empresa');

    const [currentStep, setCurrentStep] = useState('check_broker');
    const [verifiedBroker, setVerifiedBroker] = useState(null);
    const [identifierForRegister, setIdentifierForRegister] = useState('');

    const [openLeadModal, setOpenLeadModal] = useState(false);
    const [justSubmitted, setJustSubmitted] = useState(false);

    if (!companyId) {
        return (
            <div className="public-page error">
                <h1>Erro: Link de parceiro inválido. O ID da empresa não foi encontrado.</h1>
            </div>
        );
    }

    const handleBrokerFound = (brokerData) => {
        setVerifiedBroker(brokerData);
        setOpenLeadModal(true);           // abre modal direto
        setCurrentStep('check_broker');   // mantém tela estável
    };

    const handleBrokerNotFound = (identifier) => {
        setIdentifierForRegister(identifier);
        setCurrentStep('register_broker');
        toast.info("Não encontramos o seu registo. Complete seus dados para continuar.");
    };

    const handleBrokerRegistered = (brokerData) => {
        setVerifiedBroker(brokerData);
        setOpenLeadModal(true);           // abre modal após cadastro
        setCurrentStep('check_broker');
    };

    const renderStep = () => {
        switch (currentStep) {
            case 'check_broker':
                return (
                    <BrokerCheckStep
                        companyId={companyId}
                        onBrokerFound={handleBrokerFound}
                        onBrokerNotFound={handleBrokerNotFound}
                    />
                );
            case 'register_broker':
                return (
                    <BrokerRegisterStep
                        companyToken={companyId}
                        initialIdentifier={identifierForRegister}
                        onBrokerRegistered={handleBrokerRegistered}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="public-submission-page">
            <ToastContainer position="top-center" autoClose={7000} />
            <div className="submission-card">
                <header className="submission-header">
                    <h1>Portal de Parceiros</h1>
                </header>

                <div className="submission-body">
                    {verifiedBroker && (
                        <div className="broker-welcome">
                            <p>
                                Olá, <strong>{verifiedBroker.nome}</strong>! Preencha os dados do seu cliente abaixo.
                            </p>
                        </div>
                    )}

                    {verifiedBroker && justSubmitted && (
                        <div className="success-panel">
                            <p>Solicitação enviada para aprovação.</p>
                            <div className="actions">
                                <button
                                    className="button submit-button-public"
                                    onClick={() => { setJustSubmitted(false); setOpenLeadModal(true); }}
                                >
                                    Cadastrar outro lead
                                </button>
                            </div>
                        </div>
                    )}
                    {renderStep()}
                </div>
            </div>

            <LeadFormModal
                isOpen={openLeadModal}
                onClose={() => setOpenLeadModal(false)}
                prefill={{
                    corretorResponsavel: verifiedBroker?._id || null,
                }}
                corretorInfo={
                    verifiedBroker ? { id: verifiedBroker._id, nome: verifiedBroker.nome } : undefined
                }
                hideFields={['situacao', 'origem', 'responsavel']}
                createApi={(payload) => {
                    if (!verifiedBroker?._id) return Promise.reject(new Error('Corretor ausente.'));
                    return submitLeadRequestPublicApi({
                        ...payload,
                        company: companyId,
                        corretorResponsavel: verifiedBroker._id,
                    });
                }}
                onSaved={() => {
                    setOpenLeadModal(false);
                    setJustSubmitted(true);
                    toast.success('Solicitação enviada para aprovação.');
                }}
            />
        </div>
    );
}

export default PublicPortalPage;
