// src/components/ImovelFilters/ImovelFilters.js
import React, { useState, useEffect } from 'react';
import './ImovelFilters.css'; // Criaremos este CSS a seguir

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
    const debouncedFilters = useDebounce(filters, 500); // Filtra 500ms após o usuário parar de digitar

    useEffect(() => {
        const activeFilters = {};
        for (const key in debouncedFilters) {
            if (debouncedFilters[key]) {
                activeFilters[key] = debouncedFilters[key];
            }
        }
        onFilterChange(activeFilters);
    }, [debouncedFilters, onFilterChange]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleClearFilters = () => {
        setFilters(initialState);
    };

    return (
        <div className="imovel-filters-container">
            <form className="imovel-filters-form">
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
                <div className="filter-group actions-group">
                    <button type="button" onClick={handleClearFilters} className="button-link" disabled={isProcessing}>
                        Limpar Filtros
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ImovelFilters;