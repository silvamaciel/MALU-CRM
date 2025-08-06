// src/components/CreateTaskModal/CreateTaskModal.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { createTaskApi } from '../../api/taskApi';
import { getLeads, getLeadById } from '../../api/leads';
import './styleCreateTaskModal.css';

const CreateTaskModal = ({
    isOpen,
    onClose,
    onSaveSuccess,
    currentLeadId = null,    // se vier, estamos na página de um lead
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [leadOptions, setLeadOptions] = useState([]);
    const [selectedLead, setSelectedLead] = useState(currentLeadId || '');
    const [leadName, setLeadName] = useState('');       // só pra exibir nome quando veio currentLeadId
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingLeads, setLoadingLeads] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        if (currentLeadId) {
            // pega o nome do lead atual
            getLeadById(currentLeadId)
                .then(res => setLeadName(res.nome || res.data.nome || ''))
                .catch(() => setLeadName(''));
        } else {
            // busca lista de leads
            setLoadingLeads(true);
            getLeads()
                .then(res => {
                    setLeadOptions(res.leads || []);
                })
                .catch(() => toast.error('Erro ao carregar leads.'))
                .finally(() => setLoadingLeads(false));
        }
    }, [isOpen, currentLeadId]);

    const handleSubmit = async e => {
        e.preventDefault();
        if (!title || !dueDate || !selectedLead) {
            toast.error('Título, data e lead são obrigatórios.');
            return;
        }
        setIsSubmitting(true);
        try {
            await createTaskApi({
                title,
                description,
                dueDate,
                assignedTo,
                lead: selectedLead,
            });
            toast.success('Tarefa criada com sucesso!');
            onSaveSuccess();
            // limpar
            setTitle('');
            setDescription('');
            setDueDate('');
            setAssignedTo('');
            if (!currentLeadId) setSelectedLead('');
        } catch {
            toast.error('Erro ao criar tarefa.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="create-task-modal-overlay">
            <div className="create-task-modal">
                <h2>Criar Nova Tarefa</h2>
                <form onSubmit={handleSubmit} className="create-task-form">
                    <label>
                        Título
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                        />
                    </label>

                    <label>
                        Descrição
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </label>

                    <label>
                        Vence em
                        <input
                            type="datetime-local"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            required
                        />
                    </label>

                    <label>
                        Lead
                        {currentLeadId ? (
                            <input
                                type="text"
                                value={leadName}
                                readOnly
                            />
                        ) : loadingLeads ? (
                            <p>Carregando leads...</p>
                        ) : (
                            <select
                                value={selectedLead}
                                onChange={e => setSelectedLead(e.target.value)}
                                required
                            >
                                <option value="">Selecione um lead</option>
                                {leadOptions.map(lead => (
                                    <option key={lead._id} value={lead._id}>
                                        {lead.nome}
                                    </option>
                                ))}
                            </select>
                        )}
                    </label>

                    <label>
                        Responsável
                        <input
                            type="text"
                            value={assignedTo}
                            onChange={e => setAssignedTo(e.target.value)}
                            placeholder="Nome do responsável"
                        />
                    </label>

                    <div className="modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                        <button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Salvando...' : 'Criar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTaskModal;
