// src/components/KanbanFilters/KanbanFilters.js
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
        setFilters(prevFilters => ({
            ...prevFilters,
            [name]: value
        }));
    };

    const handleApplyFilters = (e) => {
        e.preventDefault(); // Previne o recarregamento da página pelo form
        // Limpa filtros vazios antes de enviar para o componente pai
        const activeFilters = {};
        for (const key in filters) {
            if (filters[key] !== '' && filters[key] !== null && filters[key] !== undefined) {
                activeFilters[key] = filters[key];
            }
        }
        if (typeof onFilterChange === 'function') {
            console.log("KanbanFilters: Aplicando filtros:", activeFilters);
            onFilterChange(activeFilters);
        }
    };

    const handleClearFilters = () => {
        setFilters(initialState);
        if (typeof onFilterChange === 'function') {
            onFilterChange({}); // Notifica o pai para limpar os filtros
        }
    };

    return (
        <div className="kanban-filters-container">
            <form onSubmit={handleApplyFilters} className="kanban-filters-form">
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
                    <input type="date" name="dataInicio" value={filters.dataInicio} onChange={handleChange} disabled={isProcessing} max={filters.dataFim || undefined}/>
                    <span>até</span>
                    <input type="date" name="dataFim" value={filters.dataFim} onChange={handleChange} disabled={isProcessing} min={filters.dataInicio || undefined}/>
                </div>
                <div className="filter-group actions-group">
                    <button type="submit" className="button primary-button small-button" disabled={isProcessing}>
                        {isProcessing ? 'Buscando...' : 'Filtrar'}
                    </button>
                    <button type="button" onClick={handleClearFilters} className="button-link" disabled={isProcessing}>
                        Limpar
                    </button>
                </div>
            </form>
        </div>
    );
}

export default KanbanFilters;