import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getReservasByCompanyApi,
  deleteReservaApi,
} from "../../../../api/reservaApi";
import { toast } from "react-toastify";
import "./ReservaListPage.css";

// util simples
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

function ReservaListPage() {
  const navigate = useNavigate();

  // dados
  const [reservas, setReservas] = useState([]);
  const [totalReservas, setTotalReservas] = useState(0);

  // paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);

  // carregamento/erros
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filtros
  const [statusFilter, setStatusFilter] = useState([]); // multi
  const [tipoImovel, setTipoImovel] = useState(""); // '', 'Unidade', 'ImovelAvulso'
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const toggleStatus = (s) => {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setStatusFilter([]);
    setTipoImovel("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const queryFilters = useMemo(
    () => ({
      status: statusFilter.length ? statusFilter.join(",") : undefined,
      tipoImovel: tipoImovel || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    }),
    [statusFilter, tipoImovel, fromDate, toDate]
  );

  const fetchReservas = useCallback(
    async (p = page, l = limit) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getReservasByCompanyApi(p, l, queryFilters);
        setReservas(data.reservas || []);
        setTotalReservas(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setPage(data.currentPage || p);
      } catch (err) {
        const errMsg = err?.error || err?.message || "Erro ao carregar reservas.";
        setError(errMsg);
        toast.error(errMsg);
        setReservas([]);
      } finally {
        setLoading(false);
      }
    },
    [page, limit, queryFilters]
  );

  useEffect(() => {
    fetchReservas(1, limit); // quando filtros mudarem, volta pra página 1
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryFilters, limit]);

  useEffect(() => {
    fetchReservas(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  const handleGerarProposta = (reservaId) => {
    navigate(`/reservas/${reservaId}/proposta-contrato/novo`);
  };

  const handleDelete = async (reservaId) => {
    const ok = window.confirm("Excluir esta reserva? Esta ação é irreversível.");
    if (!ok) return;
    try {
      await deleteReservaApi(reservaId);
      toast.success("Reserva excluída.");
      // Recarrega a página atual mantendo filtros
      fetchReservas(page, limit);
    } catch (err) {
      const msg = err?.error || err?.message || "Falha ao excluir a reserva.";
      toast.error(msg);
    }
  };

  return (
    <div className="admin-page reserva-list-page">
      <header className="page-header">
        <h1>Reservas de Unidades ({totalReservas})</h1>

        <div className="list-toolbar">
          <label className="limit-label">
            Itens por página:
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
      </header>

      {/* FILTROS */}
      <div className="filter-bar">
        <div className="filter-group">
          <span className="filter-label">Status:</span>
          {[
            "Ativa",
            "Distratada",
            "ConvertidaEmProposta",
            "ConvertidaEmVenda",
            "Expirada",
            "Cancelada",
          ].map((s) => (
            <button
              key={s}
              className={`chip ${statusFilter.includes(s) ? "active" : ""}`}
              onClick={() => toggleStatus(s)}
              type="button"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="filter-group">
          <span className="filter-label">Tipo:</span>
          <select
            value={tipoImovel}
            onChange={(e) => {
              setTipoImovel(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="Unidade">Unidade</option>
            <option value="ImovelAvulso">Imóvel Avulso</option>
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Período:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
          />
          <span className="tilde">~</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="filter-actions">
          <button className="button ghost" onClick={clearFilters} type="button">
            Limpar
          </button>
        </div>
      </div>

      {/* CONTEÚDO (tabela + paginação sticky) */}
      <div className="page-content">
        {loading && (
          <div className="loading-block">
            <p>Carregando reservas...</p>
          </div>
        )}

        {error && !loading && (
          <p className="error-message" style={{ marginBottom: "1rem" }}>
            {error}
          </p>
        )}

        {!loading && reservas.length === 0 && !error && (
          <div className="empty-block">
            <p>Nenhuma reserva encontrada.</p>
          </div>
        )}

        {!loading && reservas.length > 0 && (
          <div className="table-wrap">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Empreendimento</th>
                    <th>Unidade</th>
                    <th>Data Reserva</th>
                    <th>Status</th>
                    <th>Criado Por</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.map((res) => {
                    const statusClass = `status-${String(
                      res.statusReserva || ""
                    )
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`;

                    const empreendNome =
                      res.tipoImovel === "Unidade"
                        ? res.imovel?.empreendimento?.nome || "N/A"
                        : res.imovel?.titulo || "N/A";

                    const unidadeIdent =
                      res.imovel?.identificador ||
                      res.imovel?.titulo ||
                      "N/A";

                    return (
                      <tr key={res._id}>
                        <td>{res.lead?.nome || "N/A"}</td>
                        <td>{empreendNome}</td>
                        <td>{unidadeIdent}</td>
                        <td>{formatDate(res.dataReserva)}</td>
                        <td>
                          <span className={`status-badge ${statusClass}`}>
                            {res.statusReserva}
                          </span>
                        </td>
                        <td>{res.createdBy?.nome || "N/A"}</td>
                        <td className="actions-cell">
                          {res.statusReserva === "Ativa" && (
                            <button
                              onClick={() => handleGerarProposta(res._id)}
                              className="button primary-button small-button"
                              type="button"
                            >
                              Gerar Proposta/Contrato
                            </button>
                          )}

                          {(res.statusReserva === "ConvertidaEmProposta" ||
                            res.propostaId) && (
                            <Link
                              to={`/propostas-contratos/${res.propostaId}`}
                              className="button-link view-link"
                            >
                              Ver
                            </Link>
                          )}

                          <button
                            className="button danger-button small-button"
                            onClick={() => handleDelete(res._id)}
                            type="button"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Paginação sticky no fim da área de conteúdo */}
        {totalPages > 1 && (
          <div className="pagination-bar">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="page-btn"
              type="button"
            >
              ◀ Anterior
            </button>
            <span className="page-info">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="page-btn"
              type="button"
            >
              Próxima ▶
            </button>
          </div>
        )}
      </div>
      
    </div>
  );
}

export default ReservaListPage;
