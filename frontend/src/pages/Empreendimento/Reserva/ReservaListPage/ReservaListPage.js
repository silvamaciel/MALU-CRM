// src/pages/Empreendimento/ReservaListPage/ReservaListPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// Importe a função da API de reservas que lista (criaremos em src/api/reservaApi.js)
import { getReservasByCompanyApi } from '../../../../api/reservaApi'; // Ajuste o caminho se necessário
import { toast } from 'react-toastify';
// import './ReservaListPage.css'; // Crie este arquivo CSS depois

// Função auxiliar para formatar data (você pode ter uma global)
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    } catch (e) { return 'Data inválida'; }
};

function ReservaListPage() {
    const [reservas, setReservas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalReservas, setTotalReservas] = useState(0);
    // Futuro: states para filtros (statusReserva, empreendimentoId, etc.)

    const navigate = useNavigate();

    const fetchReservas = useCallback(async (currentPage = 1, currentFilters = {}) => {
        setLoading(true);
        setError(null);
        try {
            // Assumindo que getReservasByCompanyApi é a função que chama GET /api/reservas
            const data = await getReservasByCompanyApi(currentPage, 10, currentFilters);
            setReservas(data.reservas || []);
            setTotalPages(data.pages || 1);
            setTotalReservas(data.total || 0);
            setPage(data.page || currentPage);
        } catch (err) {
            const errMsg = err.error || err.message || "Erro ao carregar reservas.";
            setError(errMsg);
            toast.error(errMsg);
            setReservas([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReservas(page);
    }, [fetchReservas, page]);

    const handleGerarProposta = (reservaId) => {
        // Navegar para a página/modal de criação de Proposta/Contrato, passando o reservaId
        console.log("Navegar para criar proposta/contrato para Reserva ID:", reservaId);
        toast.info(`TODO: Navegar para formulário de Proposta/Contrato da Reserva ${reservaId}`);
        // Ex: navigate(`/reservas/${reservaId}/proposta-contrato/novo`); (Criaremos essa rota depois)
    };

    // Função para mudar de página (paginação)
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    if (loading) {
        return <div className="admin-page loading"><p>Carregando reservas...</p></div>;
    }

    return (
        <div className="admin-page reserva-list-page">
            <header className="page-header">
                <h1>Reservas de Unidades ({totalReservas})</h1>
                {/* Não há botão "Nova Reserva" aqui, pois o fluxo se inicia pelo Lead/Unidade */}
            </header>
            <div className="page-content">
                {error && <p className="error-message" style={{ marginBottom: '1rem' }}>{error}</p>}

                {/* TODO: Adicionar filtros aqui no futuro (por status, empreendimento, etc.) */}

                {reservas.length === 0 && !error && (
                    <p>Nenhuma reserva encontrada.</p>
                )}

                {reservas.length > 0 && (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Lead</th>
                                    <th>Empreendimento</th>
                                    <th>Unidade</th>
                                    <th>Data Reserva</th>
                                    <th>Validade</th>
                                    <th>Status</th>
                                    <th>Criado Por</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reservas.map(res => (
                                    <tr key={res._id}>
                                        <td>{res.lead?.nome || 'N/A'}</td>
                                        <td>{res.empreendimento?.nome || 'N/A'}</td>
                                        <td>{res.unidade?.identificador || 'N/A'}</td>
                                        <td>{formatDate(res.dataReserva)}</td>
                                        <td>{formatDate(res.validadeReserva)}</td>
                                        <td>
                                            <span className={`status-badge status-${String(res.statusReserva).toLowerCase().replace(/\s+/g, '-')}`}>
                                                {res.statusReserva}
                                            </span>
                                        </td>
                                        <td>{res.createdBy?.nome || 'N/A'}</td>
                                        <td className="actions-cell">
                                            {res.statusReserva === "Ativa" && (
                                                <button 
                                                    onClick={() => handleGerarProposta(res._id)}
                                                    className="button primary-button small-button" // Adicione small-button se quiser menor
                                                >
                                                    Gerar Proposta/Contrato
                                                </button>
                                            )}
                                            {/* Link para Detalhes da Reserva (página a ser criada) */}
                                            {/* <Link to={`/reservas/${res._id}`} className="button-link view-link" style={{marginLeft: '8px'}}>Detalhes</Link> */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Controles de Paginação */}
                {totalPages > 1 && (
                    <div className="pagination-controls" style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>Anterior</button>
                        <span style={{ margin: '0 10px' }}>Página {page} de {totalPages}</span>
                        <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}>Próxima</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ReservaListPage;