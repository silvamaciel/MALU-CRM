import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { toast } from 'react-toastify';


import { uploadArquivoApi, apagarArquivoApi } from '../../api/fileApi';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';


import useFiles from './hooks/useFiles';
import { CATEGORIAS, CATEGORY_META } from './models/categories';


import CategorySidebar from './components/CategorySidebar';
import FileGrid from './components/FileGrid';
import FolderGrid from './components/FolderGrid';
import UploadModal from './components/UploadModal';


import { getEmpreendimentos } from '../../api/empreendimentoApi';


import './DrivePage.css';


export default function DrivePage() {
    const [selectedCategory, setSelectedCategory] = useState(CATEGORIAS[2]); // default pode ser a 0; aqui uso "Materiais Empreendimentos"
    const categoryMeta = useMemo(() => CATEGORY_META[selectedCategory] || {}, [selectedCategory]);


    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);


    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);


    // Pasta/associação "ativa" quando o usuário abre uma "pasta de Empreendimento"
    const [activeFolder, setActiveFolder] = useState(null); // { _id, nome }


    // Filtros extras enviados à API (associations, pasta)
    const [extraFilters, setExtraFilters] = useState({});


    // Lista de empreendimentos para a tela de pastas
    const [empFolderItems, setEmpFolderItems] = useState([]);


    // Atualiza filtros quando muda categoria ou sai/entra em pasta
    useEffect(() => {
        if (selectedCategory !== 'Materiais Empreendimentos') {
            setActiveFolder(null);
            setExtraFilters({});
            return;
        }
        // Em Materiais Empreendimentos, quando não há pasta ativa, não filtramos por association
        if (!activeFolder) {
            setExtraFilters({});
        } else {
            setExtraFilters({ associations: JSON.stringify({ item: activeFolder._id }) });
        }
    }, [selectedCategory, activeFolder]);


    const { files, loading, refetch } = useFiles({
        categoria: selectedCategory,
        filters: extraFilters,
    });

    // Carrega empreendimentos quando estamos na categoria de Materiais Empreendimentos
    useEffect(() => {
        if (selectedCategory !== 'Materiais Empreendimentos') return;
        (async () => {
            try {
                const resp = await getEmpreendimentos(1, 200, {});
                const rows = resp?.data || resp?.empreendimentos || resp?.rows || [];
                setEmpFolderItems(rows);
            } catch (e) {
                setEmpFolderItems([]);
            }
        })();
    }, [selectedCategory]);


    const openDeleteModal = useCallback((file) => {
        setDeleteTarget(file);
        setIsDeleteModalOpen(true);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (!deleteTarget) return;
        setIsDeleteModalOpen(false);
        try {
            await apagarArquivoApi(deleteTarget._id);
            toast.success('Arquivo apagado com sucesso!');
            refetch();
        } catch (error) {
            toast.error('Falha ao apagar o arquivo.');
        }
    }, [deleteTarget, refetch]);


    const handleOpenUpload = useCallback(() => {
        setIsUploadModalOpen(true);
    }, []);

    const handleSubmitUpload = useCallback(
        async (file, metadata) => {
            if (!file) return;
            setUploading(true);
            setUploadProgress(0);
            try {
                await uploadArquivoApi(file, metadata, (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / Math.max(progressEvent.total || 1, 1));
                    setUploadProgress(percent);
                });
                toast.success('Arquivo enviado com sucesso!');
                setIsUploadModalOpen(false);
                // Se o usuário fez upload dentro de uma pasta de empreendimento, já há filtro por association
                refetch();
            } catch (error) {
                toast.error(error?.message || 'Falha no upload.');
            } finally {
                setUploading(false);
            }
        },
        [refetch]
    );


    // Association predefinida se estivermos dentro de uma pasta de Empreendimento
    const presetAssociation = useMemo(() => {
        if (selectedCategory === 'Materiais Empreendimentos' && activeFolder) {
            return { kind: 'Empreendimento', item: activeFolder._id, label: activeFolder.nome };
        }
        return undefined;
    }, [selectedCategory, activeFolder]);


    return (
        <div className="admin-page drive-page">
            <header className="page-header">
                <h1>Drive da Empresa</h1>
                <div style={{ marginLeft: 'auto' }}>
                    <button className="button primary-button" onClick={handleOpenUpload} disabled={uploading}>
                        {uploading ? `A enviar... ${uploadProgress}%` : `+ Upload em ${selectedCategory}`}
                    </button>
                </div>
            </header>


            <div className="drive-layout">
                <CategorySidebar
                    categorias={CATEGORIAS}
                    selected={selectedCategory}
                    onSelect={(cat) => {
                        setSelectedCategory(cat);
                        setActiveFolder(null);
                    }}
                />

                <main className="drive-content">
                    <div className="drive-content-header">
                        <h2>
                            {selectedCategory}
                            {activeFolder ? ` / ${activeFolder.nome}` : ''}
                        </h2>
                        {selectedCategory === 'Materiais Empreendimentos' && activeFolder && (
                            <button className="button" onClick={() => setActiveFolder(null)}>
                                ← Voltar para Empreendimentos
                            </button>
                        )}
                    </div>


                    <div className="page-content-drive">
                        {selectedCategory === 'Materiais Empreendimentos' && !activeFolder ? (
                            <FolderGrid
                                items={empFolderItems}
                                onOpen={(it) => setActiveFolder({ _id: it._id, nome: it.nome || it.nomeEmpreendimento || it.titulo || it._id })}
                            />
                        ) : (
                            <FileGrid files={files} loading={loading} onDelete={openDeleteModal} />
                        )}
                    </div>
                </main>
            </div>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Exclusão"
                message={`Tem certeza que deseja apagar o arquivo "${deleteTarget?.nomeOriginal}"?`}
                confirmButtonClass="confirm-button-delete"
            />


            <UploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSubmit={handleSubmitUpload}
                categoria={selectedCategory}
                categoryMeta={categoryMeta}
                presetAssociation={presetAssociation}
            />
        </div>
    );
}