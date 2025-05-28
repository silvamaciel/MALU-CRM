// src/pages/Admin/ModeloContrato/ModeloContratoListPage/ModeloContratoListPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getModelosContrato } from '../../../../api/modeloContratoApi'; // Ajuste o caminho conforme sua estrutura
import { toast } from 'react-toastify';
import './ModeloContratoListPage.css';

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
            const data = await getModelosContrato(currentPage, 10, {}); // Limite 10, sem filtros
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
        navigate('/admin/modelos-contrato/novo'); // Rota para o formulário de criação
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    if (loading) {
        return <div className="admin-page loading"><p>Carregando modelos de contrato...</p></div>;
    }

    return (
        <div className="admin-page modelo-contrato-list-page">
            <header className="page-header">
                <h1>Modelos de Contrato ({totalModelos})</h1>
                <button onClick={handleNewModelo} className="button primary-button">
                    Novo Modelo de Contrato
                </button>
            </header>
            <div className="page-content">
                {error && <p className="error-message" style={{ marginBottom: '1rem' }}>{error}</p>}

                {modelos.length === 0 && !error && (
                    <p>Nenhum modelo de contrato encontrado.</p>
                )}

                {modelos.length > 0 && (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Nome do Modelo</th>
                                    <th>Tipo de Documento</th>
                                    <th>Criado Em</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {modelos.map(modelo => (
                                    <tr key={modelo._id}>
                                        <td>{modelo.nomeModelo}</td>
                                        <td>{modelo.tipoDocumento}</td>
                                        <td>{new Date(modelo.createdAt).toLocaleDateString('pt-BR')}</td>
                                        <td className="actions-cell">
                                            <Link to={`/admin/modelos-contrato/${modelo._id}/editar`} className="button-link edit-link">
                                                Editar
                                            </Link>
                                            {/* Botão Desativar virá aqui */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {/* Paginação */}
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

export default ModeloContratoListPage;