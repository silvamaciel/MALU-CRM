// src/components/LeadTagsModal/LeadTagsModal.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { updateLead } from '../../api/leads'; // Importa a API de update
import './LeadTagsModal.css'; // Criaremos este CSS

function LeadTagsModal({ isOpen, onClose, lead, onTagsSaved }) {
    const [tags, setTags] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Quando o modal abre, carrega as tags atuais do lead
        if (isOpen && lead?.tags) {
            setTags([...lead.tags]); // Cria uma cópia para edição local
        } else if (isOpen) {
            setTags([]);
        }
    }, [isOpen, lead]);

    // Handler para adicionar uma tag (ao pressionar Enter ou vírgula)
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault(); // Previne submissão do formulário ou inserção de vírgula
            const newTag = inputValue.trim().toLowerCase();
            if (newTag && !tags.includes(newTag)) {
                setTags([...tags, newTag]);
            }
            setInputValue(''); // Limpa o input
        }
    };

    // Handler para remover uma tag
    const handleRemoveTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    // Handler para salvar as tags
    const handleSave = async () => {
    if (!lead || !lead._id) {
        toast.error("ID do Lead inválido.");
        return;
    }
    setIsSaving(true);
    try {
        await updateLead(lead._id, { tags: tags });
        toast.success("Tags atualizadas com sucesso!");
        onTagsSaved();
        onClose();
    } catch (error) {
        console.error("Erro no handleSave:", error);

        // Se o erro vier de uma resposta HTTP da API (ex: axios)
        if (error.response) {
            // Exemplo: error.response.data.message ou outro campo
            const apiMessage = error.response.data?.message || "Erro na resposta da API.";
            toast.error(apiMessage);
        } 
        // Se for erro de requisição (ex: rede)
        else if (error.request) {
            toast.error("Erro de comunicação com o servidor. Verifique sua conexão.");
        } 
        // Outros erros (ex: sintaxe, lógica)
        else {
            toast.error(error.message || "Erro inesperado ao salvar tags.");
        }
    } finally {
        setIsSaving(false);
    }
};

    if (!isOpen) {
        return null; // Não renderiza nada se o modal não estiver aberto
    }

    return (
        <div className="form-modal-overlay" onClick={onClose}>
            <div className="form-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <h2>Gerenciar Tags para: {lead?.nome || 'Lead'}</h2>

                <div className="form-group">
                    <label htmlFor="tag-input">Adicionar Tags</label>
                    <p><small>Digite uma tag e pressione Enter ou vírgula para adicionar.</small></p>
                    <input
                        type="text"
                        id="tag-input"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ex: investidor, zona sul..."
                        disabled={isSaving}
                    />
                </div>

                <div className="tags-display-container">
                    {tags.length > 0 ? (
                        tags.map((tag, index) => (
                            <div key={index} className="tag-item">
                                {tag}
                                <button onClick={() => handleRemoveTag(tag)} disabled={isSaving}>
                                    &times; {/* Símbolo de 'x' para remover */}
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="no-tags-message">Nenhuma tag adicionada.</p>
                    )}
                </div>

                <div className="form-actions">
                    <button type="button" className="button cancel-button" onClick={onClose} disabled={isSaving}>
                        Cancelar
                    </button>
                    <button type="button" className="button submit-button" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Salvando...' : 'Salvar Tags'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LeadTagsModal;