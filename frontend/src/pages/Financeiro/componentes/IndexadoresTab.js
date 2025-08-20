import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getIndexadoresApi, createIndexadorApi, upsertValorIndexadorApi } from '../../../api/financeiroApi';

function IndexadoresTab() {
    const [indexadores, setIndexadores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newValorData, setNewValorData] = useState({ mesAno: '', valor: '' });

    const fetchIndexadores = useCallback(async () => { /* ... sua lógica de busca ... */ }, []);
    useEffect(() => { fetchIndexadores(); }, [fetchIndexadores]);

    const handleAddValor = async (e, indexadorId) => {
        e.preventDefault();
        // ... sua lógica para chamar a upsertValorIndexadorApi
    };

    if (loading) return <p>A carregar indexadores...</p>;

    return (
        <div className="indexadores-tab">
            <h2>Gestão de Indexadores</h2>
            <p>Adicione e gira os valores mensais dos indexadores utilizados nos contratos.</p>
            
            {/* ... (formulário para criar novo indexador) ... */}

            <div className="indexadores-list">
                {indexadores.map(idx => (
                    <div key={idx._id} className="card indexador-card">
                        <h3>{idx.nome}</h3>
                        <form onSubmit={(e) => handleAddValor(e, idx._id)} className="add-valor-form">
                            <input type="month" onChange={(e) => setNewValorData({ ...newValorData, mesAno: e.target.value.replace('-', '/') })} required />
                            <input type="number" step="0.01" placeholder="Valor %" onChange={(e) => setNewValorData({ ...newValorData, valor: parseFloat(e.target.value) })} required />
                            <button type="submit" className="button small-button">Adicionar Valor</button>
                        </form>
                        <ul className="valores-list">
                            {idx.valores.slice(-6).reverse().map(v => (
                                <li key={v.mesAno}>{v.mesAno}: <strong>{v.valor}%</strong></li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default IndexadoresTab;