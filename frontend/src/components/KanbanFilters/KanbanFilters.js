import React, { useState, useEffect, useCallback } from 'react';
import './KanbanFilters.css'; // Mantenha ou ajuste seu CSS

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
        termoBusca: '', // Para Nome, Email ou CPF
        tags: '',       // Para tags separadas por vírgula
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters(prevFilters => ({
            ...prevFilters,
            [name]: value
        }));
    };

    const handleClearFilters = () => {
        setFilters(initialState);
        // onFilterChange será chamado pelo useEffect acima quando debouncedFilters atualizar
    };

    return (
        <div className="kanban-filters-container">
            <form className="kanban-filters-form">
                {/* Inputs de Texto Unificados */}
                <div className="filter-group text-search">
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
                <div className="filter-group">
                    <input
                        type="text"
                        name="tags"
                        value={filters.tags}
                        onChange={handleChange}
                        placeholder="Tags (ex: vip, investidor)"
                        disabled={isProcessing}
                        className="filter-input"
                    />
                </div>

                {/* Dropdowns */}
                <div className="filter-group">
                    <select name="origem" value={filters.origem} onChange={handleChange} disabled={isProcessing}>
                        <option value="">Todas as Origens</option>
                        {origensList.map(o => <option key={o._id} value={o._id}>{o.nome}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <select name="responsavel" value={filters.responsavel} onChange={handleChange} disabled={isProcessing}>
                        <option value="">Todos os Responsáveis</option>
                        {usuariosList.map(u => <option key={u._id} value={u._id}>{u.nome}</option>)}
                    </select>
                </div>

                {/* Datas */}
                <div className="filter-group date-range">
                    <input type="date" name="dataInicio" value={filters.dataInicio} onChange={handleChange} disabled={isProcessing} max={filters.dataFim || undefined}/>
                    <span>a</span>
                    <input type="date" name="dataFim" value={filters.dataFim} onChange={handleChange} disabled={isProcessing} min={filters.dataInicio || undefined}/>
                </div>

                {/* Ações */}
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