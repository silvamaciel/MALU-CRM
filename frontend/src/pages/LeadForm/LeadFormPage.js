// src/pages/LeadForm/LeadFormPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; // Importar useParams
import { createLead, getLeadById, updateLead } from '../../api/leads'; // Importar getLeadById e updateLead
import { getSituacoes } from '../../api/situacoes';
import { getOrigens } from '../../api/origens';
import { getUsuarios } from '../../api/usuarios'; // Mantido users.js
import './LeadFormPage.css';

// Estado inicial do formulário (usado para criar e resetar)
const initialState = {
    nome: '', contato: '', email: '', nascimento: '', endereco: '', cpf: '',
    situacao: '', origem: '', responsavel: '', comentario: ''
};

function LeadFormPage() {
  const { id } = useParams(); // Pega o ID da URL, se existir
  const navigate = useNavigate();
  const isEditMode = Boolean(id); // Define se está no modo edição

  const [formData, setFormData] = useState(initialState);
  const [situacoesList, setSituacoesList] = useState([]);
  const [origensList, setOrigensList] = useState([]);
  const [usuariosList, setUsuariosList] = useState([]);

  const [loadingOptions, setLoadingOptions] = useState(true); // Loading dos dropdowns
  const [isLoadingData, setIsLoadingData] = useState(isEditMode); // Loading dos dados do lead (só no edit)
  const [isProcessing, setIsProcessing] = useState(false); // Loading do submit (criar/atualizar)

  const [optionsError, setOptionsError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Efeito para buscar opções dos dropdowns (igual ao anterior)
  useEffect(() => {
    const fetchOptions = async () => {
      // Não resetar loadingOptions aqui se já estiver editando
      if (!isEditMode) setLoadingOptions(true);
      setOptionsError(null);
      try {
        const [situacoesData, origensData, usuariosData] = await Promise.all([
          getSituacoes(), getOrigens(), getUsuarios()
        ]);
        setSituacoesList(situacoesData || []);
        setOrigensList(origensData || []);
        setUsuariosList(usuariosData || []);
      } catch (error) {
        console.error("Erro ao buscar opções:", error);
        setOptionsError("Falha ao carregar opções. Tente recarregar.");
      } finally {
         // Só para de carregar opções quando não estiver carregando dados do lead também
         if (!isEditMode) setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, [isEditMode]); // Depende de isEditMode para não rodar à toa na edição

  // Efeito para buscar dados do Lead no modo Edição
  useEffect(() => {
    if (isEditMode && id) {
      console.log(`Modo Edição: Buscando lead com ID ${id}`);
      setIsLoadingData(true);
      setSubmitError(null); // Limpa erros anteriores
      const fetchLeadData = async () => {
        try {
          const data = await getLeadById(id);
          // Formata a data para o input type="date" (YYYY-MM-DD)
          const formattedNascimento = data.nascimento ? data.nascimento.substring(0, 10) : '';
          // Preenche o formulário com os dados existentes
          setFormData({
            nome: data.nome || '',
            contato: data.contato || '',
            email: data.email || '',
            nascimento: formattedNascimento,
            endereco: data.endereco || '',
            cpf: data.cpf || '',
            situacao: data.situacao?._id || '',
            origem: data.origem?._id || '',
            responsavel: data.responsavel?._id || '',
            comentario: data.comentario || '',
          });
        } catch (err) {
          console.error("Erro ao buscar dados para edição:", err);
          setSubmitError(err.message || "Falha ao carregar dados para edição.");
          // Poderia desabilitar o form ou redirecionar
        } finally {
          setIsLoadingData(false);
           // Se carregou dados E opções, parar loading geral
           setLoadingOptions(false);
        }
      };
      fetchLeadData();
    } else {
      // Garante que o form esteja limpo no modo criação
      setFormData(initialState);
      setIsLoadingData(false); // Não está carregando dados no modo criação
    }
  }, [id, isEditMode]); // Depende do ID e do modo

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setSubmitError(null);
    setSuccessMessage('');

    // Validações básicas (mantidas)
    if (!formData.nome || !formData.email || !formData.situacao || !formData.origem || !formData.responsavel) {
       setSubmitError('Campos obrigatórios (*) não podem estar vazios.');
       setIsProcessing(false); return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
       setSubmitError('Email inválido.');
       setIsProcessing(false); return;
    }

    // Preparar dados (mantido)
    const dataToSend = { ...formData };
    if (!dataToSend.cpf) delete dataToSend.cpf;
    if (!dataToSend.nascimento) delete dataToSend.nascimento;
    if (!dataToSend.endereco) delete dataToSend.endereco;
    if (!dataToSend.contato) delete dataToSend.contato;
    if (!dataToSend.comentario) delete dataToSend.comentario;

    console.log(`Dados enviados para ${isEditMode ? 'updateLead' : 'createLead'}:`, dataToSend);

    try {
      if (isEditMode) {
        // --- CHAMADA PARA ATUALIZAR ---
        await updateLead(id, dataToSend);
        setSuccessMessage('Lead atualizado com sucesso!');
        setTimeout(() => {
          // Volta para a página de detalhes após editar
          navigate(`/leads/${id}`);
        }, 1500);
      } else {
        // --- CHAMADA PARA CRIAR ---
        await createLead(dataToSend);
        setSuccessMessage('Lead cadastrado com sucesso!');
        setFormData(initialState); // Limpa form
        setTimeout(() => {
          navigate('/leads'); // Volta para a lista após criar
        }, 1500);
      }
    } catch (err) {
      console.error(`Erro ao ${isEditMode ? 'atualizar' : 'cadastrar'} lead:`, err);
      setSubmitError(err.message || `Falha ao ${isEditMode ? 'atualizar' : 'cadastrar'} o lead.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Mensagem de Loading principal (considera opções e dados do lead)
  if (loadingOptions || isLoadingData) {
     return <div className="lead-form-page loading"><p>Carregando...</p></div>;
  }
   // Erro ao carregar opções (bloqueia o form)
  if (optionsError) {
     return <div className="lead-form-page error"><p className="error-message">{optionsError}</p></div>;
  }
   // Erro ao carregar dados do lead para edição (permite tentar novamente ou voltar)
   if (isEditMode && submitError && !successMessage && !isProcessing && !isLoadingData) {
       // Mostra erro de carregamento de dados especificamente
       // (Diferente do erro de submit)
       return ( <div className="lead-form-page error">
                   <h2>Erro ao Carregar Dados</h2>
                   <p className="error-message">{submitError}</p>
                   <button onClick={() => window.location.reload()}>Tentar Novamente</button>
                   <Link to="/leads">Voltar para Lista</Link>
                </div>
       );
   }


  return (
    <div className="lead-form-page">
      {/* Título dinâmico */}
      <h1>{isEditMode ? `Editar Lead: ${formData.nome}` : 'Cadastrar Novo Lead'}</h1>

      <form onSubmit={handleSubmit} className="lead-form">
        {/* Exibe erro de SUBMIT aqui */}
        {submitError && !isProcessing && <p className="error-message">{submitError}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}

        {/* Campos do formulário (iguais, mas agora preenchidos no modo edição) */}

        <div className="form-top-actions"> {/* Nova Div para os botões */}
                    <Link to={`/leads/${id}`} className="button back-to-detail-button">
                        <i className="fas fa-arrow-left"></i>Cancelar Edição {/* Ícone opcional */}
                    </Link>
                    <Link to="/leads" className="button back-to-list-button">
                        <i className="fas fa-list"></i> Voltar para Lista {/* Ícone opcional */}
                    </Link>
                </div>

        {/* Nome, Email, Contato, CPF, Nascimento, Endereço */}
         <div className="form-group">
            <label htmlFor="nome">Nome Completo *</label>
            <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleChange} required />
         </div>
         {/* ... outros inputs ... */}
         <div className="form-group">
           <label htmlFor="email">Email *</label>
           <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
         </div>
         <div className="form-group">
            <label htmlFor="contato">Contato</label>
            <input type="tel" id="contato" name="contato" value={formData.contato} onChange={handleChange} placeholder="(XX) XXXX-XXXX"/>
          </div>
          <div className="form-group">
             <label htmlFor="cpf">CPF</label>
             <input type="text" id="cpf" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" maxLength={14}/>
          </div>
          <div className="form-group">
             <label htmlFor="nascimento">Data de Nascimento</label>
             <input type="date" id="nascimento" name="nascimento" value={formData.nascimento} onChange={handleChange} />
          </div>
          <div className="form-group">
              <label htmlFor="endereco">Endereço</label>
              <input type="text" id="endereco" name="endereco" value={formData.endereco} onChange={handleChange} />
          </div>


        {/* Selects (importante: value={formData.situacao} etc. já pega o ID) */}
        <div className="form-group">
          <label htmlFor="situacao">Situação *</label>
          <select id="situacao" name="situacao" value={formData.situacao} onChange={handleChange} required>
            <option value="" disabled>Selecione...</option>
            {situacoesList.map(s => <option key={s._id} value={s._id}>{s.nome}</option>)}
          </select>
        </div>
         <div className="form-group">
           <label htmlFor="origem">Origem *</label>
           <select id="origem" name="origem" value={formData.origem} onChange={handleChange} required>
             <option value="" disabled>Selecione...</option>
             {origensList.map(o => <option key={o._id} value={o._id}>{o.nome}</option>)}
           </select>
        </div>
         <div className="form-group">
           <label htmlFor="responsavel">Responsável *</label>
           <select id="responsavel" name="responsavel" value={formData.responsavel} onChange={handleChange} required>
             <option value="" disabled>Selecione...</option>
             {usuariosList.map(u => <option key={u._id} value={u._id}>{u.nome}</option>)}
           </select>
        </div>

        {/* Comentário */}
        <div className="form-group">
          <label htmlFor="comentario">Comentário</label>
          <textarea id="comentario" name="comentario" value={formData.comentario} onChange={handleChange}></textarea>
        </div>

        {/* Botão dinâmico */}
        <button type="submit" disabled={isProcessing} className="submit-button">
          {isProcessing ? (isEditMode ? 'Salvando...' : 'Cadastrando...') : (isEditMode ? 'Salvar Alterações' : 'Cadastrar Lead')}
        </button>
      </form>
    </div>
  );
}

export default LeadFormPage;