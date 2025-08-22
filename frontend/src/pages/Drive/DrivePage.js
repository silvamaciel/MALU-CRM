import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { listarArquivosApi, uploadArquivoApi, apagarArquivoApi } from '../../api/fileApi';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import './DrivePage.css';

// Função auxiliar para formatar o tamanho do ficheiro
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Ícone genérico para diferentes tipos de ficheiro
const FileIcon = ({ mimetype }) => {
    if (mimetype.startsWith('image/')) return <i className="fas fa-file-image file-icon"></i>;
    if (mimetype === 'application/pdf') return <i className="fas fa-file-pdf file-icon"></i>;
    if (mimetype.startsWith('audio/')) return <i className="fas fa-file-audio file-icon"></i>;
    return <i className="fas fa-file-alt file-icon"></i>;
};

function DrivePage() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    const fileInputRef = useRef(null);

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        try {
            const filesData = await listarArquivosApi();
            setFiles(filesData || []);
        } catch (error) {
            toast.error("Erro ao carregar arquivos.");
        } finally {
            setLoading(false);
        }
    }, []);

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

        const onUploadProgress = (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
        };

        try {
            // Para uploads genéricos, usamos a categoria 'Outros'
            const metadata = { categoria: 'Outros' };
            await uploadArquivoApi(file, metadata, onUploadProgress);
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
        try {
            await apagarArquivoApi(deleteTarget._id);
            toast.success("Arquivo apagado com sucesso!");
            fetchFiles();
        } catch (error) {
            toast.error("Falha ao apagar o arquivo.");
        } finally {
            setIsDeleteModalOpen(false);
        }
    };

    return (
        <div className="admin-page drive-page">
            <header className="page-header">
                <h1>Drive da Empresa</h1>
                <button onClick={handleUploadClick} className="button primary-button" disabled={uploading}>
                    {uploading ? `A enviar... ${uploadProgress}%` : 'Upload de Arquivo'}
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileSelected} style={{ display: 'none' }} />
            </header>
            <div className="page-content">
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
                                    <button onClick={() => handleOpenDeleteModal(file)} className="button-link delete-link-file">&times;</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {(!loading && files.length === 0) && <p className="no-data-message">Nenhum arquivo encontrado. Clique em "Upload" para começar.</p>}
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