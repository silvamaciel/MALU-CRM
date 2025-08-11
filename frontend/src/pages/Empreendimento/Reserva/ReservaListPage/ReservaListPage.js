// src/pages/Empreendimento/ReservaListPage/ReservaListPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getReservasByCompanyApi, deleteReservaApi } from '../../../../api/reservaApi';
import { toast } from 'react-toastify';
import './ReservaListPage.css'; // (onde fica o CSS da tabela + paginação)

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  } catch {
    return 'Data inválida';
  }
};

function ReservaListPage() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // paginação
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReservas, setTotalReservas] = useState(0);

  const navigate = useNavigate();

  const fetchReservas = useCallback(async (p = page, l = limit) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReservasByCompanyApi(p, l);
      // Backend retorna: { success, reservas, total, totalPages, currentPage }
      setReservas(data.reservas || []);
      setTotalReservas(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setPage(data.currentPage || p);
    } catch (err) {
      const errMsg = err.error || err.message || 'Erro ao carregar reservas.';
      setError(errMsg);
      toast.error(errMsg);
      setReservas([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchReservas(page, limit);
  }, [fetchReservas, page, limit]);

  const handleGerarProposta = (reservaId) => {
    navigate(`/reservas/${reservaId}/proposta-contrato/novo`);
  };

  const handleDelete = async (id) => {
    try {
      await deleteReservaApi(id);
      toast.success('Reserva excluída.');
      // se a página ficou “vazia” após deletar, retrocede uma página
      if (reservas.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchReservas(page, limit);
      }
    } catch (e) {
      toast.error(e?.message || 'Falha ao excluir reserva.');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
    }
  };

  // janela de páginas (mostra até 5 páginas: atual ±2)
  const pageNumbers = useMemo(() => {
    const max = Math.max(1, totalPages);
    const start = Math.max(1, page - 2);
    const end = Math.min(max, start + 4);
    const realStart = Math.max(1, end - 4);
    return Array.from({ length: end - realStart + 1 }, (_, i) => realStart + i);
  }, [page, totalPages]);

  if (loading) return <div className="admin-page loading"><p>Carregando reservas...</p></div>;

  return (
    <div className="admin-page reserva-list-page">
      <header className="page-header">
        <h1>Reservas de Unidades ({totalReservas})</h1>

        {/* seletor de itens por página */}
        <div className="list-toolbar">
          <label className="limit-label">
            Itens por página:
            <select
              value={limit}
              onChange={e => { setPage(1); setLimit(Number(e.target.value)); }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
      </header>

      <div className="page-content">
        {error && <p className="error-message" style={{ marginBottom: '1rem' }}>{error}</p>}

        {reservas.length === 0 && !error && <p>Nenhuma reserva encontrada.</p>}

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
                {reservas.map((res) => {
                  const statusClass = `status-${String(res.statusReserva || 'unknown').toLowerCase().replace(/\s+/g, '-')}`;
                  const emp = res.tipoImovel === 'Unidade'
                    ? (res.imovel?.empreendimento?.nome || 'N/A')
                    : (res.imovel?.titulo || 'N/A');

                  return (
                    <tr key={res._id}>
                      <td>{res.lead?.nome || 'N/A'}</td>
                      <td>{emp}</td>
                      <td>{res.imovel?.identificador || res.imovel?.titulo || 'N/A'}</td>
                      <td>{formatDate(res.dataReserva)}</td>
                      <td>{formatDate(res.validadeReserva)}</td>
                      <td>
                        <span className={`status-badge ${statusClass}`}>
                          {res.statusReserva || '—'}
                        </span>
                      </td>
                      <td>{res.createdBy?.nome || 'N/A'}</td>
                      <td className="actions-cell">
                        {res.statusReserva === 'Ativa' && (
                          <button
                            onClick={() => handleGerarProposta(res._id)}
                            className="button primary-button small-button"
                          >
                            Gerar Proposta/Contrato
                          </button>
                        )}

                        {(res.statusReserva === 'ConvertidaEmProposta' || res.propostaId) && (
                          <Link
                            to={`/propostas-contratos/${res.propostaId}`}
                            className="button-link view-link"
                          >
                            Visualizar Proposta
                          </Link>
                        )}

                        <button className="button danger small-button" onClick={() => handleDelete(res._id)}>
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* paginação */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="pg-btn"
              onClick={() => handlePageChange(1)}
              disabled={page === 1}
              aria-label="Primeira página"
            >
              «
            </button>
            <button
              className="pg-btn"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              aria-label="Página anterior"
            >
              ‹
            </button>

            {pageNumbers.map(n => (
              <button
                key={n}
                className={`pg-btn num ${n === page ? 'active' : ''}`}
                onClick={() => handlePageChange(n)}
              >
                {n}
              </button>
            ))}

            <button
              className="pg-btn"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              aria-label="Próxima página"
            >
              ›
            </button>
            <button
              className="pg-btn"
              onClick={() => handlePageChange(totalPages)}
              disabled={page === totalPages}
              aria-label="Última página"
            >
              »
            </button>

            <span className="pg-info">Página {page} de {totalPages}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReservaListPage;
