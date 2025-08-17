import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getModelosContrato } from "../../../../api/modeloContratoApi";
import { toast } from "react-toastify";
import "./ModeloContratoListPage.css";

function ModeloContratoListPage() {
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalModelos, setTotalModelos] = useState(0);

  const navigate = useNavigate();

  const fetchModelosContrato = useCallback(async (currentPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getModelosContrato(currentPage, 10, {});
      setModelos(data.modelos || []);
      setTotalPages(data.pages || 1);
      setTotalModelos(data.total || 0);
      setPage(data.page || currentPage);
    } catch (err) {
      const errMsg = err.error || err.message || "Erro ao carregar modelos de contrato.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModelosContrato(page);
  }, [fetchModelosContrato, page]);

  const handleNewModelo = () => {
    navigate("/admin/modelos-contrato/novo");
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  if (loading) {
    return (
      <div className="mc-page">
        <div className="mc-page-inner">
          <p>Carregando modelos de contrato...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mc-page">
      <div className="mc-page-inner">
        <header className="mc-header">
          <h1>Modelos de Contrato ({totalModelos})</h1>
          <button onClick={handleNewModelo} className="mc-btn-primary">
            Novo Modelo de Contrato
          </button>
        </header>

        {error && <p className="mc-error-message">{error}</p>}

        <div className="mc-table-scroller">
          {modelos.length === 0 && !error && <p>Nenhum modelo de contrato encontrado.</p>}

          {modelos.length > 0 && (
            <div className="mc-table-wrap">
              <table className="mc-data-table">
                <thead>
                  <tr>
                    <th className="col-nome">Nome do Modelo</th>
                    <th className="col-tipo">Tipo de Documento</th>
                    <th className="col-criado">Criado Em</th>
                    <th className="col-acoes" style={{ width: 200, textAlign: "right" }}>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {modelos.map((modelo) => (
                    <tr key={modelo._id}>
                      <td className="mc-cell-strong col-nome">{modelo.nomeModelo}</td>
                      <td className="col-tipo">{modelo.tipoDocumento}</td>
                      <td className="col-criado">
                        {modelo.createdAt
                          ? new Date(modelo.createdAt).toLocaleDateString("pt-BR")
                          : "-"}
                      </td>
                      <td className="mc-cell-actions col-acoes">
                        <Link
                          to={`/admin/modelos-contrato/${modelo._id}/editar`}
                          className="mc-link-ghost"
                        >
                          Editar
                        </Link>
                        {/* Ex.: <button className="mc-btn-outline">Desativar</button> */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mc-pagination">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="mc-btn-outline"
            >
              Anterior
            </button>
            <span className="mc-page-indicator">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="mc-btn-outline"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ModeloContratoListPage;
