// src/pages/Login/LoginPage.js
import React, { useState, useCallback } from 'react'; 
import { useGoogleLogin } from '@react-oauth/google';
import { sendGoogleAuthCode, loginWithPassword } from '../../api/auth';
import './LoginPage.css';
import googleIcon from '../../assets/icons-google.svg';
import maluIcon from "../../assets/malucrmhorizontal.png";

//quem sabe vou usar depois
//import { toast } from 'react-toastify';
// import { jwtDecode } from "jwt-decode"; 


// Credenciais Demo
const DEMO_EMAIL = 'teste@crmmalu.com'; 
const DEMO_PASSWORD = 'senhaSuperSecretaParaTeste';

function LoginPage({ onLoginSuccess }) {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- Configuração e Chamada do Hook useGoogleLogin ---
  const googleLogin = useGoogleLogin({ // <<< 1. Chama o hook e guarda a função de disparo
      flow: 'auth-code',
      scope: `openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/drive.file`,
      onSuccess: async (codeResponse) => { // <<< Lógica de SUCESSO do Google >>>
          setError(null); setIsLoading(true);
          console.log("Google Auth Code Response:", codeResponse);
          const authCode = codeResponse.code;

          if (authCode) {
              try {
                  // Envia o CÓDIGO para o backend
                  const backendResponse = await sendGoogleAuthCode(authCode);
                  if (backendResponse && backendResponse.token) {
                      localStorage.setItem('userToken', backendResponse.token);
                      localStorage.setItem('userData', JSON.stringify(backendResponse.user || {}));
                      if (typeof onLoginSuccess === 'function') { onLoginSuccess(); }
                  } else { throw new Error("Resposta inválida do servidor."); }
              } catch (err) {
                  setError(err.message || "Falha na comunicação com o servidor após login Google."); console.error("Erro Login Google:", err);
                  localStorage.removeItem('userToken'); localStorage.removeItem('userData');
              } finally { setIsLoading(false); }
          } else {
              setError("Não foi possível obter o código de autorização do Google."); setIsLoading(false);
          }
      },
      onError: (errorResponse) => { // <<< Lógica de ERRO do Google >>>
          console.error("Google Login Flow Error:", errorResponse);
          setError("Falha ao iniciar login com Google. Verifique pop-ups ou tente novamente.");
          setIsLoading(false);
      }
  });
  // --- Fim Configuração Hook ---

  // --- Handler Login Local (Email/Senha) ---
  const handleLocalLoginSubmit = useCallback(async (e) => { // Adicionado useCallback
     e.preventDefault(); setError(null); setIsLoading(true);
     if (!email || !password) { setError("Email e Senha são obrigatórios."); setIsLoading(false); return; }
     try {
        const backendResponse = await loginWithPassword(email, password);
        if (backendResponse && backendResponse.token) {
            localStorage.setItem('userToken', backendResponse.token);
            localStorage.setItem('userData', JSON.stringify(backendResponse.user || {}));
            if (typeof onLoginSuccess === 'function') { onLoginSuccess(); }
        } else { throw new Error("Resposta inválida do servidor."); }
     } catch(err) {
         setError(err.message || "Falha no login local."); console.error("Erro Login Local:", err);
         localStorage.removeItem('userToken'); localStorage.removeItem('userData');
     } finally { setIsLoading(false); }
  }, [email, password, onLoginSuccess]);

   // --- Handler Botão Teste ---
   const handleDemoLogin = useCallback(async () => { // Adicionado useCallback
       setError(null); setIsLoading(true);
       console.log("Tentando login com credenciais Demo...");
       try {
           const backendResponse = await loginWithPassword(DEMO_EMAIL, DEMO_PASSWORD);
           if (backendResponse && backendResponse.token) {
               localStorage.setItem('userToken', backendResponse.token);
               localStorage.setItem('userData', JSON.stringify(backendResponse.user || {}));
               if (typeof onLoginSuccess === 'function') { onLoginSuccess(); }
           } else { throw new Error("Resposta inválida do servidor no login de teste."); }
        } catch(err) {
            setError(err.message || "Falha no login de demonstração."); console.error("Erro Login Demo:", err);
            localStorage.removeItem('userToken'); localStorage.removeItem('userData');
        } finally { setIsLoading(false); }
   }, [onLoginSuccess]);

  return (
    <div className="login-page">
      <div className="login-box">
        {/* Cabeçalho do Sidebar com Logo */}
         <img src={maluIcon} alt="Logo" style={{ height: "98px" }} />
        {/* Formulário de Login Local */}
        <form onSubmit={handleLocalLoginSubmit} className="local-login-form">
           <div className="form-group">
               <label htmlFor="email">Email:</label>
               <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading}/>
           </div>
           <div className="form-group">
               <label htmlFor="password">Senha:</label>
               <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading}/>
           </div>
           <button type="submit" className="button login-button" disabled={isLoading}>
               {isLoading ? 'Entrando...' : 'Entrar'}
           </button>
        </form>

        <div className="divider"><span>OU</span></div>

        {/* Botão Google Login */}
        <div className="google-login-button-container">
          <button type="button" onClick={() => googleLogin()} className="button google-login-button" disabled={isLoading}>
              <img src={googleIcon}  alt="Google icon" width="20" height="20" style={{marginRight: '10px', verticalAlign: 'middle'}}/>
              Entrar com Google
          </button>
        </div>

         {/* Botão Login Teste */}

        {/* Mensagem de Erro/Loading */}
        {error && <p className="error-message">{error}</p>}
        {isLoading && <p style={{ marginTop: '1rem' }}>Processando...</p>}

      </div>
    </div>
  );
}

export default LoginPage;