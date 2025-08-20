import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { listarDespesasApi, criarDespesaApi } from '../../../api/financeiroApi';
// Importaremos o modal de criação que faremos a seguir
import CriarDespesaModal from './CriarDespesaModal'; 
import StatusBadge from '../../../components/StatusBadge/StatusBadge'; // Reutilize o StatusBadge

function ContasAPagarTab() {
    const [despesas, setDespesas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // States para paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchDespesas = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listarDespesasApi({ page: currentPage, limit: 10 });
            setDespesas(data.despesas || []);
            setTotalPages(data.totalPages || 1);
        } catch (error) {
            toast.error("Erro ao carregar contas a pagar.");
        } finally {
            setLoading(false);
        }
    }, [currentPage]);

    useEffect(() => {
        fetchDespesas();
    }, [fetchDespesas]);
    
    const handleCreateSuccess = () => {
        setIsModalOpen(false);
        fetchDespesas(); // Atualiza a lista após criar uma nova despesa
    };

    return (
        <div className="contas-a-pagar-tab">
            <div className="tab-header">
                <h2>Contas a Pagar</h2>
                <button onClick={() => setIsModalOpen(true)} className="button primary-button">
                    + Adicionar Despesa
                </button>
            </div>

            <div className="table-container card">
                {loading ? <p>A carregar despesas...</p> : (
                    <table>
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Descrição</th>
                                <th>Credor</th>
                                <th>Vencimento</th>
                                <th>Valor</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {despesas.map(d => (
                                <tr key={d._id}>
                                    <td><StatusBadge status={d.status} /></td>
                                    <td>{d.descricao}</td>
                                    <td>{d.credor?.nome || 'N/A'}</td>
                                    <td>{new Date(d.dataVencimento).toLocaleDateString('pt-BR')}</td>
                                    <td>{d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td>
                                        <button className="button small-button">Registar Pagamento</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {(!loading && despesas.length === 0) && <p className="no-data-message">Nenhuma despesa encontrada.</p>}
            </div>

            {/* Paginação aqui, se necessário */}

            <CriarDespesaModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleCreateSuccess}
            />
        </div>
    );
}

export default ContasAPagarTab;