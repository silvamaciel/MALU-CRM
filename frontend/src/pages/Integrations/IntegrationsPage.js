import React, { useState, useCallback } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { sendGoogleAuthCode } from "../../api/auth";
import { toast } from "react-toastify";
import FacebookLogin from "@greatsumini/react-facebook-login";
import axios from "axios";
import {
  connectFacebookPage,
  getFacebookConnectionStatus,
} from "../../api/integrations"; // API para conectar página FB no seu backend
import "./IntegrationsPage.css"; // CSS da página

const facebookAppId =
  process.env.REACT_APP_FACEBOOK_APP_ID || process.env.VITE_FACEBOOK_APP_ID;
const GRAPH_API_VERSION = "v22.0";

if (!facebookAppId) {
  console.error(
    "ERRO CRÍTICO: Facebook App ID não definido nas variáveis de ambiente (REACT_APP_FACEBOOK_APP_ID ou VITE_FACEBOOK_APP_ID)"
  );
}

function IntegrationsPage() {
  // --- State Hooks ---
  // Google
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState(null);

  // Facebook
  const [isConnectingFb, setIsConnectingFb] = useState(false);
  const [fbError, setFbError] = useState(null);
  const [fbUserData, setFbUserData] = useState(null); // Guarda dados após login FB (token, id, nome)
  const [facebookPages, setFacebookPages] = useState([]); // Lista de páginas do FB
  const [selectedPageId, setSelectedPageId] = useState(""); // ID da página FB selecionada
  const [isFetchingPages, setIsFetchingPages] = useState(false); // Loading da busca de páginas

  //Guardar status persistido da conexão com o FB
  const [persistedFbConnection, setPersistedFbConnection] = useState({
    isConnected: false,
    pageId: null,
    pageName: null,
  });
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // --- Google OAuth Logic ---
  const connectGoogle = useGoogleLogin({
    flow: "auth-code", // Fluxo necessário para obter refresh token no backend
    scope: `openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/drive.file`,
    onSuccess: async (codeResponse) => {
      setGoogleError(null);
      setIsConnectingGoogle(true);
      console.log("Google Auth Code Response (Integrations):", codeResponse);
      try {
        // Envia o código para o backend processar
        await sendGoogleAuthCode(codeResponse.code);
        toast.success("Conta Google conectada/permissões atualizadas!");
        // TODO: Adicionar um indicador visual de "Conectado" para o Google
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

  // --- Facebook OAuth & Page Fetching Logic ---
  const handleFacebookResponse = useCallback(async (response) => {
    console.log("Facebook Login Response:", response);
    setFbError(null);
    setIsConnectingFb(true); // Mantém loading enquanto busca páginas

    if (response && response.accessToken && response.userID) {
      const userAccessToken = response.accessToken;
      toast.success("Autorização Facebook concedida! Buscando páginas...");
      setFbUserData({
        accessToken: userAccessToken,
        userID: response.userID,
        name: response.name || `User ${response.userID}`,
      });

      // Buscar Páginas
      setIsFetchingPages(true);
      setFacebookPages([]); // Limpa lista anterior
      setSelectedPageId(""); // Limpa seleção anterior
      try {
        const pagesResponse = await axios.get(
          `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts`,
          {
            params: {
              access_token:
                userAccessToken /* fields: 'id,name,tasks' // Pode pedir 'tasks' se quiser filtrar por permissão */,
            },
          }
        );
        console.log("Páginas encontradas:", pagesResponse.data);
        const pages = Array.isArray(pagesResponse.data?.data)
          ? pagesResponse.data.data
          : [];
        setFacebookPages(pages);

        if (pages.length > 0) {
          setSelectedPageId(pages[0].id); // Pré-seleciona a primeira
          toast.info("Selecione a Página do Facebook para integrar.");
        } else {
          toast.warn(
            "Nenhuma Página do Facebook encontrada ou permissível para esta conta."
          );
          setFbError("Nenhuma Página encontrada.");
          // setFbUserData(null); // Decide se quer resetar a conexão FB aqui
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
        setIsConnectingFb(false); // Finaliza loading geral da conexão FB
      }
    } else if (response && response.status === "not_authorized") {
      const errorMsg = "Permissões não concedidas no Facebook.";
      setFbError(errorMsg);
      toast.warn(errorMsg);
      setIsConnectingFb(false);
    } else {
      const errorMsg =
        "Falha na autenticação com Facebook: resposta inesperada.";
      setFbError(errorMsg);
      toast.error(errorMsg);
      setIsConnectingFb(false);
    }
    // Adiciona dependências ao useCallback - Nenhuma externa aqui, mas boa prática se usasse state/props
  }, []);

  // EFEITO para buscar o status da conexão FB ao carregar a página
  useEffect(() => {
    const fetchStatus = async () => {
      setIsLoadingStatus(true);
      try {
        const status = await getFacebookConnectionStatus();
        setPersistedFbConnection(status);
        if (status.isConnected && status.pageId) {
        }
      } catch (err) {
        console.error("Erro ao buscar status da integração FB:", err);
        toast.error(
          "Não foi possível verificar o status da integração com Facebook."
        );
      } finally {
        setIsLoadingStatus(false);
      }
    };
    fetchStatus();
  }, []);

  // --- Handler para Conectar a Página Selecionada ao Backend ---
  const handleConnectSelectedPage = useCallback(async () => {
    if (!selectedPageId || !fbUserData?.accessToken) {
      toast.error("Selecione uma página e garanta conexão ao Facebook.");
      return;
    }
    setIsConnectingFb(true);
    setFbError(null);
    console.log(
      `Enviando para backend: PageID=${selectedPageId}, UserToken=${fbUserData.accessToken.substring(
        0,
        10
      )}...`
    );

    try {
      const result = await connectFacebookPage(
        selectedPageId,
        fbUserData.accessToken
      );
      toast.success(result.message || `Página conectada!`);
      fetchStatus(); // <<< ATUALIZA O STATUS APÓS CONECTAR
      setFacebookPages([]); // Limpa a lista de seleção de páginas
      setFbUserData(null); // Reseta o fluxo de login FB, mostrando o status persistido
    } catch (err) {
      const errorMsg =
        err.error || err.message || "Falha ao conectar página no backend.";
      setFbError(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setIsConnectingFb(false);
    }
    // Adiciona dependências ao useCallback
  }, [selectedPageId, fbUserData, fetchStatus]);

  // --- Renderização ---
  if (isLoadingStatus) {
    return (
      <div className="integrations-page loading">
        <p>Verificando status das integrações...</p>
      </div>
    );
  }

  return (
    <div className="integrations-page admin-page">
      <h1>Integrações</h1>
      <p>
        Conecte suas contas de serviços externos para automatizar tarefas e
        receber leads.
      </p>

      {/* Container para Cards */}
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
          {/* TODO: Adicionar indicador visual se já conectado/permissões OK */}
          <button
            onClick={() => connectGoogle()}
            className="button google-connect-button"
            disabled={isConnectingGoogle}
          >
            {isConnectingGoogle
              ? "Conectando..."
              : "Conectar / Atualizar Permissões Google"}
          </button>
          {googleError && (
            <p className="error-message" style={{ marginTop: "1rem" }}>
              {googleError}
            </p>
          )}
        </div>

        {/* Card Meta (Facebook/Instagram) */}
        <div className="integration-card">
          <h2>Meta (Facebook/Instagram) Lead Ads</h2>
          <p>
            Conecte sua Página do Facebook para receber automaticamente leads
            gerados por seus anúncios de cadastro.
          </p>

          {/* Dropdown de seleção de página (SÓ aparece DEPOIS do login FB e SE houver páginas) */}
          {fbUserData && !isFetchingPages && facebookPages.length > 0 && (
                         <div className="form-group" style={{marginTop: '1rem'}}>
                             <label htmlFor="facebookPageSelect" style={{fontWeight: '600'}}>Selecione a Página para integrar:</label>
                             <select id="facebookPageSelect" value={selectedPageId}
                                 onChange={(e) => setSelectedPageId(e.target.value)} disabled={isConnectingFb}
                                 style={{width: '100%', padding:'0.6rem', marginTop:'0.5rem', marginBottom:'1rem', borderRadius:'4px', border:'1px solid #ccc'}}>
                                 {facebookPages.map(page => (
                                     <option key={page.id} value={page.id}>{page.name} (ID: {page.id})</option>
                                 ))}
                             </select>
                             <button onClick={handleConnectSelectedPage}
                                 className="button submit-button"
                                 disabled={isConnectingFb || !selectedPageId}>
                                 {isConnectingFb ? 'Confirmando...' : 'Confirmar Conexão Desta Página'}
                             </button>
                         </div>
                    )}
                     {fbUserData && !isFetchingPages && facebookPages.length === 0 && !persistedFbConnection.isConnected && (
                         <p style={{marginTop: '1rem', color: '#6c757d'}}>Nenhuma página do Facebook foi encontrada para sua conta após a conexão.</p>
                     )}

                    {fbError && <p className="error-message" style={{marginTop:'1rem'}}>{fbError}</p>}
        </div>

        {/* Placeholder Cards */}
        <div className="integration-card placeholder">
          <h2>WhatsApp Business API</h2>{" "}
          <p>
            <i>(Próximas Versões)</i>
          </p>
        </div>
        <div className="integration-card placeholder">
          <h2>Twilio (SMS/Voz)</h2>{" "}
          <p>
            <i>(Próximas Versões)</i>
          </p>
        </div>
      </div>
    </div>
  );
}

export default IntegrationsPage;
