import React, { useState } from 'react';
import './KanbanFilters.css';

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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleApplyFilters = (e) => {
        e.preventDefault();
        const activeFilters = {};
        for (const key in filters) {
            if (filters[key]) { // Envia apenas filtros com valor
                activeFilters[key] = filters[key];
            }
        }
        if (typeof onFilterChange === 'function') {
            onFilterChange(activeFilters);
        }
    };

    const handleClearFilters = () => {
        setFilters(initialState);
        if (typeof onFilterChange === 'function') {
            onFilterChange({});
        }
    };

    return (
        <div className="kanban-filters-container">
            <form onSubmit={handleApplyFilters} className="kanban-filters-form">
                <div className="filter-group text-search">
                    <input
                        type="text"
                        name="termoBusca"
                        value={filters.termoBusca}
                        onChange={handleChange}
                        placeholder="Buscar por Nome, Email ou CPF..."
                        disabled={isProcessing}
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
                    />
                </div>
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
                <div className="filter-group date-range">
                    <label>Criado de:</label>
                    <input type="date" name="dataInicio" value={filters.dataInicio} onChange={handleChange} disabled={isProcessing} max={filters.dataFim || undefined}/>
                    <label>até:</label>
                    <input type="date" name="dataFim" value={filters.dataFim} onChange={handleChange} disabled={isProcessing} min={filters.dataInicio || undefined}/>
                </div>
                <div className="filter-actions">
                    <button type="submit" className="button primary-button small-button" disabled={isProcessing}>
                        {isProcessing ? 'Buscando...' : 'Filtrar'}
                    </button>
                    <button type="button" onClick={handleClearFilters} className="button-link" disabled={isProcessing}>
                        Limpar Filtros
                    </button>
                </div>
            </form>
        </div>
    );
}

export default KanbanFilters;