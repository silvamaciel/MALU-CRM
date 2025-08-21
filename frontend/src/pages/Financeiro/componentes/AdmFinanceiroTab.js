import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { 
    getIndexadoresApi, 
    createIndexadorApi, 
    upsertValorIndexadorApi,
    listarCredoresApi 
} from '../../../api/financeiroApi';
import CriarCredorModal from './CriarCredorModal'; // Importa o novo modal

// --- Sub-componente para a Gestão de Indexadores ---
const GestaoIndexadores = ({ indexadores, loading, onUpdate }) => {
    const [newIndexador, setNewIndexador] = useState({ nome: '', descricao: '' });
    const [valores, setValores] = useState({}); // ex: { 'indexadorId': { mesAno: '...', valor: '' } }

    const handleCreateIndexador = async (e) => {
        e.preventDefault();
        try {
            await createIndexadorApi(newIndexador);
            toast.success("Indexador criado com sucesso!");
            setNewIndexador({ nome: '', descricao: '' });
            onUpdate(); // Pede para o pai atualizar
        } catch (error) { toast.error(error.message); }
    };

    const handleAddValor = async (e, indexadorId) => {
        e.preventDefault();
        const valorData = valores[indexadorId];
        if (!valorData || !valorData.mesAno || !valorData.valor) {
            toast.warn("Mês/Ano e Valor são obrigatórios.");
            return;
        }
        try {
            await upsertValorIndexadorApi(indexadorId, valorData);
            toast.success("Valor do indexador salvo!");
            setValores(prev => ({...prev, [indexadorId]: { mesAno: '', valor: '' }}));
            onUpdate();
        } catch (error) { toast.error(error.message); }
    };

    const handleValorChange = (indexadorId, field, value) => {
        setValores(prev => ({
            ...prev,
            [indexadorId]: { ...prev[indexadorId], [field]: value }
        }));
    };

    return (
        <div className="adm-section">
            <h3>Gestão de Indexadores</h3>
            <p>Adicione e gira os valores mensais dos indexadores utilizados nos contratos.</p>
            <div className="card">
                <form onSubmit={handleCreateIndexador} className="add-indexador-form">
                    <input type="text" placeholder="Nome (ex: INCC)" value={newIndexador.nome} onChange={e => setNewIndexador({...newIndexador, nome: e.target.value.toUpperCase()})} required />
                    <input type="text" placeholder="Descrição (opcional)" value={newIndexador.descricao} onChange={e => setNewIndexador({...newIndexador, descricao: e.target.value})} />
                    <button type="submit" className="button primary-button">Criar Indexador</button>
                </form>
            </div>
            <div className="indexadores-list">
                {loading ? <p>A carregar...</p> : indexadores.map(idx => (
                    <div key={idx._id} className="card indexador-card">
                        <h4>{idx.nome}</h4>
                        <form onSubmit={(e) => handleAddValor(e, idx._id)} className="add-valor-form">
                            <input type="month" onChange={(e) => handleValorChange(idx._id, 'mesAno', e.target.value)} required />
                            <input type="number" step="0.01" placeholder="Valor %" onChange={(e) => handleValorChange(idx._id, 'valor', parseFloat(e.target.value))} required />
                            <button type="submit" className="button small-button">Adicionar</button>
                        </form>
                        <ul className="valores-list">
                            {idx.valores.slice(-6).reverse().map(v => (
                                <li key={v.mesAno}><span>{v.mesAno}</span> <strong>{v.valor}%</strong></li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Sub-componente para a Gestão de Credores ---
const GestaoCredores = ({ credores, loading, onUpdate }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSuccess = () => {
        setIsModalOpen(false);
        onUpdate();
    };

    return (
        <div className="adm-section">
            <div className="section-header">
                <h3>Gestão de Credores</h3>
                <button onClick={() => setIsModalOpen(true)} className="button primary-button">+ Novo Credor</button>
            </div>
             {loading ? <p>A carregar...</p> : (
                <div className="table-container">
                    <table>
                        <thead><tr><th>Nome</th><th>Tipo</th><th>CPF/CNPJ</th><th>Ações</th></tr></thead>
                        <tbody>
                            {credores.map(c => (
                                <tr key={c._id}>
                                    <td>{c.nome}</td>
                                    <td>{c.tipo}</td>
                                    <td>{c.cpfCnpj || 'N/A'}</td>
                                    <td><button className="button-link">Editar</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <CriarCredorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleSuccess} />
        </div>
    );
};


function AdmFinanceiroTab() {
    const [indexadores, setIndexadores] = useState([]);
    const [credores, setCredores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0); // Para forçar atualização

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [indexadoresData, credoresData] = await Promise.all([
                getIndexadoresApi(),
                listarCredoresApi()
            ]);
            setIndexadores(indexadoresData || []);
            setCredores(credoresData || []);
        } catch (error) {
            toast.error("Erro ao carregar dados administrativos.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData, refreshKey]);

    return (
        <div className="adm-financeiro-tab">
            <GestaoIndexadores indexadores={indexadores} loading={loading} onUpdate={() => setRefreshKey(prev => prev + 1)} />
            <GestaoCredores credores={credores} loading={loading} onUpdate={() => setRefreshKey(prev => prev + 1)} />
        </div>
    );
}

export default AdmFinanceiroTab;