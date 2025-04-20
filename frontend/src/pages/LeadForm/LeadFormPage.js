// src/pages/LeadForm/LeadFormPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createLead, getLeadById, updateLead } from '../../api/leads';
import { getSituacoes } from '../../api/situacoes';
import { getOrigens } from '../../api/origens';
// <<< Corrigido/Verificado import para users.js ou usuarios.js - Ajuste se necessário >>>
import { getUsuarios } from '../../api/usuarios';
import { toast } from 'react-toastify'; // <<< IMPORTAR toast >>>
import './LeadFormPage.css';

// Estado inicial do formulário
const initialState = {
    nome: '', contato: '', email: '', nascimento: '', endereco: '', cpf: '',
    situacao: '', origem: '', responsavel: '', comentario: ''
};

function LeadFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState(initialState);
  const [situacoesList, setSituacoesList] = useState([]);
  const [origensList, setOrigensList] = useState([]);
  const [usuariosList, setUsuariosList] = useState([]);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(isEditMode);
  const [isProcessing, setIsProcessing] = useState(false);

  const [optionsError, setOptionsError] = useState(null);
  // --- REMOVIDOS states de mensagem ---
  // const [submitError, setSubmitError] = useState(null);
  // const [successMessage, setSuccessMessage] = useState('');
  // ------------------------------------

  // Efeito para buscar opções dos dropdowns
  useEffect(() => {
    const fetchOptions = async () => {
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
        // Usa toast para erro crítico ao carregar opções? Opcional.
        // toast.error("Falha ao carregar opções para o formulário.");
      } finally {
         if (!isEditMode) setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, [isEditMode]);

  // Efeito para buscar dados do Lead no modo Edição
  useEffect(() => {
    if (isEditMode && id) {
      console.log(`Modo Edição: Buscando lead com ID ${id}`);
      setIsLoadingData(true);
      // setSubmitError(null); // Não precisa mais resetar
      const fetchLeadData = async () => {
        try {
          const data = await getLeadById(id);
          const formattedNascimento = data.nascimento ? data.nascimento.substring(0, 10) : '';
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
          // Mostra erro de carregamento como toast também
          toast.error(err.message || "Falha ao carregar dados para edição.");
          // setSubmitError(err.message || "Falha ao carregar dados para edição."); // Não precisa mais
        } finally {
          setIsLoadingData(false);
          setLoadingOptions(false); // Garante que loading geral pare
        }
      };
      fetchLeadData();
    } else {
      setFormData(initialState);
      setIsLoadingData(false);
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    // setSubmitError(null); // Não precisa mais
    // setSuccessMessage(''); // Não precisa mais

    // Validações básicas com toast
    if (!formData.nome || !formData.email || !formData.situacao || !formData.origem || !formData.responsavel) {
       toast.warn('Campos obrigatórios (*) devem ser preenchidos.'); // Avisa com toast
       setIsProcessing(false); return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
       toast.warn('Formato de email inválido.'); // Avisa com toast
       setIsProcessing(false); return;
    }

    // Preparar dados
    const dataToSend = { ...formData };
    // ... limpar campos opcionais vazios ...
    if (!dataToSend.cpf) delete dataToSend.cpf;
    if (!dataToSend.nascimento) delete dataToSend.nascimento;
    if (!dataToSend.endereco) delete dataToSend.endereco;
    if (!dataToSend.contato) delete dataToSend.contato;
    if (!dataToSend.comentario) delete dataToSend.comentario;


    console.log(`Dados enviados para ${isEditMode ? 'updateLead' : 'createLead'}:`, dataToSend);

    try {
      if (isEditMode) {
        await updateLead(id, dataToSend);
        toast.success('Lead atualizado com sucesso!'); // <<< FEEDBACK COM TOAST >>>
        setTimeout(() => { navigate(`/leads/${id}`); }, 1500);
      } else {
        await createLead(dataToSend);
        toast.success('Lead cadastrado com sucesso!'); // <<< FEEDBACK COM TOAST >>>
        setFormData(initialState); // Limpa form
        setTimeout(() => { navigate('/leads'); }, 1500);
      }
    } catch (err) {
      console.error(`Erro ao ${isEditMode ? 'atualizar' : 'cadastrar'} lead:`, err);
      // Mostra erro vindo da API (pode ser validação, CPF duplicado, etc.)
      toast.error(err.message || `Falha ao ${isEditMode ? 'atualizar' : 'cadastrar'} o lead.`); // <<< FEEDBACK COM TOAST >>>
      // setSubmitError(err.message || `Falha ao ${isEditMode ? 'atualizar' : 'cadastrar'} o lead.`); // Não precisa mais
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading e Erro de Opções (mantém exibição bloqueante)
  if (loadingOptions || isLoadingData) {
     return <div className="lead-form-page loading"><p>Carregando...</p></div>;
  }
  if (optionsError) {
     return <div className="lead-form-page error"><p className="error-message">{optionsError}</p></div>;
  }
  // Erro ao carregar dados do lead (bloqueia form)
  // (A lógica anterior que usava submitError para isso foi removida pois agora usamos toast)
  // Se getLeadById falhar, o state 'error' no LeadDetailPage (se existir lá) trataria ou
  // aqui poderíamos ter um state 'loadError' separado se necessário bloquear o form.
  // Por simplicidade, deixamos o toast informar sobre falha ao carregar dados.

  return (
    <div className="lead-form-page">
      <h1>{isEditMode ? `Editar Lead: ${formData.nome}` : 'Cadastrar Novo Lead'}</h1>

      {/* Botões superiores (se aplicável) */}
       {isEditMode && (
            <div className="form-top-actions">
                <Link to={`/leads/${id}`} className="button back-to-detail-button">
                     <i className="fas fa-arrow-left"></i> Cancelar Edição
                </Link>
                <Link to="/leads" className="button back-to-list-button">
                     <i className="fas fa-list"></i> Voltar para Lista
                </Link>
            </div>
       )}


      {/* Remover exibição de submitError e successMessage */}
      {/* {submitError && !isProcessing && <p className="error-message">{submitError}</p>} */}
      {/* {successMessage && <p className="success-message">{successMessage}</p>} */}

      <form onSubmit={handleSubmit} className="lead-form">
            {/* Inputs e Selects (sem alterações no JSX deles) */}
             {/* Nome */}
             <div className="form-group">
                <label htmlFor="nome">Nome Completo *</label>
                <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleChange} required />
             </div>
             {/* Email */}
             <div className="form-group">
               <label htmlFor="email">Email *</label>
               <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
             </div>
             {/* Contato */}
             <div className="form-group">
                <label htmlFor="contato">Contato</label>
                <input type="tel" id="contato" name="contato" value={formData.contato} onChange={handleChange} placeholder="(XX) XXXX-XXXX"/>
              </div>
              {/* CPF */}
              <div className="form-group">
                 <label htmlFor="cpf">CPF</label>
                 <input type="text" id="cpf" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" maxLength={14}/>
              </div>
              {/* Nascimento */}
              <div className="form-group">
                 <label htmlFor="nascimento">Data de Nascimento</label>
                 <input type="date" id="nascimento" name="nascimento" value={formData.nascimento} onChange={handleChange} />
              </div>
              {/* Endereço */}
              <div className="form-group">
                  <label htmlFor="endereco">Endereço</label>
                  <input type="text" id="endereco" name="endereco" value={formData.endereco} onChange={handleChange} />
              </div>
             {/* Situação */}
             <div className="form-group">
              <label htmlFor="situacao">Situação *</label>
              <select id="situacao" name="situacao" value={formData.situacao} onChange={handleChange} required>
                <option value="" disabled>Selecione...</option>
                {situacoesList.map(s => <option key={s._id} value={s._id}>{s.nome}</option>)}
              </select>
            </div>
             {/* Origem */}
             <div className="form-group">
               <label htmlFor="origem">Origem *</label>
               <select id="origem" name="origem" value={formData.origem} onChange={handleChange} required>
                 <option value="" disabled>Selecione...</option>
                 {origensList.map(o => <option key={o._id} value={o._id}>{o.nome}</option>)}
               </select>
            </div>
             {/* Responsável */}
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

            {/* Botão de Submit */}
            <div className="form-actions">
                 <button type="submit" disabled={isProcessing} className="submit-button">
                  {isProcessing ? (isEditMode ? 'Salvando...' : 'Cadastrando...') : (isEditMode ? 'Salvar Alterações' : 'Cadastrar Lead')}
                 </button>
                 {/* O botão Cancelar/Voltar agora está no topo */}
            </div>
      </form>
    </div>
  );
}

export default LeadFormPage;