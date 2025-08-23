import React, { useCallback, useState } from 'react';
import { toast } from 'react-toastify';

import { uploadArquivoApi, apagarArquivoApi } from '../../api/fileApi';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';

import useFiles from './hooks/useFiles';
import { CATEGORIAS } from './models/categories';

import CategorySidebar from './components/CategorySidebar';
import FileToolbar from './components/FileToolbar';
import FileGrid from './components/FileGrid';

import './DrivePage.css';

export default function DrivePage() {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIAS[0]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Filtros extras (ex.: associations), se um dia precisar:
  const extraFilters = {}; // ex.: { associations: JSON.stringify({ item: 'leadId' }) }

  const { files, loading, refetch } = useFiles({
    categoria: selectedCategory,
    filters: extraFilters,
  });

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

  const handlePickFile = useCallback(
    async (file) => {
      if (!file) return;
      setUploading(true);
      setUploadProgress(0);

      try {
        const metadata = { categoria: selectedCategory }; // sem associação primária na DrivePage
        await uploadArquivoApi(file, metadata, (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / Math.max(progressEvent.total || 1, 1)
          );
          setUploadProgress(percent);
        });
        toast.success('Arquivo enviado com sucesso!');
        refetch();
      } catch (error) {
        toast.error(error?.message || 'Falha no upload.');
      } finally {
        setUploading(false);
      }
    },
    [selectedCategory, refetch]
  );

  return (
    <div className="admin-page drive-page">
      <header className="page-header">
        <h1>Drive da Empresa</h1>
      </header>

      <div className="drive-layout">
        <CategorySidebar
          categorias={CATEGORIAS}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <main className="drive-content">
          <FileToolbar
            title={selectedCategory}
            uploading={uploading}
            uploadProgress={uploadProgress}
            onPickFile={handlePickFile}
          />

          <div className="page-content-drive">
            <FileGrid files={files} loading={loading} onDelete={openDeleteModal} />
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
