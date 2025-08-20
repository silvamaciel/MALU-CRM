import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getIndexadoresApi, createIndexadorApi, upsertValorIndexadorApi } from '../../../api/financeiroApi';

function IndexadoresTab() {
    const [indexadores, setIndexadores] = useState([]);
    const [loading, setLoading] = useState(true);
    // ... (lógica para formulários de criar indexador e adicionar valor)

    const fetchIndexadores = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getIndexadoresApi();
            setIndexadores(data || []);
        } catch (error) {
            toast.error("Erro ao carregar indexadores.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchIndexadores();
    }, [fetchIndexadores]);

    // ... (handlers para submeter os formulários)

    return (
        <div className="indexadores-tab">
            <h2>Indexadores Financeiros</h2>
            <p>Adicione e gira os valores mensais dos indexadores utilizados nos contratos.</p>
            
            {/* Formulário para criar um novo indexador (ex: IPCA) */}
            <div className="card">
                <h3>Criar Novo Indexador</h3>
                {/* ... seu formulário aqui ... */}
            </div>

            {/* Lista de indexadores existentes */}
            {loading ? <p>A carregar...</p> : indexadores.map(idx => (
                <div key={idx._id} className="card indexador-card">
                    <h3>{idx.nome}</h3>
                    <p>{idx.descricao}</p>
                    
                    {/* Formulário para adicionar um novo valor mensal */}
                    <div>
                        {/* Input para 'mesAno' (ex: 2025-08) e 'valor' */}
                    </div>

                    {/* Lista de valores já registados */}
                    <ul>
                        {idx.valores.slice(-5).reverse().map(v => ( // Mostra os últimos 5 valores
                            <li key={v.mesAno}>{v.mesAno}: <strong>{v.valor}%</strong></li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}

export default IndexadoresTab;