import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getImoveisApi, deleteImovelApi } from '../../../api/imovelAvulsoApi';
import ConfirmModal from '../../../components/ConfirmModal/ConfirmModal';
import ImovelFilters from '../../../components/ImovelFilters/ImovelFilters';

import './ImovelListPage.css';

const formatCurrency = (value) => {
  if (typeof value !== 'number') return 'N/A';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function ImovelListPage() {
  const navigate = useNavigate();

  const [imoveis, setImoveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filtros
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // paginação (client-side, sem mudar chamadas de API)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchImoveis = useCallback(async (currentFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getImoveisApi(currentFilters);
      setImoveis(data.imoveis || []);
    } catch (err) {
      setError(err.message || 'Falha ao carregar imóveis.');
      toast.error(err.message || 'Falha ao carregar imóveis.');
      setImoveis([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImoveis(filters);
  }, [filters, fetchImoveis]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setPage(1); // sempre volta pra primeira página ao filtrar
  }, []);

  const handleOpenDeleteModal = (imovel) => {
    setDeleteTarget(imovel);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteImovelApi(deleteTarget._id);
      toast.success(`Imóvel "${deleteTarget.titulo}" excluído com sucesso!`);
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      fetchImoveis(filters); // Atualiza a lista mantendo filtros
      // se apagou o último item da página, recua 1 página
      setPage((prev) => Math.max(1, prev));
    } catch (err) {
      toast.error(err.error || err.message || 'Falha ao excluir imóvel.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ===== Paginação client-side =====
  const total = imoveis.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // mantém "page" sempre dentro do intervalo quando "total/limit" mudarem
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginatedImoveis = useMemo(() => {
    const start = (page - 1) * limit;
    return imoveis.slice(start, start + limit);
  }, [imoveis, page, limit]);

  const showing = useMemo(() => {
    if (!total) return { start: 0, end: 0, total: 0 };
    const start = (page - 1) * limit + 1;
    const end = Math.min(start + limit - 1, total);
    return { start, end, total };
  }, [page, limit, total]);

  const changePage = (p) => {
    if (p >= 1 && p <= totalPages) setPage(p);
  };

  const handleLimitChange = (e) => {
    const newLimit = Number(e.target.value) || 10;
    setLimit(newLimit);
    setPage(1);
  };

  // janela de botões (5)
  const pageWindow = useMemo(() => {
    const windowSize = 5;
    let start = Math.max(1, page - Math.floor(windowSize / 2));
    let end = Math.min(totalPages, start + windowSize - 1);
    if (end - start < windowSize - 1) start = Math.max(1, end - windowSize + 1);
    return { start, end };
  }, [page, totalPages]);

  if (loading) return (
    <div className="admin-page imovel-list-page">
      <header className="page-header">
        <h1>Imóveis Avulsos</h1>
      </header>
      <div className="imovel-shell">
        <div className="table-scroll center-loading">
          <p>Carregando imóveis...</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-page imovel-list-page">
      <header className="page-header">
        <h1>Imóveis Avulsos ({total})</h1>
        <div className="header-actions">
          <label className="page-size">
            Itens por página:
            <select value={limit} onChange={handleLimitChange}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
          <button onClick={() => setShowFilters((prev) => !prev)} className="button outline-button">
            Filtros {showFilters ? '▲' : '▼'}
          </button>
          <Link to="/imoveis-avulsos/novo" className="button primary-button">+ Adicionar Imóvel</Link>
        </div>
      </header>

      {/* SHELL: limita a 100vh e deixa scroll apenas na tabela */}
      <div className="imovel-shell">
        <div className={`filters-wrapper ${showFilters ? 'open' : 'closed'}`}>
          <ImovelFilters onFilterChange={handleFilterChange} isProcessing={loading} />
        </div>

        {error && <p className="error-message">{error}</p>}

        {/* TABELA com scroll interno */}
        <div className="table-shell">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Cidade/Bairro</th>
                  <th>Quartos</th>
                  <th>Vagas</th>
                  <th>Preço</th>
                  <th>Status</th>
                  <th className="th-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedImoveis.length > 0 ? (
                  paginatedImoveis.map((imovel) => (
                    <tr key={imovel._id}>
                      <td>{imovel.titulo}</td>
                      <td>{imovel.tipoImovel}</td>
                      <td>{imovel.endereco?.cidade}, {imovel.endereco?.bairro}</td>
                      <td>{imovel.quartos}</td>
                      <td>{imovel.vagasGaragem}</td>
                      <td>{formatCurrency(imovel.preco)}</td>
                      <td>
                        <span className={`status-badge status-${(imovel.status || '').toLowerCase()}`}>
                          {imovel.status}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button onClick={() => navigate(`/imoveis-avulsos/${imovel._id}/editar`)} className="button-link edit-link">Editar</button>
                        <button onClick={() => handleOpenDeleteModal(imovel)} className="button-link delete-link">Excluir</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="8">Nenhum imóvel avulso encontrado.</td></tr>
                )}
              </tbody>
            </table>
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
              <button className="page-btn" onClick={() => changePage(1)} disabled={page <= 1} aria-label="Primeira página">«</button>
              <button className="page-btn" onClick={() => changePage(page - 1)} disabled={page <= 1} aria-label="Página anterior">‹</button>

              {pageWindow.start > 1 && (
                <>
                  <button className="page-btn" onClick={() => changePage(1)}>1</button>
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
                    onClick={() => changePage(p)}
                    aria-current={active ? 'page' : undefined}
                  >
                    {p}
                  </button>
                );
              })}

              {pageWindow.end < totalPages && (
                <>
                  <span className="ellipsis">…</span>
                  <button className="page-btn" onClick={() => changePage(totalPages)}>{totalPages}</button>
                </>
              )}

              <button className="page-btn" onClick={() => changePage(page + 1)} disabled={page >= totalPages} aria-label="Próxima página">›</button>
              <button className="page-btn" onClick={() => changePage(totalPages)} disabled={page >= totalPages} aria-label="Última página">»</button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o imóvel "${deleteTarget?.titulo}"? Esta ação não pode ser desfeita.`}
        isProcessing={isDeleting}
      />
    </div>
  );
}

export default ImovelListPage;
