import React, { useState, useEffect, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { sendGoogleAuthCode } from '../../api/auth';
import { toast } from 'react-toastify';
import FacebookLogin from '@greatsumini/react-facebook-login';
import axios from 'axios';
import { connectFacebookPage, getFacebookConnectionStatus } from '../../api/integrations'; // Verifique o caminho!
import './IntegrationsPage.css';

const facebookAppId = process.env.REACT_APP_FACEBOOK_APP_ID || process.env.VITE_FACEBOOK_APP_ID;
const GRAPH_API_VERSION = 'v22.0';

if (!facebookAppId) {
    console.error("ERRO CRÍTICO: Facebook App ID não definido nas variáveis de ambiente!");
}

function IntegrationsPage() {
    // Google States
    const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
    const [googleError, setGoogleError] = useState(null);

    // Facebook States
    const [isConnectingFb, setIsConnectingFb] = useState(false); // Usado para qualquer ação FB
    const [fbError, setFbError] = useState(null);
    const [fbUserData, setFbUserData] = useState(null); // Token temp do usuário FB e nome
    const [facebookPages, setFacebookPages] = useState([]);
    const [selectedPageId, setSelectedPageId] = useState('');
    const [isFetchingPages, setIsFetchingPages] = useState(false);
    const [isDisconnectingFb, setIsDisconnectingFb] = useState(false);


    // Persisted Facebook Connection Status
    const [persistedFbConnection, setPersistedFbConnection] = useState({
        isConnected: false, pageId: null, pageName: null
    });
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);

    // --- Google OAuth Logic ---
    const connectGoogle = useGoogleLogin({
        flow: 'auth-code',
        scope: `openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/drive.file`,
        onSuccess: async (codeResponse) => {
            setGoogleError(null); setIsConnectingGoogle(true);
            console.log("Google Auth Code Response (Integrations):", codeResponse);
            try {
                await sendGoogleAuthCode(codeResponse.code);
                toast.success("Conta Google conectada/permissões atualizadas!");
                // TODO: Talvez chamar um fetchStatus para Google aqui também
            } catch (err) {
                const errorMsg = err.message || "Falha ao conectar com Google.";
                setGoogleError(errorMsg); toast.error(errorMsg); console.error(err);
            } finally {
                setIsConnectingGoogle(false);
            }
        },
        onError: (errorResponse) => {
            console.error("Google Login Flow Error (Integrations):", errorResponse);
            setGoogleError("Falha ao iniciar conexão com Google."); toast.error("Falha ao iniciar conexão com Google.");
            setIsConnectingGoogle(false);
        },
    });

    // --- Facebook Logic ---
    // Função para buscar o status da conexão FB no backend
    const fetchFacebookStatus = useCallback(async () => {
        setIsLoadingStatus(true);
        try {
            const status = await getFacebookConnectionStatus();
            console.log("DEBUG: Status recebido de getFacebookConnectionStatus():", JSON.stringify(status, null, 2));
            setPersistedFbConnection(status);
            console.log("DEBUG: Estado persistedFbConnection APÓS set:", JSON.stringify(status, null, 2));
        } catch (err) {
            console.error("Erro ao buscar status da integração FB:", err);
            toast.error("Não foi possível verificar o status da integração com Facebook.");
            setPersistedFbConnection({ isConnected: false, pageId: null, pageName: null }); // Reseta em caso de erro
        } finally {
            setIsLoadingStatus(false);
        }
    }, []); // Roda uma vez no mount ou quando chamado

    useEffect(() => {
        fetchFacebookStatus();
    }, [fetchFacebookStatus]); 
    

    useEffect(() => {
        if (!selectedPageId && facebookPages.length > 0) {
            setSelectedPageId(facebookPages[0].id); // <- isso garante que sempre tenha algo selecionado
        }
    }, [facebookPages, selectedPageId]);


    // Callback do componente FacebookLogin
    const handleFacebookResponse = useCallback(async (response) => {
        console.log("Facebook Login Response (onSuccess/onProfileSuccess):", response);
        setFbError(null);
    
        if (response && response.accessToken && response.userID) {
            const userAccessToken = response.accessToken;
            setFbUserData({
                accessToken: userAccessToken,
                userID: response.userID,
                name: response.name || `Usuário ${response.userID}`
            });
    
            setIsFetchingPages(true);
            setFacebookPages([]); 
            setSelectedPageId('');
            try {
                const pagesResponse = await axios.get(
                    `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts`,
                    { params: { access_token: userAccessToken, fields: 'id,name,tasks' } }
                );
                console.log("Páginas do Facebook encontradas:", pagesResponse.data);
                const pages = Array.isArray(pagesResponse.data?.data) ? pagesResponse.data.data : [];
                
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
                const errorMsg = errorData?.message || "Falha ao buscar suas Páginas do Facebook.";
                setFbError(errorMsg); 
                toast.error(errorMsg); 
                setFacebookPages([]);
            } finally {
                setIsFetchingPages(false);
                setIsConnectingFb(false);
            }
        } else if (response && response.status === "not_authorized") {
            const errorMsg = "Permissões não concedidas no Facebook.";
            setFbError(errorMsg); toast.warn(errorMsg); 
            setIsConnectingFb(false); 
        } else {
            const errorMsg = "Falha na autenticação com Facebook: resposta inesperada ou token não recebido.";
            setFbError(errorMsg); toast.error(errorMsg); 
            setIsConnectingFb(false); 
        }
    }, []);


    // Handler para enviar a página selecionada ao backend
    const handleConnectSelectedPage = useCallback(async () => {
        if (!selectedPageId || !fbUserData?.accessToken) {
            toast.error("Selecione uma página e garanta conexão ao Facebook."); return;
        }
        console.log("DEBUG HCS: INÍCIO - Definindo isConnectingFb para true.");
        setIsConnectingFb(true); setFbError(null);
        console.log(`DEBUG HCS: Enviando para backend: PageID=<span class="math-inline">\{selectedPageId\}, UserToken\=</span>{fbUserData.accessToken.substring(0,15)}...`);
        console.log(`Enviando para backend: PageID=${selectedPageId}, UserToken=${fbUserData.accessToken.substring(0,10)}...`);
        try {
            console.log("DEBUG HCS: Antes da chamada API connectFacebookPage.");
            const result = await connectFacebookPage(selectedPageId, fbUserData.accessToken);
            console.log("DEBUG HCS: DEPOIS da chamada API connectFacebookPage. Resultado:", result);

            toast.success(result.message || `Página conectada e webhook configurado!`);
            console.log("DEBUG HCS: Antes da chamada fetchFacebookStatus.");

            await fetchFacebookStatus(); // <<< ATUALIZA O STATUS GERAL APÓS CONECTAR
            console.log("DEBUG HCS: DEPOIS da chamada fetchFacebookStatus.");
            console.log("DEBUG HCS: Resetando fbUserData, facebookPages, selectedPageId.");


            setFbUserData(null); // <<< RESETA O FLUXO DE LOGIN FB
            setFacebookPages([]); // Limpa lista de seleção
            setSelectedPageId('');
            console.log("DEBUG HCS: FIM do bloco TRY.");

        } catch (err) {
            console.error("DEBUG HCS: ERRO no bloco TRY:", err);

            const errorMsg = err.error || err.message || "Falha ao conectar página no backend.";
            setFbError(errorMsg); toast.error(errorMsg); console.error(err);
        } finally {
            console.log("DEBUG HCS: Bloco FINALLY - Definindo isConnectingFb para false.");
            setIsConnectingFb(false);
        }
    }, [selectedPageId, fbUserData, fetchFacebookStatus]); // Adiciona fetchFacebookStatus


    // --- Renderização ---

    console.log("DEBUG RENDER: isLoadingStatus:", isLoadingStatus);
    console.log("DEBUG RENDER: persistedFbConnection:", JSON.stringify(persistedFbConnection, null, 2));
    console.log("DEBUG RENDER: fbUserData:", JSON.stringify(fbUserData, null, 2));
    if (isLoadingStatus) {
        return <div className="integrations-page loading"><p>Verificando status das integrações...</p></div>;
    }

    const facebookLoginButtonText = persistedFbConnection.isConnected ? 'Reconectar / Alterar Página' : 'Conectar Conta do Facebook';

    return (
        <div className="integrations-page admin-page">
            <h1>Integrações</h1>
            <p>Conecte suas contas de serviços externos para automatizar tarefas e receber leads.</p>

            <div className="integrations-container">
                {/* Card Google Workspace */}
                <div className="integration-card">
                    <h2>Google Workspace</h2>
                    <p>Conecte sua conta Google para futuras integrações com Agenda, Gmail, Contatos e Drive.</p>
                    <ul>
                        <li>Agendar reuniões (Google Meet)</li>
                        <li>Enviar e-mails personalizados</li>
                        <li>Salvar/Buscar contatos</li>
                        <li>Anexar arquivos (futuro)</li>
                    </ul>
                    <button onClick={() => connectGoogle()} className="button google-connect-button" disabled={isConnectingGoogle}>
                        {isConnectingGoogle ? 'Conectando...' : 'Conectar / Atualizar Permissões Google'}
                    </button>
                    {googleError && <p className="error-message" style={{marginTop:'1rem'}}>{googleError}</p>}
                </div>

                {/* Card Meta (Facebook/Instagram) */}
                <div className="integration-card">
                    <h2>Meta (Facebook/Instagram) Lead Ads</h2>
                    <p>Conecte sua Página do Facebook para receber automaticamente leads gerados por seus anúncios de cadastro.</p>

                    {/* Se uma página já está conectada e não estamos no meio de um novo fluxo FB */}
                    {persistedFbConnection.isConnected && !fbUserData && (
                        <div style={{ marginBottom: '1rem' }}>
                            <p style={{ color: 'green', fontWeight: 'bold' }}>
                                ✓ Conectado à Página: {persistedFbConnection.pageName || persistedFbConnection.pageId}
                            </p>
                            <p><small>Para alterar a página ou reconectar sua conta Facebook, clique abaixo.</small></p>
                        </div>
                    )}

                    {/* Botão de Login/Conexão com Facebook OU UI de seleção de página */}
                    {!fbUserData ? (
                        // Se não há fbUserData (token de usuário FB da sessão atual), mostra o botão de login/conexão
                        <FacebookLogin
                            appId={facebookAppId || "FB_APP_ID_NOT_CONFIGURED"}
                            autoLoad={false}
                            scope="pages_show_list,pages_manage_metadata,leads_retrieval"
                            onSuccess={handleFacebookResponse} // Callback que recebe accessToken e userID
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
                                    {isConnectingFb ? 'Aguarde...' : facebookLoginButtonText}
                                </button>
                            )}
                        />
                    ) : (
                        // Se fbUserData existe (usuário acabou de logar/autorizar no FB), mostra seleção de página
                        <div>
                            <p style={{ color: '#333', fontWeight: '500' }}>
                                Logado no Facebook como: {fbUserData.name}!
                            </p>
                            {isFetchingPages ? (
                                <p>Buscando suas Páginas do Facebook...</p>
                            ) : facebookPages.length > 0 ? (
                                <div className="form-group" style={{marginTop: '1rem'}}>
                                    <label htmlFor="facebookPageSelect" style={{fontWeight: '600'}}>Selecione a Página para integrar:</label>
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
                    {fbError && <p className="error-message" style={{marginTop:'1rem'}}>{fbError}</p>}
                </div>

                {/* Placeholder Cards */}
                <div className="integration-card placeholder"><h2>WhatsApp Business API</h2><p><i>(Próximas Versões)</i></p></div>
                <div className="integration-card placeholder"><h2>Twilio (SMS/Voz)</h2><p><i>(Próximas Versões)</i></p></div>
            </div>
        </div>
    );
}

export default IntegrationsPage;