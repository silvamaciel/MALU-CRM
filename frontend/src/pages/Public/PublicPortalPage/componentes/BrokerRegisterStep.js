// src/pages/.../BrokerRegisterStep.jsx
import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { registerBrokerApi } from '../../../../api/publicApi';

// IMPORTA O MODAL REUTILIZÁVEL
import BrokerFormModal from '../../../../components/BrokerFormModal/BrokerFormModal';
import BrokerViewModal from '../../../../components/BrokerViewModal/BrokerViewModal';

function BrokerRegisterStep({ companyToken, initialIdentifier, onBrokerRegistered }) {
  const [openForm, setOpenForm] = useState(true);
  const [processing, setProcessing] = useState(false);

  // FIX: estados faltantes
  const [openView, setOpenView] = useState(false);
  const [registeredData, setRegisteredData] = useState(null);

  const initialData = useMemo(() => {
    const isCpfCnpj = /^\d{11}$|^\d{14}$/.test(initialIdentifier || '');
    return {
      _id: undefined,
      nome: '',
      email: '',
      contato: '',
      cpfCnpj: isCpfCnpj ? initialIdentifier : '',
      creci: !isCpfCnpj ? initialIdentifier : '',
      ativo: true,
    };
  }, [initialIdentifier]);

  const handleSubmit = async (payload /*, meta */) => {
    setProcessing(true);
    try {
      const toSend = { ativo: true, ...payload };

      const registeredBroker = await registerBrokerApi(companyToken, toSend);
      toast.success('Parceiro registado com sucesso!');
      onBrokerRegistered?.(registeredBroker);

      // Pós-sucesso: fecha form e abre visualização
      setRegisteredData(registeredBroker);
      setOpenForm(false);
      setOpenView(true);
    } catch (error) {
      toast.error(error?.error || 'Falha ao registar. Verifique os dados.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <BrokerFormModal
        isOpen={openForm}
        onClose={() => { if (!processing) setOpenForm(false); }}
        initialData={initialData}
        onSubmit={handleSubmit}
        isProcessing={processing}
        title="Registo de Novo Parceiro"
      />

      {/* Fallback enxuto caso o usuário feche o modal */}
      {!openForm && (
        <div className="submission-form">
          <h2>Registo de Novo Parceiro</h2>
          <p>Para continuar, abra o formulário.</p>
          <button
            type="button"
            className="button submit-button-public"
            onClick={() => setOpenForm(true)}
          >
            Abrir formulário
          </button>
        </div>
      )}

      <BrokerViewModal
        isOpen={openView}
        data={registeredData}
        onClose={() => setOpenView(false)}
      />
    </>
  );
}

export default BrokerRegisterStep;
