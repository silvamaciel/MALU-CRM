import React, { useState, useEffect, useCallback } from 'react';
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
    // Adicionar states para filtros e paginação no futuro

    const [filters, setFilters] = useState({}); // <<< NOVO ESTADO PARA FILTROS
    const [showFilters, setShowFilters] = useState(false);
    
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
            setError(err.message || "Falha ao carregar imóveis.");
            toast.error(err.message || "Falha ao carregar imóveis.");
        } finally {
            setLoading(false);
        }
    }, []);


     useEffect(() => {
        fetchImoveis(filters);
    }, [filters, fetchImoveis]);

    const handleFilterChange = useCallback((newFilters) => {
        setFilters(newFilters);
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
            fetchImoveis(); // Atualiza a lista
        } catch (err) {
            toast.error(err.error || err.message || "Falha ao excluir imóvel.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) return <div className="admin-page loading"><p>Carregando imóveis...</p></div>;

    return (
        <div className="admin-page imovel-list-page">
            <header className="page-header">
                <h1>Imóveis Avulsos</h1>
                <div className="header-actions">
                    <button onClick={() => setShowFilters(prev => !prev)} className="button outline-button">
                        Filtros {showFilters ? '▲' : '▼'}
                    </button>
                    <Link to="/imoveis-avulsos/novo" className="button primary-button">+ Adicionar Imóvel</Link>
                </div>
                
            </header>
            <div className="page-content">

                <div className={`filters-wrapper ${showFilters ? 'open' : 'closed'}`}>
                    <ImovelFilters
                        onFilterChange={handleFilterChange}
                        isProcessing={loading}
                    />
                </div>


                {error && <p className="error-message">{error}</p>}
                
                                
                <div className="table-responsive">
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
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {imoveis.length > 0 ? imoveis.map(imovel => (
                                <tr key={imovel._id}>
                                    <td>{imovel.titulo}</td>
                                    <td>{imovel.tipoImovel}</td>
                                    <td>{imovel.endereco?.cidade}, {imovel.endereco?.bairro}</td>
                                    <td>{imovel.quartos}</td>
                                    <td>{imovel.vagasGaragem}</td>
                                    <td>{formatCurrency(imovel.preco)}</td>
                                    <td><span className={`status-badge status-${imovel.status.toLowerCase()}`}>{imovel.status}</span></td>
                                    <td className="actions-cell">
                                        <button onClick={() => navigate(`/imoveis-avulsos/${imovel._id}/editar`)} className="button-link edit-link">Editar</button>
                                        <button onClick={() => handleOpenDeleteModal(imovel)} className="button-link delete-link">Excluir</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="8">Nenhum imóvel avulso encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
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