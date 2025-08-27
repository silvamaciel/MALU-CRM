// frontend\src\pages\ImovelAvulso\ImovelFormPage\ImovelFormPage.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createImovelApi, getImovelByIdApi, updateImovelApi } from '../../../api/imovelAvulsoApi';
import { getUsuarios } from '../../../api/users';
import './ImovelFormPage.css';

const TIPO_IMOVEL_OPCOES = ['Apartamento', 'Casa', 'Terreno', 'Sala Comercial', 'Loja', 'Galpão', 'Outro'];
const STATUS_IMOVEL_OPCOES = ['Disponível', 'Reservado', 'Vendido', 'Inativo'];

function ImovelFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState({
        titulo: '', descricao: '', tipoImovel: '', status: '',
        quartos: 0, suites: 0, banheiros: 0, vagasGaragem: 0,
        areaTotal: '', preco: '',
        endereco: { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '' },
        construtoraNome: imovelData.construtoraNome || '',
        responsavel: '', fotos: [],
    });

    const [responsaveisList, setResponsaveisList] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const usersResponse = await getUsuarios({ ativo: true });
                setResponsaveisList(usersResponse.users || usersResponse.data || usersResponse || []);

                if (isEditMode) {
                    const imovelData = await getImovelByIdApi(id);
                    setFormData({
                        ...imovelData,
                        responsavel: imovelData.responsavel?._id || imovelData.responsavel || '',
                        endereco: imovelData.endereco || { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '' },
                        fotos: imovelData.fotos || [],
                    });
                } else {
                    setFormData(prev => ({
                        ...prev,
                        tipoImovel: TIPO_IMOVEL_OPCOES[0],
                        status: STATUS_IMOVEL_OPCOES[0],
                    }));
                }
            } catch (err) {
                toast.error("Falha ao carregar dados: " + err.message);
                navigate('/imoveis-avulsos');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, isEditMode, navigate]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
        }));
    };

    const handleEnderecoChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, endereco: { ...prev.endereco, [name]: value } }));
    };

    const handleFotoChange = (index, e) => {
        const { name, value } = e.target;
        const novasFotos = [...formData.fotos];
        novasFotos[index][name] = value;
        setFormData(prev => ({ ...prev, fotos: novasFotos }));
    };

    const handleAddFoto = () => {
        setFormData(prev => ({ ...prev, fotos: [...prev.fotos, { url: '', descricao: '' }] }));
    };

    const handleRemoveFoto = (index) => {
        const novasFotos = [...formData.fotos];
        novasFotos.splice(index, 1);
        setFormData(prev => ({ ...prev, fotos: novasFotos }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const dataToSubmit = {
                ...formData,
                fotos: formData.fotos.filter(foto => foto.url && foto.url.trim() !== '')
            };

            if (isEditMode) {
                await updateImovelApi(id, dataToSubmit);
                toast.success("Imóvel atualizado com sucesso!");
            } else {
                await createImovelApi(dataToSubmit);
                toast.success("Imóvel criado com sucesso!");
            }
            navigate('/imoveis-avulsos');
        } catch (err) {
            toast.error(err.error || err.message || "Falha ao salvar imóvel.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-page imovel-form-page">
            <header className="page-header">
                <h1>{isEditMode ? 'Editar Imóvel Avulso' : 'Novo Imóvel Avulso'}</h1>
            </header>
            <div className="page-content">
                <div className={`form-wrapper ${loading ? 'form-loading' : ''}`}>
                    {loading && (
                        <div className="loading-overlay" role="status" aria-live="polite">
                            <div className="loading-spinner"></div>
                            <p>Carregando Dados...</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="form-container">
                        {/* Informações Principais */}
                        <div className="form-section">
                            <h3>Informações Principais</h3>
                            <div className="form-group full-width"><label>Nome do Imóvel*</label><input type="text" name="titulo" value={formData.titulo} onChange={handleChange} required /></div>
                            <div className="form-group full-width"><label>Construtora*</label><input type="text" name="construtoraNome" value={formData.construtoraNome} onChange={handleChange} required /></div>
                            <div className="form-group full-width"><label>Descrição</label><textarea name="descricao" value={formData.descricao} onChange={handleChange} rows="4"></textarea></div>
                            <div className="form-row">
                                <div className="form-group"><label>Tipo de Imóvel*</label><select name="tipoImovel" value={formData.tipoImovel} onChange={handleChange} required>{TIPO_IMOVEL_OPCOES.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                                <div className="form-group"><label>Status*</label><select name="status" value={formData.status} onChange={handleChange}>{STATUS_IMOVEL_OPCOES.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                                <div className="form-group"><label>Responsável*</label><select name="responsavel" value={formData.responsavel} onChange={handleChange} required><option value="">Selecione...</option>{responsaveisList.map(u => <option key={u._id} value={u._id}>{u.nome}</option>)}</select></div>
                            </div>
                        </div>

                        {/* Características */}
                        <div className="form-section">
                            <h3>Características</h3>
                            <div className="form-row">
                                <div className="form-group"><label>Quartos</label><input type="number" name="quartos" value={formData.quartos} onChange={handleChange} min="0" /></div>
                                <div className="form-group"><label>Suítes</label><input type="number" name="suites" value={formData.suites} onChange={handleChange} min="0" /></div>
                                <div className="form-group"><label>Banheiros</label><input type="number" name="banheiros" value={formData.banheiros} onChange={handleChange} min="0" /></div>
                                <div className="form-group"><label>Vagas de Garagem</label><input type="number" name="vagasGaragem" value={formData.vagasGaragem} onChange={handleChange} min="0" /></div>
                            </div>
                        </div>

                        {/* Valores e Medidas */}
                        <div className="form-section">
                            <h3>Valores e Medidas</h3>
                            <div className="form-row">
                                <div className="form-group"><label>Preço (R$)*</label><input type="number" name="preco" value={formData.preco} onChange={handleChange} required step="0.01" min="0" /></div>
                                <div className="form-group"><label>Área Total (m²)*</label><input type="number" name="areaTotal" value={formData.areaTotal} onChange={handleChange} required step="0.01" min="0" /></div>
                            </div>
                        </div>

                        {/* Endereço */}
                        <div className="form-section">
                            <h3>Endereço</h3>
                            <div className="form-row">
                                <div className="form-group"><label>CEP</label><input type="text" name="cep" value={formData.endereco.cep} onChange={handleEnderecoChange} /></div>
                                <div className="form-group"><label>Logradouro</label><input type="text" name="logradouro" value={formData.endereco.logradouro} onChange={handleEnderecoChange} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Número</label><input type="text" name="numero" value={formData.endereco.numero} onChange={handleEnderecoChange} /></div>
                                <div className="form-group"><label>Complemento</label><input type="text" name="complemento" value={formData.endereco.complemento} onChange={handleEnderecoChange} /></div>
                                <div className="form-group"><label>Bairro</label><input type="text" name="bairro" value={formData.endereco.bairro} onChange={handleEnderecoChange} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Cidade*</label><input type="text" name="cidade" value={formData.endereco.cidade} onChange={handleEnderecoChange} required /></div>
                                <div className="form-group"><label>UF*</label><input type="text" name="uf" value={formData.endereco.uf} onChange={handleEnderecoChange} required maxLength="2" /></div>
                            </div>
                        </div>

                        {/* Fotos */}
                        <div className="form-section">
                            <h3>Fotos</h3>
                            {formData.fotos.map((foto, index) => (
                                <div key={index} className="form-row photo-row">
                                    <div className="form-group" style={{ flexGrow: 2 }}>
                                        <label>URL da Foto</label>
                                        <input type="text" name="url" value={foto.url} onChange={(e) => handleFotoChange(index, e)} />
                                    </div>
                                    <div className="form-group" style={{ flexGrow: 1 }}>
                                        <label>Descrição</label>
                                        <input type="text" name="descricao" value={foto.descricao} onChange={(e) => handleFotoChange(index, e)} />
                                    </div>
                                    <button type="button" onClick={() => handleRemoveFoto(index)} className="button-link delete-link">Remover</button>
                                </div>
                            ))}
                            <button type="button" onClick={handleAddFoto} className="button outline-button">+ Adicionar Foto</button>
                        </div>

                        {/* Ações */}
                        <div className="form-actions">
                            <button type="button" className="button cancel-button" onClick={() => navigate('/imoveis-avulsos')} disabled={loading}>Cancelar</button>
                            <button type="submit" className="button submit-button" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Imóvel'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ImovelFormPage;
