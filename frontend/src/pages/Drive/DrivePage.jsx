import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import { uploadArquivoApi, apagarArquivoApi } from '../../api/fileApi';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';

import useFiles from './hooks/useFiles';
import { CATEGORIAS } from './models/categories';

import CategorySidebar from './components/CategorySidebar';
import FileToolbar from './components/FileToolbar';
import FileGrid from './components/FileGrid';
import FolderGrid from './components/FolderGrid';
import UploadMetaModal from './components/UploadMetaModal';

import { getEmpreendimentos } from '../../api/empreendimentoApi';
import { getLeads } from '../../api/leads';

import PreviewModal from './components/PreviewModal';


import './DrivePage.css';

const SUBFOLDERS_BY_CATEGORY = {
  'Materiais Empreendimentos': ['Imagens', 'Plantas'],
  'Documentos Leads': ['Documentos'],
};

const CATEGORY_ASSOC = {
  'Materiais Empreendimentos': { kind: 'Empreendimento', label: 'Empreendimento' },
  'Documentos Leads': { kind: 'Lead', label: 'Lead' },
};

export default function DrivePage() {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIAS[0]); // comece onde preferir
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Modal de metadados pós-file-picker
  const [isMetaOpen, setIsMetaOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);

  // “Pastas”: association (Empreendimento/Lead) e subpasta (Imagens/Plantas/Documentos)
  const [activeFolder, setActiveFolder] = useState(null); // { _id, nome }
  const [activeSubfolder, setActiveSubfolder] = useState(null); // string

  // Listas para o nível 1 (pastas)
  const [empItems, setEmpItems] = useState([]);
  const [leadItems, setLeadItems] = useState([]);

  // constr para preview
  const [previewFile, setPreviewFile] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);


  const openPreview = useCallback((file) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
  }, []);
  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewFile(null);
  }, []);


  // Deriva filtros para a API (sem setState!)
  const apiFilters = useMemo(() => {
    const f = {};
    if (activeFolder) f.associations = JSON.stringify({ item: activeFolder._id });
    if (activeSubfolder) f.pasta = activeSubfolder; // backend deve ter 'pasta'
    return f;
  }, [activeFolder, activeSubfolder]);

  const { files, loading, refetch } = useFiles({
    categoria: selectedCategory,
    filters: apiFilters,
  });

  // Fallback client-side se backend ainda não filtra 'pasta' ou 'associations'
  const visibleFiles = useMemo(() => {
    let arr = Array.isArray(files) ? files : [];
    if (activeFolder) {
      const id = String(activeFolder._id);
      arr = arr.filter(
        (f) => Array.isArray(f.associations) && f.associations.some((a) => String(a.item) === id)
      );
    }
    if (activeSubfolder) {
      arr = arr.filter((f) => (f.pasta || '').toLowerCase() === activeSubfolder.toLowerCase());
    }
    return arr;
  }, [files, activeFolder, activeSubfolder]);

  // Buscar pastas (nível 1) apenas quando necessário
  useEffect(() => {
    setActiveFolder(null);
    setActiveSubfolder(null);

    if (selectedCategory === 'Materiais Empreendimentos') {
      let cancelled = false;
      (async () => {
        try {
          const resp = await getEmpreendimentos(1, 100, {});
          const rows = resp?.data || resp?.empreendimentos || resp?.rows || [];
          if (!cancelled) setEmpItems(rows);
        } catch {
          if (!cancelled) setEmpItems([]);
        }
      })();
      return () => { cancelled = true; };
    }

    if (selectedCategory === 'Documentos Leads') {
      let cancelled = false;
      (async () => {
        try {
          const resp = await getLeads({ page: 1, limit: 100 });
          const rows = resp?.data || resp?.leads || resp || [];
          if (!cancelled) setLeadItems(rows);
        } catch {
          if (!cancelled) setLeadItems([]);
        }
      })();
      return () => { cancelled = true; };
    }
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

  const requiresMeta = (cat) =>
    cat === 'Materiais Empreendimentos' ||
    cat === 'Documentos Leads' ||
    cat === 'Contratos' ||
    cat === 'Recibos';

  // Recebe o arquivo do FileToolbar
  const handlePickFile = useCallback(
    async (file) => {
      if (!file) return;

      // Se categoria exigir metadados, abre modal e guarda o file
      if (requiresMeta(selectedCategory)) {
        setPendingFile(file);
        setIsMetaOpen(true);
        return;
      }

      // Upload direto
      setUploading(true);
      setUploadProgress(0);
      try {
        const metadata = { categoria: selectedCategory };
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

  const handleMetaConfirm = async (metadata) => {
    if (!pendingFile) {
      setIsMetaOpen(false);
      return;
    }
    setIsMetaOpen(false);
    setUploading(true);
    setUploadProgress(0);
    try {
      await uploadArquivoApi(pendingFile, metadata, (progressEvent) => {
        const percent = Math.round(
          (progressEvent.loaded * 100) / Math.max(progressEvent.total || 1, 1)
        );
        setUploadProgress(percent);
      });
      toast.success('Arquivo enviado com sucesso!');
      setPendingFile(null);
      refetch();
      // Se o upload foi para a pasta atual, já está filtrado; se não, o usuário verá quando entrar lá.
    } catch (error) {
      toast.error(error?.message || 'Falha no upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleMetaCancel = () => {
    setIsMetaOpen(false);
    setPendingFile(null);
  };

  // Navegação “pastas”
  const isCategoryEmp = selectedCategory === 'Materiais Empreendimentos';
  const isCategoryLead = selectedCategory === 'Documentos Leads';
  const subfolders = SUBFOLDERS_BY_CATEGORY[selectedCategory] || [];

  const titlePath = useMemo(() => {
    let t = selectedCategory;
    if (activeFolder) t += ` / ${activeFolder.nome}`;
    if (activeSubfolder) t += ` / ${activeSubfolder}`;
    return t;
  }, [selectedCategory, activeFolder, activeSubfolder]);

  // Itens de subpasta como “pastas”
  const subfolderItems = useMemo(
    () => subfolders.map((name) => ({ _id: name, nome: name })),
    [subfolders]
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
          onSelect={(cat) => {
            setSelectedCategory(cat);
            // reset navegação ao trocar de categoria
            setActiveFolder(null);
            setActiveSubfolder(null);
          }}
        />

        <main className="drive-content">
          <FileToolbar
            title={titlePath}
            uploading={uploading}
            uploadProgress={uploadProgress}
            onPickFile={handlePickFile}
          />

          <div className="page-content-drive">
            {/* Nível 1: lista de “pastas” por Emp/Lead */}
            {isCategoryEmp && !activeFolder && (
              <FolderGrid
                items={empItems}
                onOpen={(it) =>
                  setActiveFolder({
                    _id: it._id,
                    nome: it.nome || it.nomeEmpreendimento || it.titulo || it._id,
                  })
                }
              />
            )}

            {isCategoryLead && !activeFolder && (
              <FolderGrid
                items={leadItems.map((l) => ({
                  _id: l._id,
                  nome: l.nome || l.name || l.phone || l._id,
                }))}
                onOpen={(it) => setActiveFolder({ _id: it._id, nome: it.nome })}
              />
            )}

            {/* Nível 2: subpastas (quando houver) */}
            {(isCategoryEmp || isCategoryLead) &&
              activeFolder &&
              !activeSubfolder &&
              subfolderItems.length > 0 && (
                <FolderGrid
                  items={subfolderItems}
                  onOpen={(it) => setActiveSubfolder(it._id)}
                />
              )}

            {/* Nível final: arquivos da pasta selecionada */}
            {(!isCategoryEmp && !isCategoryLead) ||
              (activeFolder && (subfolderItems.length === 0 || activeSubfolder)) ? (
              <FileGrid files={files} loading={loading} onDelete={openDeleteModal} onPreview={openPreview} />
            ) : null}
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

      {/* Modal só abre quando a categoria precisa de metadados */}
      <UploadMetaModal
        open={isMetaOpen}
        categoria={selectedCategory}
        onCancel={handleMetaCancel}
        onConfirm={handleMetaConfirm}
      />


      <PreviewModal open={isPreviewOpen} file={previewFile} onClose={closePreview} />

    </div>


  );
}
