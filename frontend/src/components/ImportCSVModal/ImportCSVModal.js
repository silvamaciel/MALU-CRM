// Crie: src/components/ImportCSVModal/ImportCSVModal.js
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse'; // Para parsing do CSV no frontend
import { toast } from 'react-toastify';
import { importLeadsFromCSVApi } from '../../api/leads';
import './ImportCSVModal.css';

function ImportCSVModal({ isOpen, onClose, onImportSuccess }) {
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [error, setError] = useState('');

    const resetState = () => {
        setFile(null);
        setPreviewData([]);
        setHeaders([]);
        setIsUploading(false);
        setImportResult(null);
        setError('');
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const onDrop = useCallback(acceptedFiles => {
        const selectedFile = acceptedFiles[0];
        if (selectedFile && selectedFile.type === 'text/csv') {
            setFile(selectedFile);
            setError('');
            // Gera preview dos primeiros 5 registros
            Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                preview: 5,
                complete: (results) => {
                    setHeaders(results.meta.fields || []);
                    setPreviewData(results.data);
                }
            });
        } else {
            setError('Por favor, selecione um arquivo .csv válido.');
            setFile(null);
            setPreviewData([]);
            setHeaders([]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        multiple: false
    });
    
    const handleConfirmImport = async () => {
        if (!file) return;
        setIsUploading(true);
        setImportResult(null);
        setError('');
        toast.info("Iniciando importação... Isso pode levar alguns momentos.");

        try {
            const result = await importLeadsFromCSVApi(file);
            setImportResult(result);
            toast.success(`${result.importedCount} de ${result.totalRows} leads importados com sucesso!`);
            onImportSuccess(); // Chama o callback para atualizar a lista de leads
        } catch (err) {
            const errorMsg = err.error || err.message || "Ocorreu um erro inesperado.";
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="form-modal-overlay" onClick={handleClose}>
            <div className="form-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                <h2>Importar Leads via CSV</h2>
                
                {/* Seção de Resultado */}
                {importResult ? (
                    <div className="import-result-section">
                        <h4>Resumo da Importação</h4>
                        <p><strong>Total de Linhas Processadas:</strong> {importResult.totalRows}</p>
                        <p style={{color: 'green'}}><strong>Leads Importados com Sucesso:</strong> {importResult.importedCount}</p>
                        <p style={{color: 'red'}}><strong>Linhas com Erros:</strong> {importResult.errorCount}</p>
                        {importResult.errorCount > 0 && (
                            <div className="error-details">
                                <h5>Detalhes dos Erros:</h5>
                                <ul>
                                    {importResult.errors.slice(0, 10).map((err, i) => (
                                        <li key={i}>Linha {err.line}: {err.error}</li>
                                    ))}
                                    {importResult.errorCount > 10 && <li>E mais {importResult.errorCount - 10} erros...</li>}
                                </ul>
                            </div>
                        )}
                        <div className="form-actions">
                            <button onClick={resetState} className="button primary-button">Importar Novo Arquivo</button>
                            <button onClick={handleClose} className="button cancel-button">Fechar</button>
                        </div>
                    </div>
                ) : (
                <>
                    {/* Seção de Upload e Preview */}
                    <div {...getRootProps({ className: `dropzone ${isDragActive ? 'active' : ''}` })}>
                        <input {...getInputProps()} />
                        {file ? (
                            <p>Arquivo selecionado: <strong>{file.name}</strong>. Arraste outro arquivo ou clique para substituir.</p>
                        ) : (
                            <p>Arraste e solte um arquivo .csv aqui, ou clique para selecionar.</p>
                        )}
                    </div>

                    {error && <p className="error-message" style={{marginTop: '15px'}}>{error}</p>}

                    {previewData.length > 0 && (
                        <div className="preview-section">
                            <h4>Pré-visualização (primeiras 5 linhas)</h4>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            {headers.map(h => <th key={h}>{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.map((row, i) => (
                                            <tr key={i}>
                                                {headers.map(h => <td key={`${h}-${i}`}>{row[h]}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    
                    <div className="form-actions">
                        <button onClick={handleClose} className="button cancel-button" disabled={isUploading}>Cancelar</button>
                        <button onClick={handleConfirmImport} className="button submit-button" disabled={!file || isUploading}>
                            {isUploading ? 'Importando...' : 'Confirmar Importação'}
                        </button>
                    </div>
                </>
                )}
            </div>
        </div>
    );
}

export default ImportCSVModal;