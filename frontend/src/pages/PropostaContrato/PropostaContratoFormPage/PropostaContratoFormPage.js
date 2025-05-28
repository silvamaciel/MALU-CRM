// src/pages/PropostaContrato/PropostaContratoFormPage/PropostaContratoFormPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
// APIs que precisaremos:
// import { getReservaByIdApi } from '../../../api/reservaApi'; // Para buscar dados da reserva, lead, unidade, emp.
// import { getModelosContrato } from '../../../api/modeloContratoApi'; // Para listar modelos de contrato
// import { createPropostaContratoApi } from '../../../api/propostaContratoApi'; // Criaremos esta API
// import './PropostaContratoFormPage.css'; // Crie este CSS depois

// Exemplo de como buscar dados da reserva e modelos (precisará criar getReservaByIdApi)
// const mockGetReservaByIdApi = async (reservaId) => {
//     console.log("API MOCK: Buscando reserva com ID:", reservaId);
//     // Simula o retorno da API com dados populados
//     return {
//         _id: reservaId,
//         lead: { _id: "lead123", nome: "Lead Exemplo da Reserva", email: "lead@example.com", contato: "+5500988887777", cpf: "111.222.333-44", endereco: "Rua do Lead, 123", estadoCivil: "Solteiro(a)", profissao: "Engenheiro(a)", nacionalidade: "Brasileiro(a)" },
//         unidade: { _id: "unidade123", identificador: "Apto 101", tipologia: "2Q Suíte", areaUtil: 70, precoTabela: 300000 },
//         empreendimento: { _id: "emp123", nome: "Residencial Flores", localizacao: {cidade: "João Pessoa", uf: "PB", logradouro: "Rua das Flores", numero: "100", bairro: "Centro" } },
//         company: { _id: "company123", nome: "Construtora Exemplo", cnpj: "11.222.333/0001-44", endereco: {logradouro: "Av Principal", numero:"1", bairro:"Centro", cidade:"Jampa", uf:"PB", cep:"58000-000"}, representanteLegalNome: "Sr. Exemplo", representanteLegalCPF: "999.888.777-66" },
//         // ... outros dados da reserva
//     };
// };
// const mockGetModelosContratoApi = async () => {
//     console.log("API MOCK: Buscando modelos de contrato");
//     return { modelos: [{ _id: "modelo123", nomeModelo: "Contrato Padrão Reserva Apto", conteudoHTMLTemplate: "<h1>Contrato para {{lead_nome}}</h1><p>Unidade: {{unidade_identificador}}</p>" }] };
// };


