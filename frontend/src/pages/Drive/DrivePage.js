import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { listarArquivosApi, uploadArquivoApi, apagarArquivoApi } from '../../api/fileApi';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import './DrivePage.css';

// Funções auxiliares (podem ser movidas para um ficheiro de utils)
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileIcon = ({ mimetype }) => {
    if (mimetype.startsWith('image/')) return <i className="fas fa-file-image file-icon"></i>;
    if (mimetype === 'application/pdf') return <i className="fas fa-file-pdf file-icon"></i>;
    if (mimetype.startsWith('audio/')) return <i className="fas fa-file-audio file-icon"></i>;
    if (mimetype.startsWith('video/')) return <i className="fas fa-file-video file-icon"></i>;
    return <i className="fas fa-file-alt file-icon"></i>;
};

// Categorias pré-definidas
const CATEGORIAS = [
    'Contratos', 'Documentos Leads', 'Materiais Empreendimentos', 
    'Recibos', 'Identidade Visual', 'Mídia WhatsApp', 'Outros'
];

function DrivePage() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState(CATEGORIAS[0]);
    
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    const fileInputRef = useRef(null);

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        try {
            const filesData = await listarArquivosApi({ categoria: selectedCategory });
            setFiles(filesData || []);
        } catch (error) {
            toast.error(`Erro ao carregar arquivos da categoria ${selectedCategory}.`);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handleFileSelected = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(true);
        setUploadProgress(0);

        try {
            // Para uploads genéricos na DrivePage, não associamos a nenhuma entidade específica,
            // apenas à categoria selecionada.
            const metadata = { categoria: selectedCategory }; 
            await uploadArquivoApi(file, metadata, (progressEvent) => {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percent);
            });
            toast.success("Arquivo enviado com sucesso!");
            fetchFiles();
        } catch (error) {
            toast.error(error.message || "Falha no upload.");
        } finally {
            setUploading(false);
            fileInputRef.current.value = null;
        }
    };
    
    const handleOpenDeleteModal = (file) => {
        setDeleteTarget(file);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleteModalOpen(false);
        try {
            await apagarArquivoApi(deleteTarget._id);
            toast.success("Arquivo apagado com sucesso!");
            fetchFiles();
        } catch (error) {
            toast.error("Falha ao apagar o arquivo.");
        }
    };

    return (
        <div className="admin-page drive-page">
            <header className="page-header">
                <h1>Drive da Empresa</h1>
            </header>
            <div className="drive-layout">
                <aside className="drive-sidebar">
                    <nav>
                        <ul>
                            {CATEGORIAS.map(cat => (
                                <li key={cat}>
                                    <button 
                                        onClick={() => setSelectedCategory(cat)}
                                        className={selectedCategory === cat ? 'active' : ''}
                                    >
                                        {cat}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>

                <main className="drive-content">
                    <div className="drive-content-header">
                        <h2>{selectedCategory}</h2>
                        <button onClick={handleUploadClick} className="button primary-button" disabled={uploading}>
                            {uploading ? `A enviar... ${uploadProgress}%` : `+ Upload em ${selectedCategory}`}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelected} style={{ display: 'none' }} />
                    </div>

                    <div className="page-content-drive">
                        {loading ? <p>A carregar arquivos...</p> : (
                            <div className="files-grid">
                                {files.map(file => (
                                    <div key={file._id} className="file-card">
                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-preview">
                                            {file.mimetype.startsWith('image/') ? (
                                                <img src={file.url} alt={file.nomeOriginal} className="file-thumbnail" />
                                            ) : (
                                                <div className="file-icon-container"><FileIcon mimetype={file.mimetype} /></div>
                                            )}
                                        </a>
                                        <div className="file-info">
                                            <p className="file-name" title={file.nomeOriginal}>{file.nomeOriginal}</p>
                                            <p className="file-meta">{formatFileSize(file.size)}</p>
                                        </div>
                                        <div className="file-actions">
                                            <button onClick={() => handleOpenDeleteModal(file)} className="button-link delete-link-file" title="Excluir Arquivo">&times;</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {(!loading && files.length === 0) && <p className="no-data-message">Nenhum arquivo nesta categoria.</p>}
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
        </div>
    );
}

export default DrivePage;