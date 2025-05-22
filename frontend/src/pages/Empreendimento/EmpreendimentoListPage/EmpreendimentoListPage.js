import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getEmpreendimentos } from '../../../api/empreendimentoApi'; // Ajuste o caminho se necessário
import { toast } from 'react-toastify';
import './EmpreendimentoListPage.css'; // Arquivo CSS separado

// Lógica JavaScript (Hooks, State, Handlers, Fetching Data)
function EmpreendimentoListPage() {
    const [empreendimentos, setEmpreendimentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalEmpreendimentos, setTotalEmpreendimentos] = useState(0);
    // Futuro: states para filtros

    const navigate = useNavigate();

    const fetchEmpreendimentos = useCallback(async (currentPage = 1, currentFilters = {}) => {
        setLoading(true);
        setError(null);
        try {
            // A função getEmpreendimentos da API já trata a remoção de filtros vazios
            const data = await getEmpreendimentos(currentPage, 10, currentFilters);
            setEmpreendimentos(data.empreendimentos || []);
            setTotalPages(data.pages || 1);
            setTotalEmpreendimentos(data.total || 0);
            setPage(data.page || currentPage); // Atualiza a página atual com base na resposta da API
        } catch (err) {
            const errMsg = err.error || err.message || "Erro ao carregar empreendimentos.";
            setError(errMsg);
            toast.error(errMsg);
            setEmpreendimentos([]); // Limpa em caso de erro
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEmpreendimentos(page); // Passa a página atual
    }, [fetchEmpreendimentos, page]); // Re-busca se fetchEmpreendimentos (estável) ou page mudar

    const handleNewEmpreendimento = () => {
        navigate('/empreendimentos/novo');
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage); // Isso vai disparar o useEffect para buscar os dados da nova página
        }
    };

    if (loading) {
        return <div className="admin-page loading"><p>Carregando empreendimentos...</p></div>;
    }

    return (
        <div className="admin-page empreendimento-list-page"> {/* Classe específica */}
            <header className="page-header">
                <h1>Meus Empreendimentos ({totalEmpreendimentos})</h1>
                <button onClick={handleNewEmpreendimento} className="button primary-button">
                    Novo Empreendimento
                </button>
            </header>
            <div className="page-content">
                {error && <p className="error-message" style={{ marginBottom: '1rem' }}>{error}</p>}
                
                {/* TODO: Adicionar filtros aqui no futuro */}

                {empreendimentos.length === 0 && !error && (
                    <p>Nenhum empreendimento encontrado. Clique em "Novo Empreendimento" para adicionar.</p>
                )}

                {empreendimentos.length > 0 && (
                    <div className="table-responsive"> {/* Para melhor responsividade da tabela */}
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Tipo</th>
                                    <th>Status</th>
                                    <th>Cidade/UF</th>
                                    <th>Unidades</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {empreendimentos.map(emp => (
                                    <tr key={emp._id}>
                                        <td>{emp.nome}</td>
                                        <td>{emp.tipo}</td>
                                        <td>{emp.statusEmpreendimento}</td>
                                        <td>{`${emp.localizacao?.cidade || 'N/A'} / ${emp.localizacao?.uf || 'N/A'}`}</td>
                                        <td>{emp.totalUnidades || 0}</td>
                                        <td className="actions-cell">
                                            <Link to={`/empreendimentos/${emp._id}`} className="button-link view-link">
                                                Detalhes
                                            </Link>
                                            <Link to={`/empreendimentos/${emp._id}/editar`} className="button-link edit-link" style={{marginLeft: '8px'}}>
                                                Editar
                                            </Link>
                                            {/* Botão Desativar virá aqui, chamando uma função handler */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Controles de Paginação (Simples) */}
                {totalPages > 1 && (
                    <div className="pagination-controls" style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>
                            Anterior
                        </button>
                        <span style={{ margin: '0 10px' }}>
                            Página {page} de {totalPages}
                        </span>
                        <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}>
                            Próxima
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default EmpreendimentoListPage;