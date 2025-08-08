import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Importando os novos sub-componentes
import BrokerCheckStep from './componentes/BrokerCheckStep';
import BrokerRegisterStep from './componentes/BrokerRegisterStep';
import LeadSubmitStep from './componentes/LeadSubmitStep';

import './PublicPortalPage.css';

function PublicPortalPage() {
    const [searchParams] = useSearchParams();
    const companyId = searchParams.get('empresa');

    const [currentStep, setCurrentStep] = useState('check_broker');
    const [verifiedBroker, setVerifiedBroker] = useState(null);
    const [identifierForRegister, setIdentifierForRegister] = useState('');

    if (!companyId) {
        return <div className="public-page error"><h1>Erro: Link de parceiro inválido. O ID da empresa não foi encontrado.</h1></div>;
    }

    const handleBrokerFound = (brokerData) => {
        setVerifiedBroker(brokerData);
        setCurrentStep('submit_lead');
    };
    
    const handleBrokerNotFound = (identifier) => {
        setIdentifierForRegister(identifier);
        setCurrentStep('register_broker');
        toast.info("Não encontrámos o seu registo. Por favor, complete os seus dados para continuar.");
    };

    const handleBrokerRegistered = (brokerData) => {
        setVerifiedBroker(brokerData);
        setCurrentStep('submit_lead');
        toast.success(`Registo concluído! Agora pode submeter o seu lead.`);
    };

    const renderStep = () => {
        switch (currentStep) {
            case 'check_broker':
                return <BrokerCheckStep onBrokerFound={handleBrokerFound} onBrokerNotFound={handleBrokerNotFound} />;
            case 'register_broker':
                return <BrokerRegisterStep companyToken={companyId} initialIdentifier={identifierForRegister} onBrokerRegistered={handleBrokerRegistered} />;
            case 'submit_lead':
                return <LeadSubmitStep broker={verifiedBroker} />;
            default:
                return <BrokerCheckStep onBrokerFound={handleBrokerFound} onBrokerNotFound={handleBrokerNotFound} />;
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
                            <p>Olá, <strong>{verifiedBroker.nome}</strong>! Por favor, preencha os dados do seu cliente abaixo.</p>
                        </div>
                    )}
                    {renderStep()}
                </div>
            </div>
        </div>
    );
}

export default PublicPortalPage;