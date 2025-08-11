// src/pages/Empreendimento/ReservaListPage/ReservaListPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getReservasByCompanyApi, deleteReservaApi } from '../../../../api/reservaApi';
import { toast } from 'react-toastify';
import './ReservaListPage.css';

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

// mapeia status -> classe (para cores)
const statusClass = (status) =>
  `status-${String(status || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acento
    .replace(/\s+/g, '-')}`;

function ReservaListPage() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReservas, setTotalReservas] = useState(0);

  const navigate = useNavigate();

  const fetchReservas = useCallback(async (currentPage = 1, currentFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReservasByCompanyApi(currentPage, 10, currentFilters);
      setReservas(data.reservas || []);
      setTotalPages(data.pages || 1);
      setTotalReservas(data.total || 0);
      setPage(data.page || currentPage);
    } catch (err) {
      const errMsg = err?.error || err?.message || 'Erro ao carregar reservas.';
      setError(errMsg);
      toast.error(errMsg);
      setReservas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReservas(page); }, [fetchReservas, page]);

  const handleGerarProposta = (reservaId) => {
    navigate(`/reservas/${reservaId}/proposta-contrato/novo`);
  };

  const handleDeleteReserva = async (id) => {
    if (!id) return;
    const ok = window.confirm('Tem certeza que deseja excluir esta reserva? Esta ação não pode ser desfeita.');
    if (!ok) return;
    try {
      setDeletingId(id);
      await deleteReservaApi(id);
      toast.success('Reserva excluída com sucesso.');
      fetchReservas(page);
    } catch (err) {
      toast.error(err?.error || err?.message || 'Falha ao excluir a reserva.');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  if (loading) return <div className="admin-page loading"><p>Carregando reservas...</p></div>;

  return (
    <div className="admin-page reserva-list-page">
      <header className="page-header">
        <h1>Reservas de Unidades ({totalReservas})</h1>
      </header>

      <div className="page-content">
        {error && <p className="error-message" style={{ marginBottom: '1rem' }}>{error}</p>}

        {reservas.length === 0 && !error && <p>Nenhuma reserva encontrada.</p>}

        {reservas.length > 0 && (
          <div className="table-responsive">
            <table className="data-table reservas-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Empreendimento</th>
                  <th>Unidade</th>
                  <th>Data Reserva</th>
                  <th>Validade</th>
                  <th>Status</th>
                  <th>Criado Por</th>
                  <th className="th-acoes">Ações</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((res) => (
                  <tr key={res._id}>
                    <td>{res.lead?.nome || 'N/A'}</td>

                    {/* CORRIGIDO: esta coluna precisa de <td> */}
                    <td>
                      {res.tipoImovel === 'Unidade'
                        ? (res.imovel?.empreendimento?.nome || 'N/A')
                        : (res.imovel?.titulo || 'N/A')}
                    </td>

                    <td>{res.imovel?.identificador || res.imovel?.titulo || 'N/A'}</td>
                    <td>{formatDate(res.dataReserva)}</td>
                    <td>{formatDate(res.validadeReserva)}</td>
                    <td>
                      <span className={`status-badge ${statusClass(res.statusReserva)}`}>
                        {res.statusReserva || 'N/A'}
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

                      <button
                        onClick={() => handleDeleteReserva(res._id)}
                        className="button danger-button small-button"
                        disabled={deletingId === res._id}
                        title="Excluir reserva"
                      >
                        {deletingId === res._id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
