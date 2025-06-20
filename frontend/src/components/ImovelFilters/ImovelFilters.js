import React, { useState } from 'react';
import './ImovelFilters.css';

const TIPO_IMOVEL_OPCOES = ['Apartamento', 'Casa', 'Terreno', 'Sala Comercial', 'Loja', 'Galpão', 'Outro'];
const STATUS_IMOVEL_OPCOES = ['Disponível', 'Reservado', 'Vendido', 'Inativo'];

function ImovelFilters({ onFilterChange, isProcessing }) {
    const initialState = {
        cidade: '',
        bairro: '',
        tipoImovel: '',
        quartos: '',
        status: ''
    };
    const [filters, setFilters] = useState(initialState);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // Função chamada quando o formulário é submetido (clique no botão "Filtrar")
    const handleApplyFilters = (e) => {
        e.preventDefault(); // Previne o recarregamento da página
        const activeFilters = {};
        // Limpa chaves vazias antes de enviar
        for (const key in filters) {
            if (filters[key]) {
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
            onFilterChange({}); // Notifica o pai para limpar os filtros
        }
    };

    return (
        <div className="imovel-filters-container">
            <form onSubmit={handleApplyFilters} className="imovel-filters-form">
                <div className="filter-group">
                    <label>Cidade</label>
                    <input type="text" name="cidade" value={filters.cidade} onChange={handleChange} placeholder="Ex: João Pessoa" disabled={isProcessing} />
                </div>
                <div className="filter-group">
                    <label>Bairro</label>
                    <input type="text" name="bairro" value={filters.bairro} onChange={handleChange} placeholder="Ex: Bessa" disabled={isProcessing} />
                </div>
                <div className="filter-group">
                    <label>Tipo de Imóvel</label>
                    <select name="tipoImovel" value={filters.tipoImovel} onChange={handleChange} disabled={isProcessing}>
                        <option value="">Todos</option>
                        {TIPO_IMOVEL_OPCOES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Nº de Quartos (mín.)</label>
                    <input type="number" name="quartos" value={filters.quartos} onChange={handleChange} min="0" placeholder="Ex: 3" disabled={isProcessing} />
                </div>
                <div className="filter-group">
                    <label>Status</label>
                    <select name="status" value={filters.status} onChange={handleChange} disabled={isProcessing}>
                        <option value="">Todos</option>
                        {STATUS_IMOVEL_OPCOES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
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

export default ImovelFilters;