import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getEmpreendimentos } from '../../../api/empreendimentoApi';
import { toast } from 'react-toastify';
import './EmpreendimentoListPage.css';

function EmpreendimentoListPage() {
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // paginação
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmpreendimentos, setTotalEmpreendimentos] = useState(0);

  const navigate = useNavigate();

  const fetchEmpreendimentos = useCallback(async (currentPage = 1, currentLimit = limit, currentFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      // getEmpreendimentos(page, limit, filtros)
      const data = await getEmpreendimentos(currentPage, currentLimit, currentFilters);

      const list = Array.isArray(data?.empreendimentos) ? data.empreendimentos : [];
      const total = Number(data?.total ?? list.length);
      const pages = Number(data?.pages ?? Math.max(1, Math.ceil(total / currentLimit)));
      const current = Number(data?.page ?? currentPage);

      setEmpreendimentos(list);
      setTotalEmpreendimentos(total);
      setTotalPages(pages);
      setPage(current);
    } catch (err) {
      const errMsg = err?.error || err?.message || 'Erro ao carregar empreendimentos.';
      setError(errMsg);
      toast.error(errMsg);
      setEmpreendimentos([]);
      setTotalEmpreendimentos(0);
      setTotalPages(1);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchEmpreendimentos(page, limit);
  }, [fetchEmpreendimentos, page, limit]);

  const handleNewEmpreendimento = () => navigate('/empreendimentos/novo');

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  const handleLimitChange = (e) => {
    const newLimit = Number(e.target.value) || 10;
    setLimit(newLimit);
    setPage(1); // sempre volta pra página 1 ao mudar o page size
  };

  // “Mostrando X–Y de Z”
  const showing = useMemo(() => {
    const total = totalEmpreendimentos || 0;
    if (!total) return { start: 0, end: 0, total: 0 };
    const start = (page - 1) * limit + 1;
    const end = Math.min(start + limit - 1, total);
    return { start, end, total };
  }, [page, limit, totalEmpreendimentos]);

  // janela de páginas (5 botões)
  const pageWindow = useMemo(() => {
    const windowSize = 5;
    let start = Math.max(1, page - Math.floor(windowSize / 2));
    let end = Math.min(totalPages, start + windowSize - 1);
    if (end - start < windowSize - 1) start = Math.max(1, end - windowSize + 1);
    return { start, end };
  }, [page, totalPages]);

  if (loading) {
    return (
      <div className="admin-page empreendimento-list-page">
        <header className="page-header">
          <h1>Meus Empreendimentos</h1>
        </header>
        <div className="empre-shell">
          <div className="table-scroll center-loading">
            <p>Carregando empreendimentos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page empreendimento-list-page">
      <header className="page-header">
        <h1>Meus Empreendimentos ({totalEmpreendimentos})</h1>
        <div className="page-header-actions">
          <label className="page-size">
            Itens por página:
            <select value={limit} onChange={handleLimitChange}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
          <button onClick={handleNewEmpreendimento} className="button primary-button">
            Novo Empreendimento
          </button>
        </div>
      </header>

      {/* SHELL: limita a 100vh da tela e deixa scroll só na tabela */}
      <div className="empre-shell">
        {error && <p className="error-message">{error}</p>}

        {/* aqui podem entrar filtros futuros */}

        {/* TABELA com scroll interno */}
        <div className="table-shell">
          <div className="table-scroll">
            {empreendimentos.length === 0 && !error ? (
              <div className="empty-state">
                <p>Nenhum empreendimento encontrado. Clique em “Novo Empreendimento”.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Cidade/UF</th>
                    <th>Unidades</th>
                    <th className="th-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {empreendimentos.map((emp) => (
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
                        <Link to={`/empreendimentos/${emp._id}/editar`} className="button-link edit-link">
                          Editar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Paginação fixa no rodapé do shell */}
        {totalPages > 1 && (
          <div className="pagination-bar">
            <div className="pagination-left">
              <span className="pagination-range">
                Mostrando <strong>{showing.start}</strong>–<strong>{showing.end}</strong> de{' '}
                <strong>{showing.total}</strong>
              </span>
            </div>

            <div className="pagination-right">
              <button
                className="page-btn"
                onClick={() => handlePageChange(1)}
                disabled={page <= 1}
                aria-label="Primeira página"
              >
                «
              </button>
              <button
                className="page-btn"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                aria-label="Página anterior"
              >
                ‹
              </button>

              {pageWindow.start > 1 && (
                <>
                  <button className="page-btn" onClick={() => handlePageChange(1)}>1</button>
                  <span className="ellipsis">…</span>
                </>
              )}

              {Array.from({ length: pageWindow.end - pageWindow.start + 1 }, (_, i) => {
                const p = pageWindow.start + i;
                const active = p === page;
                return (
                  <button
                    key={p}
                    className={`page-btn ${active ? 'is-active' : ''}`}
                    onClick={() => handlePageChange(p)}
                    aria-current={active ? 'page' : undefined}
                  >
                    {p}
                  </button>
                );
              })}

              {pageWindow.end < totalPages && (
                <>
                  <span className="ellipsis">…</span>
                  <button className="page-btn" onClick={() => handlePageChange(totalPages)}>
                    {totalPages}
                  </button>
                </>
              )}

              <button
                className="page-btn"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                aria-label="Próxima página"
              >
                ›
              </button>
              <button
                className="page-btn"
                onClick={() => handlePageChange(totalPages)}
                disabled={page >= totalPages}
                aria-label="Última página"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmpreendimentoListPage;
