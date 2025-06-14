// src/components/KanbanFilters/KanbanFilters.js
import React, { useState, useEffect } from 'react';
import './LeadFilters.css'; // Mantenha ou ajuste seu CSS

// Hook customizado para debounce (atraso na execução de uma função)
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

function KanbanFilters({
    origensList = [],
    usuariosList = [],
    onFilterChange,
    isProcessing
}) {
  const initialState = {
    termoBusca: '',
    tags: '',
    origem: '',
    responsavel: '',
    dataInicio: '',
    dataFim: ''
  };
  const [filters, setFilters] = useState(initialState);
  
  // Aplica debounce nos filtros. A API só será chamada 500ms após o usuário parar de digitar.
  const debouncedFilters = useDebounce(filters, 500);

  // Efeito que chama onFilterChange quando os filtros (debounced) mudam
  useEffect(() => {
    if (typeof onFilterChange === 'function') {
        const activeFilters = {};
        // Limpa chaves vazias antes de enviar
        for (const key in debouncedFilters) {
            if (debouncedFilters[key] !== '' && debouncedFilters[key] !== null) {
                activeFilters[key] = debouncedFilters[key];
            }
        }
        onFilterChange(activeFilters);
    }
  }, [debouncedFilters, onFilterChange]); // Depende dos filtros com debounce

  // Handler genérico para mudanças nos inputs/selects
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value
    }));
  };

  // Handler para limpar todos os filtros
  const handleClearFilters = () => {
    setFilters(initialState);
    // onFilterChange será chamado pelo useEffect acima quando debouncedFilters atualizar para o estado inicial
  };

  return (
    <div className="lead-filters-container">
      <form className="lead-filters-form">
        <div className="filter-group wide-group">
            <input
                type="text"
                name="termoBusca"
                value={filters.termoBusca}
                onChange={handleChange}
                placeholder="Buscar por Nome, Email ou CPF..."
                disabled={isProcessing}
                className="filter-input"
            />
        </div>
        <div className="filter-group wide-group">
            <input
                type="text"
                name="tags"
                value={filters.tags}
                onChange={handleChange}
                placeholder="Filtrar por tags (ex: vip, investidor)"
                disabled={isProcessing}
                className="filter-input"
            />
        </div>
        <div className="filter-group">
            <label htmlFor="filter-origem">Origem</label>
            <select id="filter-origem" name="origem" value={filters.origem} onChange={handleChange} disabled={isProcessing}>
                <option value="">Todas</option>
                {origensList.map(o => <option key={o._id} value={o._id}>{o.nome}</option>)}
            </select>
        </div>
        <div className="filter-group">
            <label htmlFor="filter-responsavel">Responsável</label>
            <select id="filter-responsavel" name="responsavel" value={filters.responsavel} onChange={handleChange} disabled={isProcessing}>
                <option value="">Todos</option>
                {usuariosList.map(u => <option key={u._id} value={u._id}>{u.nome}</option>)}
            </select>
        </div>
        <div className="filter-group date-range">
            <label>Criado entre:</label>
            <input
                type="date"
                name="dataInicio"
                value={filters.dataInicio}
                onChange={handleChange}
                disabled={isProcessing}
                max={filters.dataFim || undefined}
            />
            <span>até</span>
            <input
                type="date"
                name="dataFim"
                value={filters.dataFim}
                onChange={handleChange}
                disabled={isProcessing}
                min={filters.dataInicio || undefined}
            />
        </div>
        <div className="filter-group actions-group">
            <button type="button" onClick={handleClearFilters} className="button-link" disabled={isProcessing}>
                Limpar Filtros
            </button>
        </div>
      </form>
    </div>
  );
}
export default KanbanFilters;