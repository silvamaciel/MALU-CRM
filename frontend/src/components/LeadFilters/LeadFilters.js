// src/components/LeadFilters/LeadFilters.js
import React, { useState, useEffect } from 'react';
import './LeadFilters.css'; // Criaremos este CSS

// Hook simples para debounce (opcional, mas recomendado)
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


function LeadFilters({
    situacoesList = [], // Recebe as listas como props
    origensList = [],
    usuariosList = [],
    onFilterChange, // Função para notificar o pai sobre a mudança nos filtros
    isProcessing // Opcional: para desabilitar filtros durante o carregamento
}) {
  const initialFilterState = {
    nome: '',
    email: '',
    situacao: '', // ID da situação
    origem: '',   // ID da origem
    responsavel: '', // ID do responsável
    dataInicio: '', // Formato YYYY-MM-DD
    dataFim: ''     // Formato YYYY-MM-DD
  };
  const [filters, setFilters] = useState(initialFilterState);

  // Usa debounce para evitar chamadas excessivas à API enquanto digita
  const debouncedFilters = useDebounce(filters, 500); // Atraso de 500ms

  // Efeito que chama onFilterChange quando os filtros (debounced) mudam
  useEffect(() => {
    // Verifica se onFilterChange é uma função antes de chamar
    if (typeof onFilterChange === 'function') {
        // Limpa filtros vazios antes de enviar
        const activeFilters = {};
        for (const key in debouncedFilters) {
            if (debouncedFilters[key] !== '' && debouncedFilters[key] !== null) {
                activeFilters[key] = debouncedFilters[key];
            }
        }
        console.log("LeadFilters: Chamando onFilterChange com:", activeFilters);
        onFilterChange(activeFilters);
    }
  }, [debouncedFilters, onFilterChange]); // Depende dos filtros debounced

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
    setFilters(initialFilterState);
    // Chama onFilterChange imediatamente com filtros vazios
     if (typeof onFilterChange === 'function') {
         onFilterChange({});
     }
  };

  return (
    <div className="lead-filters-container">
      <form className="lead-filters-form">
        {/* Linha 1: Nome, Email */}
        <div className="filter-group">
          <label htmlFor="filter-nome">Nome</label>
          <input
            type="text"
            id="filter-nome"
            name="nome"
            value={filters.nome}
            onChange={handleChange}
            placeholder="Filtrar por nome..."
            disabled={isProcessing}
          />
        </div>
        <div className="filter-group">
          <label htmlFor="filter-email">Email</label>
          <input
            type="email"
            id="filter-email"
            name="email"
            value={filters.email}
            onChange={handleChange}
            placeholder="Filtrar por email..."
            disabled={isProcessing}
          />
        </div>

         {/* Linha 2: Situação, Origem, Responsável */}
         <div className="filter-group">
             <label htmlFor="filter-situacao">Situação</label>
             <select
                id="filter-situacao"
                name="situacao"
                value={filters.situacao}
                onChange={handleChange}
                disabled={isProcessing}
             >
                 <option value="">Todas</option>
                 {situacoesList.map(s => <option key={s._id} value={s._id}>{s.nome}</option>)}
             </select>
        </div>
        <div className="filter-group">
            <label htmlFor="filter-origem">Origem</label>
             <select
                id="filter-origem"
                name="origem"
                value={filters.origem}
                onChange={handleChange}
                disabled={isProcessing}
             >
                 <option value="">Todas</option>
                 {origensList.map(o => <option key={o._id} value={o._id}>{o.nome}</option>)}
             </select>
        </div>
        <div className="filter-group">
             <label htmlFor="filter-responsavel">Responsável</label>
             <select
                id="filter-responsavel"
                name="responsavel"
                value={filters.responsavel}
                onChange={handleChange}
                disabled={isProcessing}
             >
                 <option value="">Todos</option>
                 {usuariosList.map(u => <option key={u._id} value={u._id}>{u.nome}</option>)}
             </select>
        </div>


        {/* Linha 3: Datas */}
        <div className="filter-group">
          <label htmlFor="filter-dataInicio">Criado de:</label>
          <input
            type="date"
            id="filter-dataInicio"
            name="dataInicio"
            value={filters.dataInicio}
            onChange={handleChange}
            disabled={isProcessing}
            max={filters.dataFim || undefined} // Impede data inicial > data final
          />
        </div>
        <div className="filter-group">
           <label htmlFor="filter-dataFim">Criado até:</label>
           <input
             type="date"
             id="filter-dataFim"
             name="dataFim"
             value={filters.dataFim}
             onChange={handleChange}
             disabled={isProcessing}
             min={filters.dataInicio || undefined} // Impede data final < data inicial
           />
        </div>

         {/* Linha 4: Botão Limpar */}
         <div className="filter-group clear-button-group">
             <button
               type="button"
               onClick={handleClearFilters}
               className="clear-filters-button"
               disabled={isProcessing}
             >
                Limpar Filtros
             </button>
         </div>

      </form>
    </div>
  );
}

export default LeadFilters;