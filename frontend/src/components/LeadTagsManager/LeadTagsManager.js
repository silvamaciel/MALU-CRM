import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { updateLead } from '../../api/leads'; // ajuste o caminho se necessário
import './LeadTagsManager.css';

/** Gera um H (0..359) estável por string para colorir cada tag */
const hashHue = (str) => {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

function LeadTagsManager({ leadId, currentTags = [], onTagsUpdated }) {
  const [tags, setTags] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTags(Array.isArray(currentTags) ? [...currentTags] : []);
  }, [currentTags]);

  /** Normaliza a tag (opcional, mas ajuda a evitar duplicados estranhos) */
  const normalize = (s) =>
    String(s || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim().toLowerCase().replace(/\s+/g, ' ');

  // Enter ou vírgula adicionam a tag (suporta múltiplas separadas por vírgula)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const raw = inputValue.replace(/,+$/,''); // remove vírgulas finais
      const newOnes = raw.split(',').map(normalize).filter(Boolean);
      if (!newOnes.length) return;

      setTags((prev) => {
        const set = new Set(prev.map(normalize));
        newOnes.forEach((t) => set.add(t));
        return Array.from(set);
      });
      setInputValue('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleSave = async () => {
    if (!leadId) {
      toast.error('ID do Lead inválido.');
      return;
    }
    setIsSaving(true);
    try {
      await updateLead(leadId, { tags });
      toast.success('Tags do lead atualizadas com sucesso!');
      onTagsUpdated && onTagsUpdated();
    } catch (error) {
      toast.error(error?.message || 'Falha ao salvar as tags.');
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

        {/* wrapper para borda em degradê no foco */}
        <div className="input-wrap">
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
      </div>

      <div className="tags-display-container">
        {tags.length > 0 ? (
          tags.map((tag, index) => (
            <div
              key={index}
              className="tag-item"
              style={{ '--h': hashHue(tag) }}
              title={tag}
            >
              <span>{tag}</span>
              <button
                onClick={() => handleRemoveTag(tag)}
                disabled={isSaving}
                title={`Remover tag ${tag}`}
              >
                &times;
              </button>
            </div>
          ))
        ) : (
          <p className="no-tags-message">Nenhuma tag adicionada a este lead.</p>
        )}
      </div>

      <div className="tags-manager-actions">
        <button
          type="button"
          className="button submit-button"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Salvando...' : 'Salvar Tags'}
        </button>
      </div>
    </div>
  );
}

export default LeadTagsManager;
