// src/components/LeadTagsManager/LeadTagsManager.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { updateLead } from '../../api/leads'; // Ajuste o caminho se necessário
import './LeadTagsManager.css'; // Criaremos este CSS a seguir

function LeadTagsManager({ leadId, currentTags = [], onTagsUpdated }) {
    // Estado interno para as tags que estão sendo editadas
    const [tags, setTags] = useState([]);
    // Estado para o valor do input onde o usuário digita a nova tag
    const [inputValue, setInputValue] = useState('');
    // Estado para o loading do botão de salvar
    const [isSaving, setIsSaving] = useState(false);

    // Efeito para sincronizar as tags internas com as que vêm do lead (prop)
    useEffect(() => {
        // Garante que é um array e cria uma cópia para evitar mutação direta da prop
        setTags(Array.isArray(currentTags) ? [...currentTags] : []);
    }, [currentTags]);

    // Handler para adicionar uma tag (ao pressionar Enter ou vírgula)
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault(); // Previne o comportamento padrão (ex: submeter um formulário)
            const newTag = inputValue.trim().toLowerCase();

            // Adiciona a tag apenas se ela não for vazia e ainda não existir na lista
            if (newTag && !tags.includes(newTag)) {
                setTags([...tags, newTag]);
            }
            setInputValue(''); // Limpa o input após adicionar
        }
    };

    // Handler para remover uma tag ao clicar no 'x'
    const handleRemoveTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    // Handler para salvar as tags no backend
    const handleSave = async () => {
        if (!leadId) {
            toast.error("ID do Lead inválido.");
            return;
        }
        setIsSaving(true);
        try {
            // A API updateLead recebe o ID do lead e um objeto com os campos a serem atualizados
            await updateLead(leadId, { tags: tags });
            toast.success("Tags do lead atualizadas com sucesso!");

            // Chama a função de callback passada pelo componente pai para atualizar a página principal
            if (onTagsUpdated) {
                onTagsUpdated();
            }
        } catch (error) {
            toast.error(error.message || "Falha ao salvar as tags.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="tags-manager-container">
            <h3>Tags</h3>
            <div className="form-group">
                <label htmlFor="tag-input">Adicionar Tags</label>
                <p><small>Digite uma tag e pressione Enter ou vírgula para adicionar à lista.</small></p>
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
                            <span>{tag}</span>
                            <button onClick={() => handleRemoveTag(tag)} disabled={isSaving} title={`Remover tag ${tag}`}>
                                &times;
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="no-tags-message">Nenhuma tag adicionada a este lead.</p>
                )}
            </div>

            <div className="tags-manager-actions">
                <button type="button" className="button submit-button" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Salvar Tags'}
                </button>
            </div>
        </div>
    );
}

export default LeadTagsManager;