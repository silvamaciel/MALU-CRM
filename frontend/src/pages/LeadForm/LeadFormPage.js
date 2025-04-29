// src/pages/LeadForm/LeadFormPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
// API Functions
import { createLead, getLeadById, updateLead } from '../../api/leads';
import { getLeadStages } from '../../api/leadStages'; // Padronizado
import { getOrigens } from '../../api/origens';
import { getUsuarios } from '../../api/usuarios'; // Verifique nome/caminho real!
// Notifications
import { toast } from 'react-toastify';
// CSS
import './LeadFormPage.css';
// Opcional: Input Mask
// import InputMask from 'react-input-mask';

// Estado inicial (com CPF)
const initialState = {
    nome: '', contato: '', email: '', nascimento: '', endereco: '', cpf: '',
    situacao: '', origem: '', responsavel: '', comentario: ''
};

function LeadFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  // State principal do formulário
  const [formData, setFormData] = useState(initialState);
  // State para guardar dados originais no modo edição
  const [initialData, setInitialData] = useState(null);

  // States para opções de dropdowns
  const [situacoesList, setSituacoesList] = useState([]);
  const [origensList, setOrigensList] = useState([]);
  const [usuariosList, setUsuariosList] = useState([]);

  // States de Loading e Erro
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(isEditMode);
  const [isProcessing, setIsProcessing] = useState(false); // Para submit
  const [optionsError, setOptionsError] = useState(null); // Erro ao carregar opções

  // --- Data Fetching ---

  // Efeito para buscar opções (Situação, Origem, Usuário)
  useEffect(() => {
    console.log("Buscando opções de dropdown...");
    const fetchOptions = async () => {
      if (!isEditMode) setLoadingOptions(true);
      setOptionsError(null);
      try {
        const [situacoesData, origensData, usuariosData] = await Promise.all([
          getLeadStages(), // Usando getLeadStages
          getOrigens(),
          getUsuarios() // Verifique esta função/API
        ]);
        setSituacoesList(Array.isArray(situacoesData) ? situacoesData : []);
        setOrigensList(Array.isArray(origensData) ? origensData : []);
        setUsuariosList(Array.isArray(usuariosData) ? usuariosData : []);
      } catch (error) {
        console.error("Erro ao buscar opções:", error);
        const errorMsg = error.message || "Falha ao carregar opções para o formulário.";
        setOptionsError(errorMsg);
        toast.error(errorMsg);
        setSituacoesList([]); setOrigensList([]); setUsuariosList([]);
      } finally {
         if (!isEditMode) setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, [isEditMode]);

  // Efeito para buscar dados do Lead no modo Edição E guarda estado inicial
  useEffect(() => {
    // Só roda se estiver em modo edição e o ID for válido
    if (isEditMode && id) {
      console.log(`Modo Edição: Buscando lead ID ${id}`);
      setIsLoadingData(true);
      const fetchLeadData = async () => {
        try {
          const data = await getLeadById(id);
          const formattedNascimento = data.nascimento ? data.nascimento.substring(0, 10) : '';
          // Prepara os dados formatados para o formulário
          const formDataToSet = {
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
          };
          setFormData(formDataToSet);
          setInitialData(formDataToSet); // Guarda os dados iniciais
        } catch (err) {
          console.error("Erro ao buscar dados para edição:", err);
          toast.error(err.message || "Falha ao carregar dados do lead para edição.");
          // Considerar redirecionar se o lead não puder ser carregado
          // navigate('/leads');
        } finally {
          setIsLoadingData(false);
          // Garante que o loading geral termine após carregar dados E opções
          // (se as opções ainda estiverem carregando, setLoadingOptions(false) será chamado no outro effect)
          if (!loadingOptions) setLoadingOptions(false); // Ajuste fino no loading
        }
      };
      fetchLeadData();
    } else {
      // Modo Criação
      setFormData(initialState);
      setInitialData(null);
      setIsLoadingData(false);
      // Se opções já carregaram, loading geral para
       if (!loadingOptions) setLoadingOptions(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditMode]); // Roda se ID ou modo mudarem (navigate não precisa aqui)

  // Handler de Mudança padrão
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    console.log(`handleChange: name=${name}, value=${value}`); // Log para depurar selects
    setFormData(prevState => ({ ...prevState, [name]: value }));
  }, []); // useCallback sem dependências

  // --- Handler de Submit AJUSTADO ---
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    // 1. Validação Frontend Mínima
    if (!formData.nome || !formData.contato) {
       toast.warn('Nome e Contato são obrigatórios.');
       setIsProcessing(false); return;
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
       toast.warn('Formato de email inválido.');
       setIsProcessing(false); return;
    }

    let dataToSend = {};
    let operationPromise;
    let successMessage;
    let navigateTo;

    if (isEditMode) {
        // --- MODO EDIÇÃO: Enviar apenas campos alterados ---
        const changedData = {};
        if (!initialData) {
             toast.error("Erro: Dados iniciais não carregados.");
             setIsProcessing(false); return;
        }

        Object.keys(formData).forEach(key => {
            const currentValue = formData[key] ?? '';
            const initialValue = initialData[key] ?? '';
            if (currentValue !== initialValue) {
                 changedData[key] = currentValue === '' ? null : currentValue;
            }
        });

        if (Object.keys(changedData).length === 0) {
            toast.info("Nenhuma alteração detectada.");
            setIsProcessing(false); return;
        }

        dataToSend = changedData;
        console.log("Dados ALTERADOS enviados para updateLead:", dataToSend);
        operationPromise = updateLead(id, dataToSend);
        successMessage = 'Lead atualizado!';
        navigateTo = `/leads/${id}`;

    } else {
        // --- MODO CRIAÇÃO: Enviar dados relevantes do formData ---
        // Backend agora trata os defaults para situacao/responsavel/origem se não enviados
        dataToSend = { ...formData };
        // Remove chaves que são string vazia (exceto nome/contato) ou explicitamente null
        Object.keys(dataToSend).forEach(key => {
            if (!['nome', 'contato'].includes(key) && (dataToSend[key] === '' || dataToSend[key] === null)) {
                 delete dataToSend[key];
            }
        });
        // Limpa CPF se só tiver máscara/espaços
        if (dataToSend.cpf && dataToSend.cpf.replace(/\D/g, '') === '') {
            delete dataToSend.cpf;
        }

        console.log("Dados enviados para createLead:", dataToSend);
        operationPromise = createLead(dataToSend);
        successMessage = 'Lead cadastrado!';
        navigateTo = '/leads';
    }

    // --- Executa a chamada API ---
    try {
        await operationPromise;
        toast.success(successMessage);
        if (!isEditMode) { setFormData(initialState); } // Limpa form só na criação
        // Atraso um pouco menor para navegação
        setTimeout(() => { navigate(navigateTo); }, 800);
    } catch (err) {
        toast.error(err.message || `Falha ao ${isEditMode ? 'atualizar' : 'cadastrar'}.`);
        console.error("Erro no submit:", err);
    } finally {
        setIsProcessing(false);
    }
  // Adiciona dependências corretas para useCallback
  }, [formData, initialData, isEditMode, id, navigate]);

  // ---- Renderização ----

  // Loading inicial (mostra se opções OU dados do lead estão carregando)
  if (loadingOptions || isLoadingData) {
     return <div className="lead-form-page loading"><p>Carregando...</p></div>;
  }
  // Erro crítico ao carregar opções (impede renderizar o form)
  if (optionsError) {
     return <div className="lead-form-page error"><p className="error-message">{optionsError}</p></div>;
  }
  // Se chegou aqui, options carregaram. Se for edit mode, data também carregou (ou deu erro tratado com toast).

  return (
    <div className="lead-form-page">
      <h1>{isEditMode ? `Editar Lead: ${initialData?.nome || formData.nome || ''}` : 'Cadastrar Novo Lead'}</h1>

      {/* Botões Voltar (apenas modo edição) */}
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

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="lead-form">

        {/* Grupo 1: Nome*, Contato* */}
        <div className="form-group">
            <label htmlFor="nome">Nome Completo *</label>
            <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleChange} required />
        </div>
        <div className="form-group">
            <label htmlFor="contato">Contato *</label>
            <input type="tel" id="contato" name="contato" value={formData.contato} onChange={handleChange} placeholder="(XX) XXXX-XXXX" required/>
        </div>

        {/* Grupo 2: Email, CPF (Opcionais) */}
        <div className="form-group">
           <label htmlFor="email">Email</label>
           <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} />
         </div>
         <div className="form-group">
           <label htmlFor="cpf">CPF</label>
           <input type="text" id="cpf" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" maxLength={14} />
         </div>

        {/* Grupo 3: Nascimento, Endereço, Comentário (Opcionais) */}
        <div className="form-group">
           <label htmlFor="nascimento">Data de Nascimento</label>
           <input type="date" id="nascimento" name="nascimento" value={formData.nascimento} onChange={handleChange} />
        </div>
        <div className="form-group">
            <label htmlFor="endereco">Endereço</label>
            <input type="text" id="endereco" name="endereco" value={formData.endereco} onChange={handleChange} />
        </div>
         <div className="form-group">
          <label htmlFor="comentario">Comentário</label>
          <textarea id="comentario" name="comentario" value={formData.comentario} onChange={handleChange}></textarea>
        </div>

        {/* Grupo 4: Selects (Não 'required' no HTML) */}
        <div className="form-group">
          <label htmlFor="situacao">Situação</label>
          <select id="situacao" name="situacao" value={formData.situacao} onChange={handleChange}>
            {/* Opção informativa sobre default */}
            <option value=""></option>
            {situacoesList.map(s => <option key={s._id} value={s._id}>{s.nome}</option>)}
          </select>
        </div>
         <div className="form-group">
           <label htmlFor="origem">Origem</label>
           <select id="origem" name="origem" value={formData.origem} onChange={handleChange}>
             <option value=""></option>
             {origensList.map(o => <option key={o._id} value={o._id}>{o.nome}</option>)}
           </select>
        </div>
         <div className="form-group">
           <label htmlFor="responsavel">Responsável</label>
           <select id="responsavel" name="responsavel" value={formData.responsavel} onChange={handleChange}>
             <option value=""></option>
             {usuariosList.map(u => <option key={u._id} value={u._id}>{u.nome}</option>)}
           </select>
        </div>

        {/* Botão Submit */}
        <div className="form-actions">
             <button type="submit" disabled={isProcessing} className="submit-button">
              {isProcessing ? (isEditMode ? 'Salvando...' : 'Cadastrando...') : (isEditMode ? 'Salvar Alterações' : 'Cadastrar Lead')}
             </button>
        </div>
      </form>
    </div>
  );
}

export default LeadFormPage;