function PropostaContratoFormPage() {
    const { reservaId } = useParams();
    const navigate = useNavigate();
    const isEditMode = false; // Este formulário é sempre para CRIAR uma proposta a partir de uma reserva

    // States para dados pré-carregados
    const [reservaDetalhes, setReservaDetalhes] = useState(null);
    const [modelosContrato, setModelosContrato] = useState([]);

    const [formData, setFormData] = useState({
        modeloContratoUtilizado: '',
        valorPropostaContrato: '',
        valorEntrada: '',
        condicoesPagamentoGerais: '',
        dadosBancariosParaPagamento: { bancoNome: '', agencia: '', contaCorrente: '', cnpjPagamento: '', pix: '' },
        planoDePagamento: [{ tipoParcela: 'ATO', quantidade: 1, valorUnitario: '', vencimentoPrimeira: '', observacao: '' }], // Começa com uma parcela de ATO
        corretagem: { valorCorretagem: '', corretorPrincipal: '', condicoesPagamentoCorretagem: '', observacoesCorretagem: '' },
        corpoContratoHTMLGerado: '', // Será preenchido/editado
        responsavelNegociacao: '', // ID de um User do CRM
        observacoesInternasProposta: '',
        statusPropostaContrato: 'Em Elaboração',
    });

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState('');

    // Carregar dados da Reserva e Modelos de Contrato
    useEffect(() => {
        const loadInitialData = async () => {
            if (!reservaId) {
                toast.error("ID da Reserva não fornecido.");
                navigate('/reservas');
                return;
            }
            setLoading(true);
            try {
                // TODO: Descomentar quando as APIs reais existirem e funcionarem
                // const reservaData = await getReservaByIdApi(reservaId); // API para buscar reserva com dados populados
                // const modelosData = await getModelosContrato(); // API para listar modelos

                // Mock Data por enquanto:
                const reservaData = await mockGetReservaByIdApi(reservaId);
                const modelosData = await mockGetModelosContratoApi();

                setReservaDetalhes(reservaData);
                setModelosContrato(modelosData.modelos || []);

                // Pré-preencher alguns campos do formulário com dados da reserva/unidade
                setFormData(prev => ({
                    ...prev,
                    valorPropostaContrato: reservaData.unidade?.precoTabela || '',
                    precoTabelaUnidadeNoMomento: reservaData.unidade?.precoTabela || 0, // Campo do backend
                    // Se tiver um modelo padrão, pode selecioná-lo
                    modeloContratoUtilizado: (modelosData.modelos && modelosData.modelos.length > 0) ? modelosData.modelos[0]._id : '',
                    corpoContratoHTMLGerado: (modelosData.modelos && modelosData.modelos.length > 0) ? modelosData.modelos[0].conteudoHTMLTemplate : '<p>Selecione um modelo para carregar o template.</p>',
                }));

            } catch (err) {
                toast.error("Erro ao carregar dados para nova proposta: " + (err.error || err.message));
                navigate('/reservas');
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [reservaId, navigate]);


    // Handlers para planoDePagamento e corretagem serão mais complexos
    // Por enquanto, um handleChange genérico para os campos de primeiro nível
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleModeloChange = (e) => {
        const modeloId = e.target.value;
        const modeloSelecionado = modelosContrato.find(m => m._id === modeloId);
        setFormData(prev => ({
            ...prev,
            modeloContratoUtilizado: modeloId,
            corpoContratoHTMLGerado: modeloSelecionado ? modeloSelecionado.conteudoHTMLTemplate : '<p>Selecione um modelo para carregar o template.</p>'
        }));
    };

    // Placeholder para o editor Rich Text
    const handleConteudoHTMLChange = (html) => {
        setFormData(prev => ({ ...prev, corpoContratoHTMLGerado: html }));
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setFormError('');
        console.log("Dados da Proposta/Contrato para enviar:", formData);
        toast.info("Simulando criação de Proposta/Contrato... (Backend já está pronto!)");

        // TODO: Chamar a API real createPropostaContratoApi(reservaId, formData)
        // (Lembre-se que o controller espera o reservaId no params, e o resto no body)
        // Ex: const result = await createPropostaContratoApi(reservaId, formData);

        setTimeout(() => { // Simula chamada API
            setIsSaving(false);
            toast.success("Proposta/Contrato criada (simulação)!");
            navigate(`/reservas`); // Ou para a página de detalhes da proposta/contrato
        }, 1500);
    };

    if (loading) {
        return <div className="admin-page loading"><p>Carregando dados para Proposta/Contrato...</p></div>;
    }
    if (!reservaDetalhes) {
        return <div className="admin-page"><p>Não foi possível carregar os detalhes da reserva.</p><Link to="/reservas">Voltar</Link></div>;
    }

    return (
        <div className="admin-page proposta-contrato-form-page">
            <header className="page-header">
                <h1>Nova Proposta/Contrato para Reserva</h1>
                <p>Lead: <strong>{reservaDetalhes.lead?.nome}</strong> | Unidade: <strong>{reservaDetalhes.unidade?.identificador}</strong> ({reservaDetalhes.empreendimento?.nome})</p>
            </header>
            <div className="page-content">
                <form onSubmit={handleSubmit} className="form-container">
                    {formError && <p className="error-message">{formError}</p>}

                    <div className="form-group">
                        <label htmlFor="modeloContratoUtilizado">Modelo de Contrato*</label>
                        <select id="modeloContratoUtilizado" name="modeloContratoUtilizado" value={formData.modeloContratoUtilizado} onChange={handleModeloChange} required disabled={isSaving || modelosContrato.length === 0}>
                            <option value="">{modelosContrato.length === 0 ? 'Nenhum modelo cadastrado' : 'Selecione um modelo...'}</option>
                            {modelosContrato.map(mod => <option key={mod._id} value={mod._id}>{mod.nomeModelo} ({mod.tipoDocumento})</option>)}
                        </select>
                    </div>

                    {/* Placeholder para os campos da PropostaContrato que o usuário preencherá */}
                    {/* Ex: Valor, Condições, Responsável Negociação, etc. */}
                    {/* E o editor Rich Text para corpoContratoHTMLGerado */}

                    <div className="form-group">
                         <label>Conteúdo do Contrato (HTML Gerado a partir do Modelo)</label>
                         <p><small>Este conteúdo será pré-preenchido com o modelo e dados. Você poderá editá-lo abaixo.</small></p>
                         <textarea 
                            name="corpoContratoHTMLGerado"
                            value={formData.corpoContratoHTMLGerado}
                            onChange={(e) => handleConteudoHTMLChange(e.target.value)} // Simples, idealmente um RTE
                            rows="20"
                            style={{fontFamily: 'monospace', width: '100%'}}
                            disabled={isSaving}
                         />
                    </div>


                    <div className="form-actions">
                        <button type="button" className="button cancel-button" onClick={() => navigate(`/reservas`)} disabled={isSaving}>
                            Cancelar
                        </button>
                        <button type="submit" className="button submit-button" disabled={isSaving}>
                            {isSaving ? 'Salvando...' : 'Criar Proposta/Contrato'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default PropostaContratoFormPage;