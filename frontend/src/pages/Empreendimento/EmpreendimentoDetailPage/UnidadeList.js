// src/pages/Empreendimento/EmpreendimentoDetailPage/UnidadeList.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getUnidades } from '../../../api/unidadeApi'; 
import { toast } from 'react-toastify';

function UnidadeList({ empreendimentoId, empreendimentoNome }) { // Recebe o ID do empreendimento como prop
    const [unidades, setUnidades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUnidades, setTotalUnidades] = useState(0);

    const navigate = useNavigate();

    const fetchUnidades = useCallback(async (currentPage = 1) => {
        if (!empreendimentoId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getUnidades(empreendimentoId, currentPage, 10, {}); // Limite 10, sem filtros
            setUnidades(data.unidades || []);
            setTotalPages(data.pages || 1);
            setTotalUnidades(data.total || 0);
            setPage(data.page || currentPage);
        } catch (err) {
            const errMsg = err.error || err.message || "Erro ao carregar unidades.";
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setLoading(false);
        }
    }, [empreendimentoId]);

    useEffect(() => {
        fetchUnidades(page);
    }, [fetchUnidades, page]);

    if (loading) {
        return <p>Carregando unidades...</p>;
    }

    return (
        <div className="unidades-list-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3>Unidades Cadastradas ({totalUnidades})</h3>
                <button 
                    onClick={() => navigate(`/empreendimentos/${empreendimentoId}/unidades/novo`)} 
                    className="button primary-button"
                >
                    Adicionar Nova Unidade
                </button>
            </div>

            {error && <p className="error-message">{error}</p>}

            {unidades.length === 0 && !error && (
                <p>Nenhuma unidade cadastrada para este empreendimento.</p>
            )}

            {unidades.length > 0 && (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Identificador</th>
                            <th>Tipologia</th>
                            <th>Status</th>
                            <th>Preço</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {unidades.map(un => (
                            <tr key={un._id}>
                                <td>{un.identificador}</td>
                                <td>{un.tipologia || 'N/A'}</td>
                                <td>
                                    <span className={`status-badge status-${String(un.statusUnidade).toLowerCase().replace(/\s+/g, '-')}`}>
                                        {un.statusUnidade}
                                    </span>
                                </td>
                                <td>{un.precoTabela ? `R$ ${un.precoTabela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</td>
                                <td className="actions-cell">
                                    <Link to={`/empreendimentos/<span class="math-inline">\{empreendimentoId\}/unidades/</span>{un._id}/editar`} className="button-link edit-link">Editar</Link>
                                    {/* Botão Reservar/Vender virá aqui no futuro, ligado ao Lead */}
                                    {/* Botão Desativar virá aqui */}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {/* TODO: Paginação para unidades */}
        </div>
    );
}

export default UnidadeList;