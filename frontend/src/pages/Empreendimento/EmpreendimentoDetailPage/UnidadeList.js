import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUnidades } from '../../../api/unidadeApi';
import { toast } from 'react-toastify';
import './UnidadeList.css';

function UnidadeList({ empreendimentoId, empreendimentoNome }) {
    const [unidades, setUnidades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUnidades, setTotalUnidades] = useState(0);

    const navigate = useNavigate();
    const limit = 10;

    const fetchUnidades = useCallback(async (currentPage = 1) => {
        if (!empreendimentoId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getUnidades(empreendimentoId, currentPage, limit, {});
            setUnidades(data.unidades || []);
            setTotalPages(data.pages || 1);
            setTotalUnidades(data.total || 0);
            setPage(data.page || currentPage);
        } catch (err) {
            const errMsg = err.error || err.message || 'Erro ao carregar unidades.';
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setLoading(false);
        }
    }, [empreendimentoId]);

    useEffect(() => {
        fetchUnidades(page);
    }, [fetchUnidades, page]);

    const startIdx = totalUnidades === 0 ? 0 : (page - 1) * limit + 1;
    const endIdx = Math.min(page * limit, totalUnidades);

    const goToPage = (p) => {
        if (p >= 1 && p <= totalPages && p !== page) setPage(p);
    };

    const pagesToShow = () => {
        const windowSize = 5;
        if (totalPages <= windowSize) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        let start = Math.max(1, page - 2);
        let end = Math.min(totalPages, start + windowSize - 1);
        if (end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    };

    if (loading) return <p>Carregando unidades...</p>;


    return (
        <div className="unidades-list-section modal-fit">
            <div className="units-toolbar">
                <h3 className="units-title">
                    Unidades Cadastradas <span className="units-total">({totalUnidades})</span>
                </h3>
                <button
                    onClick={() => navigate(`/empreendimentos/${empreendimentoId}/unidades/novo`)}
                    className="button primary-button small-button"
                >
                    + Adicionar Unidade
                </button>
            </div>

            {error && <p className="error-message">{error}</p>}
            {unidades.length === 0 && !error && (
                <p>Nenhuma unidade cadastrada para este empreendimento.</p>
            )}

            {unidades.length > 0 && (
                <div className="units-scroll" role="region" aria-label="Tabela de unidades com rolagem">
                    <div className="table-responsive">
                        <table className="data-table units-table">
                            <thead>
                                <tr>
                                    <th>Identificador</th>
                                    <th>Tipologia</th>
                                    <th>Status</th>
                                    <th>Preço</th>
                                    <th className="th-acoes">Ações</th>
                                </tr>
                            </thead>

                            <tbody>
                                {unidades.map((un) => (
                                    <tr key={un._id}>
                                        <td className="td-identificador">{un.identificador}</td>
                                        <td>{un.tipologia || 'N/A'}</td>
                                        <td>
                                            <span
                                                className={`status-badge status-${String(un.statusUnidade)
                                                    .toLowerCase()
                                                    .replace(/\s+/g, '-')}`}
                                            >
                                                {un.statusUnidade}
                                            </span>
                                        </td>
                                        <td>
                                            {un.precoTabela
                                                ? `R$ ${Number(un.precoTabela).toLocaleString('pt-BR', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}`
                                                : 'N/A'}
                                        </td>
                                        <td className="actions-cell">
                                            <Link
                                                to={`/empreendimentos/${empreendimentoId}/unidades/${un._id}/editar`}
                                                className="button-link edit-link"
                                            >
                                                Editar
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="units-pagination sticky-footer">
                            <div className="pagination-left">
                                <span className="pagination-range">
                                    Mostrando <strong>{startIdx}</strong>–<strong>{endIdx}</strong> de{' '}
                                    <strong>{totalUnidades}</strong>
                                </span>
                            </div>

                            <div className="pagination-right">
                                <button
                                    className="page-btn"
                                    onClick={() => goToPage(1)}
                                    disabled={page === 1}
                                    aria-label="Primeira página"
                                >
                                    «
                                </button>
                                <button
                                    className="page-btn"
                                    onClick={() => goToPage(page - 1)}
                                    disabled={page === 1}
                                    aria-label="Página anterior"
                                >
                                    ‹
                                </button>

                                {pagesToShow().map((pn) => (
                                    <button
                                        key={pn}
                                        className={`page-btn ${page === pn ? 'is-active' : ''}`}
                                        onClick={() => goToPage(pn)}
                                        aria-current={page === pn ? 'page' : undefined}
                                    >
                                        {pn}
                                    </button>
                                ))}

                                <button
                                    className="page-btn"
                                    onClick={() => goToPage(page + 1)}
                                    disabled={page === totalPages}
                                    aria-label="Próxima página"
                                >
                                    ›
                                </button>
                                <button
                                    className="page-btn"
                                    onClick={() => goToPage(totalPages)}
                                    disabled={page === totalPages}
                                    aria-label="Última página"
                                >
                                    »
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

    export default UnidadeList;
