import React, { useState, useEffect, useCallback } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { sendGoogleAuthCode } from "../../api/auth";
import { toast } from "react-toastify";
import FacebookLogin from "@greatsumini/react-facebook-login";
import axios from "axios";
import {
  connectFacebookPage,
  getFacebookConnectionStatus,
  disconnectFacebookPage,
  syncGoogleContactsApi,
  listGoogleContactsApi,
  processSelectedGoogleContactsApi,
  listFacebookPageFormsApi,
  saveLinkedFacebookFormsApi,
} from "../../api/integrations";
import "./IntegrationsPage.css";

const facebookAppId =
  process.env.REACT_APP_FACEBOOK_APP_ID || process.env.VITE_FACEBOOK_APP_ID;
const GRAPH_API_VERSION = "v22.0";

if (!facebookAppId) {
  console.error(
    "ERRO CRÍTICO: Facebook App ID não definido nas variáveis de ambiente!"
  );
}

function IntegrationsPage() {
  // Google States
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState(null);
  const [isSyncingGoogleContacts, setIsSyncingGoogleContacts] = useState(false);
  const [isGoogleContactsModalOpen, setIsGoogleContactsModalOpen] =
    useState(false);
  const [googleContactsList, setGoogleContactsList] = useState([]);
  const [selectedGoogleContacts, setSelectedGoogleContacts] = useState({});
  const [isLoadingGoogleContacts, setIsLoadingGoogleContacts] = useState(false);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // Facebook States
  const [isConnectingFb, setIsConnectingFb] = useState(false); // Usado para qualquer ação FB
  const [fbError, setFbError] = useState(null);
  const [fbUserData, setFbUserData] = useState(null); // Token temp do usuário FB e nome
  const [facebookPages, setFacebookPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [isFetchingPages, setIsFetchingPages] = useState(false);
  const [isDisconnectingFb, setIsDisconnectingFb] = useState(false);
  const [fbFormPermissionError, setFbFormPermissionError] = useState(null);

  // States para Formulários do Facebook
  const [pageForms, setPageForms] = useState([]);
  const [isLoadingPageForms, setIsLoadingPageForms] = useState(false);
  const [selectedFormIds, setSelectedFormIds] = useState({});
  const [isSavingForms, setIsSavingForms] = useState(false);

  // Persisted Facebook Connection Status
  const [persistedFbConnection, setPersistedFbConnection] = useState({
    isConnected: false,
    pageId: null,
    pageName: null,
  });
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // --- Google OAuth Logic ---
  const connectGoogle = useGoogleLogin({
    flow: "auth-code",
    scope: `openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/drive.file`,
    onSuccess: async (codeResponse) => {
      setGoogleError(null);
      setIsConnectingGoogle(true);
      console.log("Google Auth Code Response (Integrations):", codeResponse);
      try {
        await sendGoogleAuthCode(codeResponse.code);
        toast.success("Conta Google conectada/permissões atualizadas!");
        // TODO: Talvez chamar um fetchStatus para Google aqui também
      } catch (err) {
        const errorMsg = err.message || "Falha ao conectar com Google.";
        setGoogleError(errorMsg);
        toast.error(errorMsg);
        console.error(err);
      } finally {
        setIsConnectingGoogle(false);
      }
    },
    onError: (errorResponse) => {
      console.error("Google Login Flow Error (Integrations):", errorResponse);
      setGoogleError("Falha ao iniciar conexão com Google.");
      toast.error("Falha ao iniciar conexão com Google.");
      setIsConnectingGoogle(false);
    },
  });

  // --- Facebook Logic ---

  // funcao para buscar formulários da página
  const fetchPageForms = useCallback(
    async (pageId) => {
      if (!pageId) {
        setPageForms([]);
        return;
      }
      setIsLoadingPageForms(true);
      setFbError(null);
      setFbFormPermissionError(null);
      try {
        console.log(
          `[IntegrationsPage] Buscando formulários para Page ID: ${pageId}`
        );
        const forms = await listFacebookPageFormsApi(pageId);
        setPageForms(forms || []);
        if (forms && forms.length > 0) {
          const linked = persistedFbConnection.linkedFacebookForms || [];
          const initialSelected = {};
          forms.forEach((form) => {
            if (linked.find((lf) => lf.formId === form.id)) {
              initialSelected[form.id] = true;
            }
          });
          setSelectedFormIds(initialSelected);
        } else {
        }
      } catch (err) {
        const errorMessage =
          err.error || err.message || "Falha ao buscar formulários.";
        console.error(
          `Erro ao buscar formulários para Page ID ${pageId}:`,
          err
        );

        if (
          typeof errorMessage === "string" &&
          errorMessage.includes("(#200)") &&
          errorMessage.toLowerCase().includes("permission")
        ) {
          const permErrorMsg =
            "Para listar/gerenciar formulários, são necessárias permissões adicionais. Por favor, reconecte a conta/página e conceda as permissões de 'gerenciar anúncios da página'.";
          setFbFormPermissionError(permErrorMsg);
          toast.warn("Permissões adicionais do Facebook são necessárias.", {
            autoClose: 7000,
          });
        } else {
          setFbError(errorMessage);
          toast.error(errorMessage);
        }
        setPageForms([]);
      } finally {
        setIsLoadingPageForms(false);
      }
    },
    []
  );

  // Função para buscar o status da conexão FB no backend
  const fetchFacebookStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const status = await getFacebookConnectionStatus();
      console.log(
        "DEBUG: Status recebido de getFacebookConnectionStatus():",
        JSON.stringify(status, null, 2)
      );
      setPersistedFbConnection(status);
      console.log(
        "DEBUG: Estado persistedFbConnection APÓS set:",
        JSON.stringify(status, null, 2)
      );

      if (status.isConnected && status.pageId) {
        fetchPageForms(status.pageId);
      }
    } catch (err) {
      console.error("Erro ao buscar status da integração FB:", err);
      toast.error(
        "Não foi possível verificar o status da integração com Facebook."
      );
      setPersistedFbConnection({
        isConnected: false,
        pageId: null,
        pageName: null,
      }); // Reseta em caso de erro
    } finally {
      setIsLoadingStatus(false);
    }
  }, [fetchPageForms]);

  useEffect(() => {
    fetchFacebookStatus();
  }, [fetchFacebookStatus]);

  useEffect(() => {
    if (!selectedPageId && facebookPages.length > 0) {
      setSelectedPageId(facebookPages[0].id); // <- isso garante que sempre tenha algo selecionado
    }
  }, [facebookPages, selectedPageId]);

  // Callback do componente FacebookLogin
  const handleFacebookResponse = useCallback(
    async (response) => {
      console.log(
        "Facebook Login Response (onSuccess/onProfileSuccess):",
        response
      );
      setFbError(null);

      if (response && response.accessToken && response.userID) {
        const userAccessToken = response.accessToken;
        setFbUserData({
          accessToken: userAccessToken,
          userID: response.userID,
          name: response.name || `Usuário ${response.userID}`,
        });

        setIsFetchingPages(true);
        setFacebookPages([]);
        setSelectedPageId("");
        try {
          const pagesResponse = await axios.get(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts`,
            {
              params: {
                access_token: userAccessToken,
                fields: "id,name,tasks",
              },
            }
          );
          console.log("Páginas do Facebook encontradas:", pagesResponse.data);
          const pages = Array.isArray(pagesResponse.data?.data)
            ? pagesResponse.data.data
            : [];

          setFacebookPages(pages);

          if (pages.length > 0) {
            setSelectedPageId(pages[0].id);
          } else {
            toast.warn("Nenhuma Página do Facebook encontrada ou permissível.");
            setFbError("Nenhuma Página encontrada.");
          }
        } catch (pageError) {
          const errorData = pageError.response?.data?.error;
          console.error("Erro ao buscar Páginas FB:", errorData || pageError);
          const errorMsg =
            errorData?.message || "Falha ao buscar suas Páginas do Facebook.";
          setFbError(errorMsg);
          toast.error(errorMsg);
          setFacebookPages([]);
        } finally {
          setIsFetchingPages(false);
          setIsConnectingFb(false);
        }
      } else if (response && response.status === "not_authorized") {
        const errorMsg = "Permissões não concedidas no Facebook.";
        setFbError(errorMsg);
        toast.warn(errorMsg);
        setIsConnectingFb(false);
      } else {
        const errorMsg =
          "Falha na autenticação com Facebook: resposta inesperada ou token não recebido.";
        setFbError(errorMsg);
        toast.error(errorMsg);
        setIsConnectingFb(false);
      }
    },
    [fetchPageForms]
  );

  // Handler para enviar a página selecionada ao backend
  const handleConnectSelectedPage = useCallback(async () => {
    if (!selectedPageId || !fbUserData?.accessToken) {
      toast.error("Selecione uma página e garanta conexão ao Facebook.");
      return;
    }
    console.log("DEBUG HCS: INÍCIO - Definindo isConnectingFb para true.");
    setIsConnectingFb(true);
    setFbError(null);
    console.log(
      `DEBUG HCS: Enviando para backend: PageID=<span class="math-inline">\{selectedPageId\}, UserToken\=</span>{fbUserData.accessToken.substring(0,15)}...`
    );
    console.log(
      `Enviando para backend: PageID=${selectedPageId}, UserToken=${fbUserData.accessToken.substring(
        0,
        10
      )}...`
    );
    try {
      console.log("DEBUG HCS: Antes da chamada API connectFacebookPage.");
      const result = await connectFacebookPage(
        selectedPageId,
        fbUserData.accessToken
      );
      console.log(
        "DEBUG HCS: DEPOIS da chamada API connectFacebookPage. Resultado:",
        result
      );

      toast.success(
        result.message || `Página conectada e webhook configurado!`
      );
      console.log("DEBUG HCS: Antes da chamada fetchFacebookStatus.");

      await fetchFacebookStatus();
      console.log("DEBUG HCS: DEPOIS da chamada fetchFacebookStatus.");
      console.log(
        "DEBUG HCS: Resetando fbUserData, facebookPages, selectedPageId."
      );

      setFbUserData(null);
      setFacebookPages([]);
      setSelectedPageId("");
      console.log("DEBUG HCS: FIM do bloco TRY.");
    } catch (err) {
      console.error("DEBUG HCS: ERRO no bloco TRY:", err);

      const errorMsg =
        err.error || err.message || "Falha ao conectar página no backend.";
      setFbError(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      console.log(
        "DEBUG HCS: Bloco FINALLY - Definindo isConnectingFb para false."
      );
      setIsConnectingFb(false);
    }
  }, [selectedPageId, fbUserData, fetchFacebookStatus]); // Adiciona fetchFacebookStatus

  // Handler para desconectar a conta do facebook
  const handleDisconnectFacebookPage = useCallback(async () => {
    setIsDisconnectingFb(true);
    setFbError(null); // Limpa erros anteriores
    try {
      const result = await disconnectFacebookPage(); // Chama API de desconexão
      toast.success(
        result.message || "Página do Facebook desconectada com sucesso!"
      );
      await fetchFacebookStatus(); // Atualiza o status para refletir a desconexão
      setFbUserData(null); // Reseta dados de login FB se houver
      setFacebookPages([]); // Limpa lista de páginas
      setSelectedPageId("");
    } catch (err) {
      const errorMsg = err.message || "Falha ao desconectar página.";
      setFbError(errorMsg);
      toast.error(errorMsg);
      console.error("Erro ao desconectar página FB:", err);
    } finally {
      setIsDisconnectingFb(false);
    }
  }, [fetchFacebookStatus]);

  const handleSyncGoogleContacts = useCallback(async () => {
    setIsSyncingGoogleContacts(true);
    setGoogleError(null); // Limpa erros anteriores do Google
    toast.info("Iniciando sincronização de contatos do Google...");
    try {
      const result = await syncGoogleContactsApi();
      toast.success(result.message || "Sincronização concluída!");
      if (result.summary) {
        toast.info(
          `Resumo: ${result.summary.leadsImported} leads importados, ${result.summary.duplicatesSkipped} duplicados pulados, ${result.summary.othersSkipped} outros pulados (de ${result.summary.totalContactsProcessed} contatos processados).`,
          { autoClose: 7000 }
        );
      }
    } catch (err) {
      const errorMsg =
        err.error || err.message || "Falha ao sincronizar contatos do Google.";
      setGoogleError(errorMsg);
      toast.error(errorMsg);
      console.error("Erro ao sincronizar contatos Google:", err);
    } finally {
      setIsSyncingGoogleContacts(false);
    }
  }, []);

  // modal para abrir e ver contatos para selecionar
  const handleOpenGoogleContactsModal = useCallback(async () => {
    setIsLoadingGoogleContacts(true);
    setGoogleError(null);
    setGoogleContactsList([]); // Limpa lista antiga
    setSelectedGoogleContacts({}); // Limpa seleção antiga
    toast.info("Buscando seus contatos do Google..."); // Mantém o toast

    try {
      const contacts = await listGoogleContactsApi(); // Chama API para listar
      if (contacts && contacts.length > 0) {
        setGoogleContactsList(contacts);
        setIsGoogleContactsModalOpen(true); // Abre o modal com os contatos
      } else {
        toast.info(
          "Nenhum contato encontrado na sua conta Google ou você não concedeu permissão."
        );
        setGoogleContactsList([]); // Garante que está vazio
      }
    } catch (err) {
      const errorMsg =
        err.error || err.message || "Falha ao buscar contatos do Google.";
      setGoogleError(errorMsg);
      toast.error(errorMsg);
      console.error(
        "DEBUG MODAL: ERRO ao buscar contatos Google para modal:",
        err
      ); // Log ERRO
    } finally {
      setIsLoadingGoogleContacts(false);
    }
  }, []);

  const handleGoogleContactSelectionChange = (googleContactId) => {
    setSelectedGoogleContacts((prev) => ({
      ...prev,
      [googleContactId]: !prev[googleContactId],
    }));
  };

  // Handler para importar os contatos SELECIONADOS
  const handleImportSelectedGoogleContacts = useCallback(async () => {
    const contactsToImportIds = Object.keys(selectedGoogleContacts).filter(
      (id) => selectedGoogleContacts[id]
    );
    if (contactsToImportIds.length === 0) {
      toast.warn("Nenhum contato selecionado para importação.");
      return;
    }

    // Pega os objetos completos dos contatos selecionados da lista original
    const contactsDataToSend = googleContactsList.filter((contact) =>
      contactsToImportIds.includes(contact.googleContactId)
    );

    console.log("IMPORTANDO Contatos Selecionados:", contactsDataToSend);
    setIsProcessingImport(true); // <<< Ativa loading do botão de importar
    setGoogleError(null); // Limpa erros anteriores
    toast.info(`Importando ${contactsDataToSend.length} contatos...`);

    try {
      // Chama a API do backend para processar os contatos selecionados
      const result = await processSelectedGoogleContactsApi(contactsDataToSend);
      toast.success(result.message || "Importação processada!");
      if (result.summary) {
        toast.info(
          `Resumo: ${result.summary.leadsImported} leads criados, ${result.summary.duplicatesSkipped} duplicados, ${result.summary.errorsEncountered} erros.`,
          { autoClose: 8000 }
        );
      }
      setIsGoogleContactsModalOpen(false);
      setSelectedGoogleContacts({});
    } catch (err) {
      const errorMsg =
        err.error || err.message || "Falha ao importar contatos selecionados.";
      setGoogleError(errorMsg);
      toast.error(errorMsg);
      console.error("Erro ao importar contatos selecionados:", err);
    } finally {
      setIsProcessingImport(false);
    }
  }, [selectedGoogleContacts, googleContactsList]);

  // Handler para seleção de formulários
  const handleFormSelectionChange = (formId) => {
    setSelectedFormIds((prev) => ({ ...prev, [formId]: !prev[formId] }));
  };

  //Handler para SALVAR seleção de formulários (placeholder) >>>
  const handleSaveFormSelection = useCallback(async () => {
    if (!persistedFbConnection.isConnected || !persistedFbConnection.pageId) {
      toast.error(
        "Nenhuma página do Facebook está conectada para salvar formulários."
      );
      return;
    }
    const activeFormsData = pageForms
      .filter((form) => selectedFormIds[form.id])
      .map((form) => ({ formId: form.id, formName: form.name })); // Envia ID e Nome

    if (activeFormsData.length === 0) {
      toast.info(
        "Nenhum formulário selecionado. A lista de formulários vinculados será limpa."
      );
    }

    console.log(
      "Salvando seleção de formulários:",
      activeFormsData,
      "para Page ID:",
      persistedFbConnection.pageId
    );
    setIsSavingForms(true); // <<< Ativa loading
    setFbError(null);
    try {
      const result = await saveLinkedFacebookFormsApi(
        persistedFbConnection.pageId,
        activeFormsData
      );
      toast.success(
        result.message || "Seleção de formulários salva com sucesso!"
      );
    } catch (err) {
      const errorMsg =
        err.error || err.message || "Falha ao salvar seleção de formulários.";
      setFbError(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setIsSavingForms(false); // <<< Desativa loading
    }
  }, [selectedFormIds, pageForms, persistedFbConnection.pageId]);

  // --- Renderização ---

  if (isLoadingStatus && isLoadingGoogleContacts) {
    return (
      <div className="integrations-page loading">
        <p>Verificando status das integrações...</p>
      </div>
    );
  }

  const facebookLoginButtonText = persistedFbConnection.isConnected
    ? "Reconectar / Alterar Página"
    : "Conectar Conta do Facebook";

  return (
    <div className="integrations-page admin-page">
      <h1>Integrações</h1>
      <p>
        Conecte suas contas de serviços externos para automatizar tarefas e
        receber leads.
      </p>

      <div className="integrations-container">
        {/* Card Google Workspace */}
        <div className="integration-card">
          <h2>Google Workspace</h2>
          <p>
            Conecte sua conta Google para futuras integrações com Agenda, Gmail,
            Contatos e Drive.
          </p>
          <ul>
            <li>Agendar reuniões (Google Meet)</li>
            <li>Enviar e-mails personalizados</li>
            <li>Salvar/Buscar contatos</li>
            <li>Anexar arquivos (futuro)</li>
          </ul>

          <button
            onClick={() => connectGoogle()}
            className="button google-connect-button"
            disabled={isConnectingGoogle}
          >
            {isConnectingGoogle
              ? "Conectando..."
              : "Conectar / Atualizar Permissões Google"}
          </button>

          <button
            onClick={handleOpenGoogleContactsModal} // <<< CHAMA A NOVA FUNÇÃO
            className="button submit-button"
            style={{ marginTop: "10px" }}
            disabled={
              isConnectingGoogle ||
              isLoadingGoogleContacts ||
              isSyncingGoogleContacts ||
              isProcessingImport
            }
          >
            {isLoadingGoogleContacts
              ? "Buscando Contatos..."
              : "Importar Contatos do Google"}{" "}
          </button>

          {/* Mostra apenas se o botão de conectar NÃO estiver em loading */}
          {!isConnectingGoogle && (
            <button
              onClick={handleSyncGoogleContacts}
              className="button submit-button"
              style={{ marginTop: "10px" }}
              disabled={isSyncingGoogleContacts}
            >
              {isSyncingGoogleContacts
                ? "Sincronizando Contatos..."
                : "Sincronizar TODOS os Contatos do Google"}
            </button>
          )}

          {googleError && (
            <p className="error-message" style={{ marginTop: "1rem" }}>
              {googleError}
            </p>
          )}
        </div>

        {/* Card Meta (Facebook/Instagram) */}
<div className="integration-card">
    <h2>Meta (Facebook/Instagram) Lead Ads</h2>
    <p>Conecte sua Página do Facebook para receber automaticamente leads gerados por seus anúncios de cadastro.</p>

    {/* 1. Se estiver carregando o status inicial da conexão FB */}
    {isLoadingStatus ? (
        <p>Verificando status da conexão com Facebook...</p>
    ) : // 2. Se NÃO estiver num fluxo ativo de login/seleção de página do FB (fbUserData é null)
    !fbUserData ? (
        persistedFbConnection.isConnected ? (
            // 2a. JÁ CONECTADO: Mostra status, opções de Reconectar/Desconectar e lista de Formulários
            <div>
                <p style={{ color: 'green', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    ✓ Conectado à Página: {persistedFbConnection.pageName || persistedFbConnection.pageId}
                </p>
                <p><small>Para alterar a página, reconectar sua conta ou configurar formulários, use as opções abaixo.</small></p>
                
                <div style={{marginTop: '1rem', display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    <FacebookLogin
                        appId={facebookAppId || "FB_APP_ID_NOT_CONFIGURED"}
                        autoLoad={false}
                        scope="pages_show_list,pages_manage_metadata,leads_retrieval,pages_read_engagement,ads_management,pages_manage_ads"
                        onSuccess={handleFacebookResponse} // Mesmo handler para iniciar fluxo
                        onFail={(error) => {
                            console.error('Facebook Reconnect/Change Failed!', error);
                            setFbError(error?.status || "Falha ao tentar reconectar com Facebook.");
                            setIsConnectingFb(false); 
                        }}
                        render={renderProps => (
                            <button
                                onClick={() => { setIsConnectingFb(true); renderProps.onClick(); }}
                                disabled={isConnectingFb || isDisconnectingFb || isSavingForms} 
                                className="button facebook-connect-button"
                            >
                                {isConnectingFb && !isFetchingPages ? 'Aguarde...' : 'Reconectar / Alterar Página'}
                            </button>
                        )}
                    />
                    <button
                        onClick={handleDisconnectFacebookPage}
                        className="button delete-button"
                        disabled={isDisconnectingFb || isConnectingFb || isSavingForms}
                        style={{backgroundColor: '#dc3545'}}
                    >
                        {isDisconnectingFb ? 'Desconectando...' : 'Desconectar Página'}
                    </button>
                </div>

                {/* LISTA DE FORMULÁRIOS E BOTÃO SALVAR */}
                {fbFormPermissionError ? (
                    <p style={{ marginTop: '1rem', color: '#FFA500', fontWeight: 'bold' }}>{fbFormPermissionError}</p>
                ) : isLoadingPageForms ? (
                    <p style={{marginTop: '1rem'}}>Carregando formulários da página...</p>
                ) : pageForms.length > 0 ? (
                    <div className="form-selection-section">
                        <h4>Vincular Formulários de Lead Ad Ativos:</h4>
                        <ul className="forms-list-modal">
                            {pageForms.map(form => (
                                <li key={form.id}>
                                    <input type="checkbox" id={`fbform-${form.id}`}
                                        checked={!!selectedFormIds[form.id]}
                                        onChange={() => handleFormSelectionChange(form.id)}
                                        disabled={isSavingForms} />
                                    <label htmlFor={`fbform-${form.id}`}>{form.name} <small>(ID: {form.id} | Status: {form.status})</small></label>
                                </li>
                            ))}
                        </ul>
                        <button 
                            onClick={handleSaveFormSelection} 
                            className="button submit-button" 
                            style={{marginTop: '0.5rem'}} 
                            disabled={isSavingForms || Object.values(selectedFormIds).filter(Boolean).length === 0}
                        >
                            {isSavingForms ? 'Salvando...' : `Salvar Seleção (${Object.values(selectedFormIds).filter(Boolean).length})`}
                        </button>
                    </div>
                ) : (
                     persistedFbConnection.isConnected && <p style={{marginTop: '1rem', color: '#6c757d'}}>Nenhum formulário de Lead Ad encontrado para esta página.</p>
                )}
            </div>
        ) : (
            // 2b. NÃO CONECTADO AINDA (e não em fluxo de login): Mostra botão para conectar pela primeira vez
            <FacebookLogin
                appId={facebookAppId || "FB_APP_ID_NOT_CONFIGURED"}
                autoLoad={false}
                scope="pages_show_list,pages_manage_metadata,leads_retrieval,pages_read_engagement,ads_management,pages_manage_ads"
                onSuccess={handleFacebookResponse}
                onFail={(error) => {
                    console.error('Facebook Login Failed!', error);
                    setFbError(error?.status || "Falha no login com Facebook.");
                    setIsConnectingFb(false);
                }}
                render={renderProps => (
                    <button
                        onClick={() => { setIsConnectingFb(true); renderProps.onClick(); }}
                        disabled={isConnectingFb || !facebookAppId}
                        className="button facebook-connect-button"
                    >
                        {isConnectingFb ? 'Aguarde...' : 'Conectar Conta do Facebook'}
                    </button>
                )}
            />
        )
    ) : (
        // 3. SE fbUserData EXISTE (usuário acabou de logar/autorizar no FB e estamos no fluxo de seleção de página ANTES de confirmar)
        <div>
            <p style={{ color: '#333', fontWeight: '500', marginBottom: '0.5rem' }}>
                Logado no Facebook como: {fbUserData.name}!
            </p>
            {isFetchingPages ? (
                <p>Buscando suas Páginas do Facebook...</p>
            ) : facebookPages.length > 0 ? (
                <div className="form-group" style={{marginTop: '1rem'}}>
                    <label htmlFor="facebookPageSelect" style={{fontWeight: '600', display:'block', marginBottom:'0.5rem'}}>
                        Selecione a Página do Facebook para conectar ao CRM:
                    </label>
                    <select
                        id="facebookPageSelect"
                        value={selectedPageId}
                        onChange={(e) => setSelectedPageId(e.target.value)}
                        disabled={isConnectingFb} 
                        style={{width: '100%', padding:'0.6rem', marginTop:'0.5rem', marginBottom:'1rem', borderRadius:'4px', border:'1px solid #ccc'}}
                    >
                        {facebookPages.map(page => (
                            <option key={page.id} value={page.id}>
                                {page.name} (ID: {page.id})
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={handleConnectSelectedPage}
                        className="button submit-button"
                        disabled={isConnectingFb || !selectedPageId}
                    >
                        {isConnectingFb ? 'Confirmando...' : 'Confirmar Conexão Desta Página'}
                    </button>
                </div>
            ) : (
                <p style={{marginTop: '1rem', color: '#6c757d'}}>
                    Nenhuma página do Facebook foi encontrada para sua conta ou as permissões necessárias não foram concedidas.
                </p>
            )}
        </div>
    )}
    {/* Exibe erro geral do Facebook, se houver (não o de permissão de formulário que já é tratado acima) */}
    {fbError && !fbFormPermissionError && <p className="error-message" style={{marginTop:'1rem'}}>{fbError}</p>}
</div>

        {/* Placeholder Cards */}
        <div className="integration-card placeholder">
          <h2>WhatsApp Business API</h2>
          <p>
            <i>(Próximas Versões)</i>
          </p>
        </div>
        <div className="integration-card placeholder">
          <h2>Twilio (SMS/Voz)</h2>
          <p>
            <i>(Próximas Versões)</i>
          </p>
        </div>

        {/* <<< MODAL PARA LISTAR/SELECIONAR CONTATOS GOOGLE >>> */}
        {isGoogleContactsModalOpen && (
          <div
            className="form-modal-overlay"
            onClick={() => {
              if (!isProcessingImport) setIsGoogleContactsModalOpen(false);
            }}
          >
            <div
              className="form-modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "700px" }}
            >
              <h2>Importar Contatos do Google</h2>
              {isLoadingGoogleContacts ? (
                <p>Carregando contatos...</p>
              ) : googleContactsList.length > 0 ? (
                <>
                  <p style={{ marginBottom: "10px" }}>
                    Selecione os contatos que deseja importar como leads:
                  </p>
                  <ul className="contacts-list-modal">
                    {googleContactsList.map((contact) => (
                      <li key={contact.googleContactId}>
                        <input
                          type="checkbox"
                          id={`gc-${contact.googleContactId}`}
                          checked={
                            !!selectedGoogleContacts[contact.googleContactId]
                          }
                          onChange={() =>
                            handleGoogleContactSelectionChange(
                              contact.googleContactId
                            )
                          }
                          disabled={isProcessingImport}
                        />
                        <label htmlFor={`gc-${contact.googleContactId}`}>
                          <strong>{contact.displayName}</strong>
                          {contact.email && ` - ${contact.email}`}
                          {contact.phone && ` (${contact.phone})`}
                          {contact.organization &&
                            ` | Empresa: ${contact.organization}`}
                          {contact.notes && (
                            <>
                              <br />
                              <small>
                                Notas: {contact.notes.substring(0, 100)}
                                {contact.notes.length > 100 ? "..." : ""}
                              </small>
                            </>
                          )}
                        </label>
                      </li>
                    ))}
                  </ul>
                  <div className="form-actions">
                    {/* TODO: Adicionar botão "Selecionar Todos/Nenhum" aqui */}
                    <button
                      onClick={handleImportSelectedGoogleContacts}
                      className="button submit-button"
                      disabled={
                        isProcessingImport ||
                        Object.keys(selectedGoogleContacts).filter(
                          (k) => selectedGoogleContacts[k]
                        ).length === 0
                      }
                    >
                      {isProcessingImport
                        ? "Importando..."
                        : `Importar Selecionados (${
                            Object.keys(selectedGoogleContacts).filter(
                              (k) => selectedGoogleContacts[k]
                            ).length
                          })`}
                    </button>
                    <button
                      type="button"
                      className="button cancel-button"
                      onClick={() => setIsGoogleContactsModalOpen(false)}
                      disabled={isProcessingImport}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <p>Nenhum contato novo encontrado para importação.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default IntegrationsPage;
