import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import BrokerCheckStep from './componentes/BrokerCheckStep';
import BrokerRegisterStep from './componentes/BrokerRegisterStep';

import LeadFormModal from '../../components/LeadFormModal/LeadFormModal';
import { ensureOrigemApi } from '../../api/origens';

import './PublicPortalPage.css';

function PublicPortalPage() {
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('empresa');

  const [currentStep, setCurrentStep] = useState('check_broker');
  const [verifiedBroker, setVerifiedBroker] = useState(null);
  const [identifierForRegister, setIdentifierForRegister] = useState('');

  const [openLeadModal, setOpenLeadModal] = useState(false);
  const [origemParceriaId, setOrigemParceriaId] = useState(null);

  if (!companyId) {
    return (
      <div className="public-page error">
        <h1>Erro: Link de parceiro inválido. O ID da empresa não foi encontrado.</h1>
      </div>
    );
  }

  const handleBrokerFound = async (brokerData) => {
    setVerifiedBroker(brokerData);
    try {
      const origem = await ensureOrigemApi('Canal de parceria');
      setOrigemParceriaId(origem?._id || null);
      setOpenLeadModal(true);
      setCurrentStep('check_broker'); // mantém a tela “quieta”
    } catch {
      toast.error('Falha ao garantir a origem "Canal de parceria".');
    }
  };

  const handleBrokerNotFound = (identifier) => {
    setIdentifierForRegister(identifier);
    setCurrentStep('register_broker');
    toast.info("Não encontramos o seu registo. Complete seus dados para continuar.");
  };

  const handleBrokerRegistered = async (brokerData) => {
    setVerifiedBroker(brokerData);
    try {
      const origem = await ensureOrigemApi('Canal de parceria');
      setOrigemParceriaId(origem?._id || null);
      setOpenLeadModal(true);
      setCurrentStep('check_broker');
    } catch {
      toast.error('Falha ao garantir a origem "Canal de parceria".');
    }
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
          {renderStep()}
        </div>
      </div>

      <LeadFormModal
        isOpen={openLeadModal}
        onClose={() => setOpenLeadModal(false)}
        prefill={{
          origem: origemParceriaId,
          corretorResponsavel: verifiedBroker?._id || null,
        }}
        corretorInfo={
          verifiedBroker
            ? { id: verifiedBroker._id, nome: verifiedBroker.nome }
            : undefined
        }
        hideFields={[
          'origem',      // fixado via prefill
          'responsavel', // fluxo público não usa user interno
          // corretorResponsavel não precisa esconder: é read-only via bloco, e vai no payload pelo prefill
        ]}
        onSaved={() => {
          setOpenLeadModal(false);
          toast.success('Lead criado com sucesso no CRM.');
        }}
      />
    </div>
  );
}

export default PublicPortalPage;
