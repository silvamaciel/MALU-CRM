// src/pages/Login/LoginPage.js
import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode"; 
import { loginWithGoogle, loginWithPassword } from '../../api/auth';
import './LoginPage.css'; 

function LoginPage({ onLoginSuccess }) { // Recebe uma função para chamar após login bem-sucedido
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const DEMO_EMAIL = 'teste@crmmalu.com'; 
  const DEMO_PASSWORD = 'senhaSuperSecretaParaTeste'; 


  // Chamado quando o login com Google é BEM SUCEDIDO no lado do Google
  const handleLoginSuccess = async (credentialResponse) => {
    setError(null);
    setIsLoading(true);
    console.log("Google Login Success! CredentialResponse:", credentialResponse);

    // O credentialResponse.credential é o ID Token JWT que o Google fornece
    const idToken = credentialResponse.credential;

    if (idToken) {
      try {
        // Opcional: Decodificar para ver as infos (nome, email, etc.)
        const decodedToken = jwtDecode(idToken);
        console.log("Decoded ID Token:", decodedToken);

        // <<< Envia o ID Token para o seu backend >>>
        const backendResponse = await loginWithGoogle(idToken);

        // <<< AQUI: Lógica após receber a resposta do SEU backend >>>
        // Exemplo: Salvar o token JWT da SUA aplicação no localStorage e chamar onLoginSuccess
        if (backendResponse && backendResponse.token) {
          console.log("Login no backend bem-sucedido, recebido token:", backendResponse.token);
          localStorage.setItem('userToken', backendResponse.token); // Salva o token localmente
          localStorage.setItem('userData', JSON.stringify(backendResponse.user || {})); // Salva dados do usuário
          if (typeof onLoginSuccess === 'function') {
            onLoginSuccess(); // Notifica o App.js que o login foi feito
          }
        } else {
           throw new Error("Resposta inválida do servidor após login.");
        }

      } catch (err) {
        console.error("Erro no processo de login:", err);
        setError(err.message || "Falha no login. Tente novamente.");
        // Limpa token se deu erro
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      } finally {
        setIsLoading(false);
      }
    } else {
      setError("Não foi possível obter as credenciais do Google.");
      setIsLoading(false);
    }
  };


  // login local (email/senha)  
  const handleLocalLoginSubmit = async (e) => {
    e.preventDefault(); // Previne envio padrão do form
    setError(null); setIsLoading(true);

    if (!email || !password) {
         setError("Email e Senha são obrigatórios.");
         setIsLoading(false);
         return;
    }

    try {
       // Chama a API de login local
       const backendResponse = await loginWithPassword(email, password);
       if (backendResponse && backendResponse.token) {
           localStorage.setItem('userToken', backendResponse.token);
           localStorage.setItem('userData', JSON.stringify(backendResponse.user || {}));
           if (typeof onLoginSuccess === 'function') { onLoginSuccess(); }
       } else { throw new Error("Resposta inválida do servidor."); }
    } catch(err) {
        setError(err.message || "Falha no login local."); console.error("Erro Login Local:", err);
        localStorage.removeItem('userToken'); localStorage.removeItem('userData');
    } finally {
        setIsLoading(false);
    }
 };


 const handleDemoLogin = () => {
  setEmail(DEMO_EMAIL);
  setPassword(DEMO_PASSWORD);
  toast.info(`Credenciais de teste preenchidas. Clique em "Entrar".`, { autoClose: 1500});
};

  // Chamado quando há erro NO PROCESSO de login do Google
  const handleLoginError = () => {
    console.error("Google Login Failed");
    setError("Falha ao tentar fazer login com o Google. Verifique pop-ups bloqueados ou tente novamente.");
    setIsLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>Login - CRM Imobiliário</h1>


        {/* --- Formulário de Login Local --- */}
        <form onSubmit={handleLocalLoginSubmit} className="local-login-form">
           <div className="form-group">
               <label htmlFor="email">Email:</label>
               <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
               />
           </div>
           <div className="form-group">
               <label htmlFor="password">Senha:</label>
               <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
               />
           </div>
           {/* Link "Esqueci Senha" (Futuro) */}
           {/* <a href="/forgot-password">Esqueci minha senha</a> */}
           <button type="submit" className="button login-button" disabled={isLoading}>
               {isLoading ? 'Entrando...' : 'Entrar'}
           </button>
        </form>
        {/* --- Fim Formulário Local --- */}

        <div className="divider"><span>OU</span></div>

        <p>Entre com sua conta Google para continuar.</p>

        {isLoading && <p>Processando login...</p>}
        {error && <p className="error-message">{error}</p>}

        <div className="google-login-button-container">
          {!isLoading && (
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={handleLoginError}
              useOneTap // Opcional: tenta login automático se já logado no Google
              // theme="filled_blue" // Outras opções de tema/aparência
              // size="large"
            />
          )}
        </div>

        {/* --- Botão Login Teste --- */}
        <div className="demo-login-container">
            <button type="button" onClick={handleDemoLogin} className="button demo-button" disabled={isLoading}>
               Entrar como Teste
            </button>
         </div>
         {/* --- Fim Botão Teste --- */}

         {/* Mensagem de Erro */}
        {error && <p className="error-message">{error}</p>}
        {/* Mensagem de Loading Geral */}
        {isLoading && <p>Processando...</p>}

      </div>
    </div>
  );
}

export default LoginPage;