// src/pages/Admin/BrokerContactsAdminPage.js
import React, { useState, useEffect, useCallback } from 'react';
// API Functions
import {
    getBrokerContacts, createBrokerContact, updateBrokerContact, deleteBrokerContact
} from '../../api/brokerContacts'; // <<< Importa a nova API
import { toast } from 'react-toastify';
// Components
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'; // <<< Input de Telefone
import 'react-phone-number-input/style.css'; // <<< CSS do Input de Telefone
// CSS
import './AdminPages.css'; // CSS Admin compartilhado

// Estado inicial para o formulário
const initialFormData = {
    nome: '', contato: '', email: '', creci: '', nomeImobiliaria: '', cpfCnpj: '', ativo: true
};

function BrokerContactsAdminPage() {
    // State da lista
    const [brokers, setBrokers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State dos Modais
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    // State para item selecionado/editando/deletando
    const [currentBroker, setCurrentBroker] = useState(null); // Usado para View e Edit
    const [deleteTargetBroker, setDeleteTargetBroker] = useState(null);

    // State do Formulário Add/Edit
    const [formData, setFormData] = useState(initialFormData);
    const [initialDataForEdit, setInitialDataForEdit] = useState(null); // Para comparar mudanças
    const [isProcessingForm, setIsProcessingForm] = useState(false);
    const [formError, setFormError] = useState(null);

    // State do processo de Delete
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteErrorState, setDeleteErrorState] = useState(null);

    // --- Funções de Fetch e Refresh ---
    const fetchBrokers = useCallback(async () => {
        setIsLoading(true); setError(null);
        try {
            const data = await getBrokerContacts();
            setBrokers(data || []);
        } catch (err) {
            const errorMsg = err.message || "Falha ao carregar agenda de corretores.";
            setError(errorMsg); toast.error(errorMsg); setBrokers([]);
        } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchBrokers(); }, [fetchBrokers]);

    // --- Handlers Formulário/Modais ---
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handlePhoneChange = useCallback((value) => {
        setFormData(prev => ({ ...prev, contato: value || '' }));
    }, []);

    const handleOpenAddModal = () => {
        setCurrentBroker(null); setInitialDataForEdit(null); setFormData(initialFormData); // Limpa tudo
        setFormError(null); setIsFormModalOpen(true);
    };

    const handleOpenEditModal = (broker) => {
        setCurrentBroker(broker);
        const formDataToSet = { // Preenche form com dados atuais
            nome: broker.nome || '',
            contato: broker.contato || '',
            email: broker.email || '',
            creci: broker.creci || '',
            nomeImobiliaria: broker.nomeImobiliaria || '',
            cpfCnpj: broker.cpfCnpj || '',
            ativo: broker.ativo === undefined ? true : broker.ativo
        };
        setFormData(formDataToSet);
        setInitialDataForEdit(formDataToSet); // Guarda base para comparação
        setFormError(null); setIsFormModalOpen(true);
    };

     const handleOpenViewModal = (broker) => {
        setCurrentBroker(broker); // Define o corretor para visualizar
        setIsViewModalOpen(true); // Abre o modal de visualização
    };

    const handleCloseModals = () => { // Fecha todos os modais e reseta
        setIsFormModalOpen(false); setIsDeleteConfirmOpen(false); setIsViewModalOpen(false);
        setCurrentBroker(null); setInitialDataForEdit(null); setDeleteTargetBroker(null);
        setFormError(null); setDeleteErrorState(null);
        setIsProcessingForm(false); setIsDeleting(false);
        resetFormData(); // Garante que form data foi resetado
    };

    const resetFormData = () => setFormData(initialFormData); // Função separada para resetar

    // Salvar (Create ou Update)
    const handleSaveBroker = async (event) => {
        event.preventDefault(); setFormError(null); setIsProcessingForm(true);

        // Validação Frontend básica
        if (!formData.nome) {
            setFormError("O nome é obrigatório."); setIsProcessingForm(false); return;
        }
         if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
           setFormError('Formato de email inválido.'); setIsProcessingForm(false); return;
        }
        if (formData.contato && !isValidPhoneNumber(formData.contato)) { // Valida telefone se preenchido
            setFormError('Formato de telefone inválido.'); setIsProcessingForm(false); return;
        }
        // Validação de CRECI/CPF/CNPJ pode ser mais complexa, deixar para backend por enquanto

        let dataToSend = {};
        let operationPromise;
        let successMessage;

        if (currentBroker && currentBroker._id) { // Edit Mode: Enviar apenas alterações
            const changedData = {};
            Object.keys(formData).forEach(key => {
                const currentValue = formData[key] ?? '';
                const initialValue = initialDataForEdit[key] ?? '';
                if (currentValue !== initialValue) {
                     changedData[key] = currentValue === '' ? null : currentValue;
                }
            });
            if (Object.keys(changedData).length === 0) {
                toast.info("Nenhuma alteração detectada."); setIsProcessingForm(false); return;
            }
            dataToSend = changedData;
            console.log("Enviando para Update:", dataToSend);
            operationPromise = updateBrokerContact(currentBroker._id, dataToSend);
            successMessage = `Corretor "${formData.nome}" atualizado!`;
        } else { // Add Mode: Enviar dados relevantes
            dataToSend = { ...formData };
             // Remove campos opcionais vazios antes de enviar
            Object.keys(dataToSend).forEach(key => {
                if(key !== 'nome' && (dataToSend[key] === '' || dataToSend[key] === null)) {
                    delete dataToSend[key];
                }
            });
            console.log("Enviando para Create:", dataToSend);
            operationPromise = createBrokerContact(dataToSend);
            successMessage = `Corretor "${formData.nome}" criado!`;
        }

        try {
            await operationPromise;
            toast.success(successMessage); fetchBrokers(); handleCloseModals(); // Fecha todos modais
        } catch (err) {
            const errorMsg = err.error || err.message || "Falha ao salvar contato.";
            setFormError(errorMsg); toast.error(errorMsg); console.error(err);
        } finally { setIsProcessingForm(false); }
    };

    // Delete Handlers (iguais aos outros admins)
    const handleOpenDeleteConfirm = (broker) => {
        setDeleteTargetBroker(broker); setDeleteErrorState(null); setIsDeleteConfirmOpen(true);
    };
    const handleConfirmDelete = async () => {
        if (!deleteTargetBroker) return; setIsDeleting(true); setDeleteErrorState(null);
        try {
            const result = await deleteBrokerContact(deleteTargetBroker._id);
            toast.success(result.message || "Contato excluído!");
            handleCloseModals(); fetchBrokers();
        } catch (err) {
             const errorMsg = err.error || err.message || "Falha ao excluir.";
             setDeleteErrorState(errorMsg); toast.error(errorMsg); console.error(err);
        } finally { setIsDeleting(false); }
    };
    // --- Fim Handlers ---


    // --- Renderização ---
    return (
        <div className="admin-page broker-admin-page">
            <h1>Agenda de Corretores</h1>
            <button onClick={handleOpenAddModal} className="button add-button" disabled={isFormModalOpen || isDeleteConfirmOpen}>
               + Adicionar Corretor
            </button>

            {isLoading && <p>Carregando corretores...</p>}
            {error && <p className="error-message">{error}</p>}

            {!isLoading && !error && (
                <div className="admin-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Contato</th>
                                <th>Email</th>
                                <th>CRECI</th>
                                <th>Imobiliária/Autônomo</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {brokers.map(broker => (
                                <tr key={broker._id}>
                                    <td>{broker.nome}</td>
                                    <td>{broker.contato || '-'}</td>
                                    <td>{broker.email || '-'}</td>
                                    <td>{broker.creci || '-'}</td>
                                    <td>{broker.nomeImobiliaria || 'Autônomo'}</td>
                                    <td>{broker.ativo ? 'Ativo' : 'Inativo'}</td>
                                    <td>
                                        <button onClick={() => handleOpenViewModal(broker)} className="button view-button-table" disabled={isFormModalOpen || isDeleteConfirmOpen}>Ver</button>
                                        <button onClick={() => handleOpenEditModal(broker)} className="button edit-button-table" disabled={isFormModalOpen || isDeleteConfirmOpen}>Editar</button>
                                        <button onClick={() => handleOpenDeleteConfirm(broker)} className="button delete-button-table" disabled={isFormModalOpen || isDeleteConfirmOpen}>Excluir</button>
                                    </td>
                                </tr>
                            ))}
                            {brokers.length === 0 && (
                                <tr><td colSpan="7">Nenhum corretor encontrado nesta empresa.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- Modal de Visualização --- */}
            {isViewModalOpen && currentBroker && (
                 <div className="form-modal-overlay" onClick={handleCloseModals}>
                     <div className="form-modal-content view-modal-content" onClick={(e) => e.stopPropagation()}>
                         <h2>Detalhes do Corretor</h2>
                         <div className="detail-grid view-grid">
                             <div className="detail-item"><span className="detail-label">Nome:</span><span className="detail-value">{currentBroker.nome}</span></div>
                             <div className="detail-item"><span className="detail-label">Contato:</span><span className="detail-value">{currentBroker.contato || '-'}</span></div>
                             <div className="detail-item"><span className="detail-label">Email:</span><span className="detail-value">{currentBroker.email || '-'}</span></div>
                             <div className="detail-item"><span className="detail-label">CRECI:</span><span className="detail-value">{currentBroker.creci || '-'}</span></div>
                             <div className="detail-item"><span className="detail-label">Imobiliária:</span><span className="detail-value">{currentBroker.nomeImobiliaria || 'Autônomo'}</span></div>
                             <div className="detail-item"><span className="detail-label">CPF/CNPJ:</span><span className="detail-value">{currentBroker.cpfCnpj || '-'}</span></div>
                             <div className="detail-item"><span className="detail-label">Status:</span><span className="detail-value">{currentBroker.ativo ? 'Ativo' : 'Inativo'}</span></div>
                             <div className="detail-item"><span className="detail-label">Cadastrado em:</span><span className="detail-value">{new Date(currentBroker.createdAt).toLocaleDateString('pt-BR')}</span></div>
                         </div>
                         <div className="form-actions">
                              <button type="button" className="button cancel-button" onClick={handleCloseModals}>Fechar</button>
                         </div>
                     </div>
                 </div>
            )}

            {/* --- Modal/Formulário para Adicionar/Editar Corretor --- */}
            {isFormModalOpen && (
                <div className="form-modal-overlay">
                    <div className="form-modal-content">
                        <h2>{currentBroker ? 'Editar Corretor' : 'Adicionar Novo Corretor'}</h2>
                        <form onSubmit={handleSaveBroker}>
                            {/* Nome */}
                            <div className="form-group">
                                <label htmlFor="brokerName">Nome *</label>
                                <input type="text" id="brokerName" name="nome" value={formData.nome} onChange={handleInputChange} required disabled={isProcessingForm} />
                            </div>
                            {/* Contato (PhoneInput) */}
                            <div className="form-group">
                                <label htmlFor="brokerContato">Contato</label>
                                <PhoneInput
                                    id="brokerContato" name="contato" placeholder="Digite o telefone"
                                    value={formData.contato} onChange={handlePhoneChange}
                                    defaultCountry="BR" international limitMaxLength
                                    className="form-control phone-input-control" // Classe para estilização extra se necessário
                                    disabled={isProcessingForm} />
                                {formData.contato && !isValidPhoneNumber(formData.contato) && <small className="input-error-message">Formato inválido</small>}
                            </div>
                            {/* Email */}
                            <div className="form-group">
                                <label htmlFor="brokerEmail">Email</label>
                                <input type="email" id="brokerEmail" name="email" value={formData.email} onChange={handleInputChange} disabled={isProcessingForm} />
                            </div>
                             {/* CRECI */}
                             <div className="form-group">
                                <label htmlFor="brokerCreci">CRECI</label>
                                <input type="text" id="brokerCreci" name="creci" value={formData.creci} onChange={handleInputChange} disabled={isProcessingForm} />
                            </div>
                             {/* Nome Imobiliária */}
                             <div className="form-group">
                                <label htmlFor="brokerNomeImobiliaria">Nome Imobiliária (ou deixe em branco se Autônomo)</label>
                                <input type="text" id="brokerNomeImobiliaria" name="nomeImobiliaria" value={formData.nomeImobiliaria} onChange={handleInputChange} disabled={isProcessingForm} />
                            </div>
                            {/* CPF/CNPJ */}
                             <div className="form-group">
                                <label htmlFor="brokerCpfCnpj">CPF/CNPJ</label>
                                <input type="text" id="brokerCpfCnpj" name="cpfCnpj" value={formData.cpfCnpj} onChange={handleInputChange} placeholder="Apenas números" disabled={isProcessingForm} />
                            </div>
                            {/* Status Ativo */}
                             <div className="form-group form-group-checkbox">
                                 <input type="checkbox" id="brokerAtivo" name="ativo" checked={formData.ativo} onChange={handleInputChange} disabled={isProcessingForm} />
                                <label htmlFor="brokerAtivo">Contato Ativo</label>
                            </div>

                            {formError && <p className="error-message modal-error">{formError}</p>}
                            <div className="form-actions">
                                <button type="submit" className="button submit-button" disabled={isProcessingForm}>
                                    {isProcessingForm ? 'Salvando...' : (currentBroker ? 'Salvar Alterações' : 'Adicionar Corretor')}
                                </button>
                                <button type="button" className="button cancel-button" onClick={handleCloseModals} disabled={isProcessingForm}>
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
             <ConfirmModal
                isOpen={isDeleteConfirmOpen}
                onClose={handleCloseModals} // Reusa o close geral
                onConfirm={handleConfirmDelete}
                title="Confirmar Exclusão"
                message={`Tem certeza que deseja excluir o contato "${deleteTargetBroker?.nome || ''}"?`}
                confirmText="Excluir Contato" cancelText="Cancelar"
                confirmButtonClass="confirm-button-delete"
                isProcessing={isDeleting} errorMessage={deleteErrorState}
             />
        </div>
    );
}

export default BrokerContactsAdminPage;