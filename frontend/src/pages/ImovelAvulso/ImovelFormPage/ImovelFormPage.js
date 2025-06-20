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
        titulo: '', descricao: '', tipoImovel: TIPO_IMOVEL_OPCOES[0], status: STATUS_IMOVEL_OPCOES[0],
        quartos: 0, suites: 0, banheiros: 0, vagasGaragem: 0, areaTotal: '', preco: '',
        endereco: { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '' },
        responsavel: '',
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
                        responsavel: imovelData.responsavel?._id || imovelData.responsavel,
                        endereco: imovelData.endereco || {},
                    });
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
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEnderecoChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, endereco: { ...prev.endereco, [name]: value } }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditMode) {
                await updateImovelApi(id, formData);
                toast.success("Imóvel atualizado com sucesso!");
            } else {
                await createImovelApi(formData);
                toast.success("Imóvel criado com sucesso!");
            }
            navigate('/imoveis-avulsos');
        } catch (err) {
            toast.error(err.error || err.message || "Falha ao salvar imóvel.");
        } finally {
            setLoading(false);
        }
    };
    
    if (loading && !formData.titulo) return <div className="admin-page loading"><p>Carregando formulário...</p></div>

    return (
        <div className="admin-page imovel-form-page">
            <header className="page-header">
                <h1>{isEditMode ? 'Editar Imóvel Avulso' : 'Novo Imóvel Avulso'}</h1>
            </header>
            <div className="page-content">
                <form onSubmit={handleSubmit} className="form-container">
                    <div className="form-section">
                        <h3>Informações Principais</h3>
                        <div className="form-group full-width"><label>Título do Anúncio*</label><input type="text" name="titulo" value={formData.titulo} onChange={handleChange} required/></div>
                        <div className="form-group full-width"><label>Descrição</label><textarea name="descricao" value={formData.descricao} onChange={handleChange} rows="4"></textarea></div>
                        <div className="form-row">
                            <div className="form-group"><label>Tipo de Imóvel*</label><select name="tipoImovel" value={formData.tipoImovel} onChange={handleChange}>{TIPO_IMOVEL_OPCOES.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                            <div className="form-group"><label>Status*</label><select name="status" value={formData.status} onChange={handleChange}>{STATUS_IMOVEL_OPCOES.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                            <div className="form-group"><label>Responsável*</label><select name="responsavel" value={formData.responsavel} onChange={handleChange} required>{responsaveisList.map(u=><option key={u._id} value={u._id}>{u.nome}</option>)}</select></div>
                        </div>
                    </div>
                    {/* Repita para outras seções: Características, Preço, Endereço */}
                    <div className="form-actions">
                        <button type="button" className="button cancel-button" onClick={() => navigate('/imoveis-avulsos')}>Cancelar</button>
                        <button type="submit" className="button submit-button" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Imóvel'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
export default ImovelFormPage;