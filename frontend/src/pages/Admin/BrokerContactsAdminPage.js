// src/pages/Admin/BrokerContactsAdminPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';

// APIs existentes
import {
  getBrokerContacts,
  createBrokerContact,
  updateBrokerContact,
  deleteBrokerContact
} from '../../api/brokerContacts';

// APIs novas (Solicitações)
import {
  getLeadRequests,
  approveLeadRequest,
  rejectLeadRequest
} from '../../api/leadRequests';

// UI
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

// CSS compartilhado
import './AdminPages.css';

// ---------------------------------------------
// Helpers & Constantes
// ---------------------------------------------
const initialBrokerForm = {
  nome: '', contato: '', email: '', creci: '', nomeImobiliaria: '', cpfCnpj: '', ativo: true
};

const StatusTag = ({ value }) => (
  <span className={`status-tag status-${String(value || '').toLowerCase()}`}>{value}</span>
);

// ---------------------------------------------
// Subcomponentes: Brokers (lista + modais)
// ---------------------------------------------
function BrokersSection() {
  const [brokers, setBrokers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modais
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [currentBroker, setCurrentBroker] = useState(null);
  const [deleteTargetBroker, setDeleteTargetBroker] = useState(null);

  // Form state
  const [formData, setFormData] = useState(initialBrokerForm);
  const [initialDataForEdit, setInitialDataForEdit] = useState(null);
  const [isProcessingForm, setIsProcessingForm] = useState(false);
  const [formError, setFormError] = useState(null);

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorState, setDeleteErrorState] = useState(null);

  const fetchBrokers = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const data = await getBrokerContacts();
      setBrokers(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMsg = err.message || "Falha ao carregar agenda de corretores.";
      setError(errorMsg); toast.error(errorMsg); setBrokers([]);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchBrokers(); }, [fetchBrokers]);

  // Handlers form
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  const handlePhoneChange = useCallback((value) => {
    setFormData(prev => ({ ...prev, contato: value || '' }));
  }, []);

  const handleOpenAddModal = () => {
    setCurrentBroker(null); setInitialDataForEdit(null);
    setFormData(initialBrokerForm);
    setFormError(null);
    setIsFormModalOpen(true);
  };
  const handleOpenEditModal = (broker) => {
    setCurrentBroker(broker);
    const base = {
      nome: broker.nome || '',
      contato: broker.contato || '',
      email: broker.email || '',
      creci: broker.creci || '',
      nomeImobiliaria: broker.nomeImobiliaria || '',
      cpfCnpj: broker.cpfCnpj || '',
      ativo: broker.ativo === undefined ? true : broker.ativo
    };
    setFormData(base);
    setInitialDataForEdit(base);
    setFormError(null);
    setIsFormModalOpen(true);
  };
  const handleOpenViewModal = (broker) => {
    setCurrentBroker(broker);
    setIsViewModalOpen(true);
  };
  const handleOpenDeleteConfirm = (broker) => {
    setDeleteTargetBroker(broker);
    setDeleteErrorState(null);
    setIsDeleteConfirmOpen(true);
  };
  const handleCloseModals = () => {
    setIsFormModalOpen(false); setIsDeleteConfirmOpen(false); setIsViewModalOpen(false);
    setCurrentBroker(null); setInitialDataForEdit(null); setDeleteTargetBroker(null);
    setFormError(null); setDeleteErrorState(null);
    setIsProcessingForm(false); setIsDeleting(false);
    setFormData(initialBrokerForm);
  };

  const handleSaveBroker = async (event) => {
    event.preventDefault(); setFormError(null); setIsProcessingForm(true);

    if (!formData.nome) { setFormError("O nome é obrigatório."); setIsProcessingForm(false); return; }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) { setFormError('Formato de email inválido.'); setIsProcessingForm(false); return; }
    if (formData.contato && !isValidPhoneNumber(formData.contato)) { setFormError('Formato de telefone inválido.'); setIsProcessingForm(false); return; }

    let operationPromise, successMessage;

    if (currentBroker && currentBroker._id) {
      const changed = {};
      Object.keys(formData).forEach(k => {
        const curr = formData[k] ?? '';
        const init = initialDataForEdit[k] ?? '';
        if (curr !== init) changed[k] = curr === '' ? null : curr;
      });
      if (Object.keys(changed).length === 0) {
        toast.info("Nenhuma alteração detectada."); setIsProcessingForm(false); return;
      }
      operationPromise = updateBrokerContact(currentBroker._id, changed);
      successMessage = `Corretor "${formData.nome}" atualizado!`;
    } else {
      const payload = { ...formData };
      Object.keys(payload).forEach(k => {
        if (k !== 'nome' && (payload[k] === '' || payload[k] === null)) delete payload[k];
      });
      operationPromise = createBrokerContact(payload);
      successMessage = `Corretor "${formData.nome}" criado!`;
    }

    try {
      await operationPromise;
      toast.success(successMessage);
      await fetchBrokers();
      handleCloseModals();
    } catch (err) {
      const errorMsg = err.error || err.message || "Falha ao salvar contato.";
      setFormError(errorMsg); toast.error(errorMsg); console.error(err);
    } finally { setIsProcessingForm(false); }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetBroker) return;
    setIsDeleting(true); setDeleteErrorState(null);
    try {
      const result = await deleteBrokerContact(deleteTargetBroker._id);
      toast.success(result?.message || "Contato excluído!");
      handleCloseModals(); await fetchBrokers();
    } catch (err) {
      const msg = err.error || err.message || "Falha ao excluir.";
      setDeleteErrorState(msg); toast.error(msg); console.error(err);
    } finally { setIsDeleting(false); }
  };

  return (
    <section>
      <div className="section-header">
        <h2>Agenda de Corretores</h2>
        <div className="section-actions">
          <button onClick={fetchBrokers} className="button">Atualizar</button>
          <button onClick={handleOpenAddModal} className="button add-button">+ Adicionar Corretor</button>
        </div>
      </div>

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
                <th style={{textAlign:'right'}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {brokers.map(b => (
                <tr key={b._id}>
                  <td>{b.nome}</td>
                  <td>{b.contato || '-'}</td>
                  <td>{b.email || '-'}</td>
                  <td>{b.creci || '-'}</td>
                  <td>{b.nomeImobiliaria || 'Autônomo'}</td>
                  <td>{b.ativo ? 'Ativo' : 'Inativo'}</td>
                  <td style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
                    <button onClick={() => handleOpenViewModal(b)} className="button view-button-table">Ver</button>
                    <button onClick={() => handleOpenEditModal(b)} className="button edit-button-table">Editar</button>
                    <button onClick={() => handleOpenDeleteConfirm(b)} className="button delete-button-table">Excluir</button>
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

      {/* View Modal */}
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

      {/* Form Modal */}
      {isFormModalOpen && (
        <div className="form-modal-overlay">
          <div className="form-modal-content">
            <h2>{currentBroker ? 'Editar Corretor' : 'Adicionar Novo Corretor'}</h2>
            <form onSubmit={handleSaveBroker}>
              <div className="form-group">
                <label htmlFor="brokerName">Nome *</label>
                <input id="brokerName" name="nome" value={formData.nome} onChange={handleInputChange} required disabled={isProcessingForm} />
              </div>

              <div className="form-group">
                <label htmlFor="brokerContato">Contato</label>
                <PhoneInput
                  id="brokerContato" name="contato" placeholder="Digite o telefone"
                  value={formData.contato} onChange={handlePhoneChange}
                  defaultCountry="BR" international limitMaxLength
                  className="form-control phone-input-control"
                  disabled={isProcessingForm}
                />
                {formData.contato && !isValidPhoneNumber(formData.contato) && <small className="input-error-message">Formato inválido</small>}
              </div>

              <div className="form-group">
                <label htmlFor="brokerEmail">Email</label>
                <input type="email" id="brokerEmail" name="email" value={formData.email} onChange={handleInputChange} disabled={isProcessingForm} />
              </div>

              <div className="form-group">
                <label htmlFor="brokerCreci">CRECI</label>
                <input id="brokerCreci" name="creci" value={formData.creci} onChange={handleInputChange} disabled={isProcessingForm} />
              </div>

              <div className="form-group">
                <label htmlFor="brokerNomeImobiliaria">Nome Imobiliária (ou vazio se Autônomo)</label>
                <input id="brokerNomeImobiliaria" name="nomeImobiliaria" value={formData.nomeImobiliaria} onChange={handleInputChange} disabled={isProcessingForm} />
              </div>

              <div className="form-group">
                <label htmlFor="brokerCpfCnpj">CPF/CNPJ</label>
                <input id="brokerCpfCnpj" name="cpfCnpj" value={formData.cpfCnpj} onChange={handleInputChange} placeholder="Apenas números" disabled={isProcessingForm} />
              </div>

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

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={handleCloseModals}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o contato "${deleteTargetBroker?.nome || ''}"?`}
        confirmText="Excluir Contato" cancelText="Cancelar"
        confirmButtonClass="confirm-button-delete"
        isProcessing={isDeleting} errorMessage={deleteErrorState}
      />
    </section>
  );
}

// ---------------------------------------------
// Subcomponentes: Hub de Solicitações
// ---------------------------------------------
function RequestsSection() {
  const [requests, setRequests] = useState([]);
  const [isLoadingReq, setIsLoadingReq] = useState(false);
  const [reqError, setReqError] = useState(null);

  const [filterStatus, setFilterStatus] = useState('Pendente'); // Pendente | Aprovado | Rejeitado
  const [isActioning, setIsActioning] = useState(false);

  const fetchRequests = useCallback(async () => {
    setIsLoadingReq(true); setReqError(null);
    try {
      const rows = await getLeadRequests(filterStatus); // backend filtra por status
      setRequests(Array.isArray(rows) ? rows : []);
    } catch (err) {
      const msg = err.message || 'Falha ao carregar solicitações.';
      setReqError(msg); toast.error(msg);
    } finally { setIsLoadingReq(false); }
  }, [filterStatus]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const total = useMemo(() => requests.length, [requests]);

  const handleApprove = async (row) => {
    setIsActioning(true);
    try {
      await approveLeadRequest(row._id);
      toast.success('Solicitação aprovada e Lead criado.');
      fetchRequests();
    } catch (e) {
      toast.error(e.error || 'Falha ao aprovar.');
    } finally { setIsActioning(false); }
  };
  const handleReject = async (row) => {
    const reason = window.prompt('Motivo do rejeite (opcional):') || null;
    setIsActioning(true);
    try {
      await rejectLeadRequest(row._id, reason);
      toast.success('Solicitação rejeitada.');
      fetchRequests();
    } catch (e) {
      toast.error(e.error || 'Falha ao rejeitar.');
    } finally { setIsActioning(false); }
  };

  return (
    <section>
      <div className="section-header">
        <h2>Solicitações de Leads</h2>
        <div className="section-actions">
          <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)} className="select">
            <option value="Pendente">Pendente</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Rejeitado">Rejeitado</option>
          </select>
          <button onClick={fetchRequests} className="button">Atualizar</button>
          <span className="badge">{total}</span>
        </div>
      </div>

      {isLoadingReq && <p>Carregando solicitações...</p>}
      {reqError && <p className="error-message">{reqError}</p>}

      {!isLoadingReq && !reqError && (
        <div className="admin-table-container">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contato</th>
                <th>Email</th>
                <th>Comentário</th>
                <th>Corretor Responsável</th>
                <th>Status</th>
                <th>Criado em</th>
                <th style={{textAlign:'right'}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r._id}>
                  <td>{r.nome}</td>
                  <td>{r.contato}</td>
                  <td>{r.email || '-'}</td>
                  <td>{r.comentario || '-'}</td>
                  <td>{r.corretorResponsavel?.nome || '-'}</td>
                  <td><StatusTag value={r.status} /></td>
                  <td>{new Date(r.createdAt).toLocaleString('pt-BR')}</td>
                  <td style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
                    {r.status === 'Pendente' ? (
                      <>
                        <button className="button" onClick={()=>handleApprove(r)} disabled={isActioning}>Aprovar</button>
                        <button className="button delete-button-table" onClick={()=>handleReject(r)} disabled={isActioning}>Rejeitar</button>
                      </>
                    ) : (
                      <em>-</em>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan="8">Nenhuma solicitação para o filtro selecionado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------
// Página principal (tabs)
// ---------------------------------------------
export default function BrokerContactsAdminPage() {
  const [tab, setTab] = useState('requests'); // default na fila para foco operacional

  return (
    <div className="admin-page broker-admin-page">
      <h1>Portal do Corretor • Admin</h1>

      <div className="admin-tabs" style={{display:'flex', gap:8, marginBottom:12}}>
        <button className={`button ${tab==='requests' ? 'primary' : ''}`} onClick={()=>setTab('requests')}>
          Solicitações de Leads
        </button>
        <button className={`button ${tab==='brokers' ? 'primary' : ''}`} onClick={()=>setTab('brokers')}>
          Corretores
        </button>
      </div>

      {tab === 'requests' ? <RequestsSection /> : <BrokersSection />}
    </div>
  );
}
