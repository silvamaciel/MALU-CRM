// src/pages/Login/LoginPage.js
import React, { useState, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { sendGoogleAuthCode, loginWithPassword } from '../../api/auth';
import './LoginPage.css';
import googleIcon from '../../assets/icons-google.svg';
import maluIcon from '../../assets/malucrmhorizontal.png';

// Credenciais Demo (opcional)
const DEMO_EMAIL = 'teste@crmmalu.com';
const DEMO_PASSWORD = 'senhaSuperSecretaParaTeste';

function LoginPage({ onLoginSuccess }) {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- Google OAuth ---
  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    scope:
      'openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/drive.file',
    onSuccess: async (codeResponse) => {
      setError(null);
      setIsLoading(true);
      try {
        const authCode = codeResponse?.code;
        if (!authCode) throw new Error('Não foi possível obter o código de autorização do Google.');
        const backendResponse = await sendGoogleAuthCode(authCode);
        if (backendResponse?.token) {
          localStorage.setItem('userToken', backendResponse.token);
          localStorage.setItem('userData', JSON.stringify(backendResponse.user || {}));
          typeof onLoginSuccess === 'function' && onLoginSuccess();
        } else {
          throw new Error('Resposta inválida do servidor.');
        }
      } catch (err) {
        console.error('Erro Login Google:', err);
        setError(err.message || 'Falha na comunicação com o servidor após login Google.');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      } finally {
        setIsLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.error('Google Login Flow Error:', errorResponse);
      setError('Falha ao iniciar login com Google. Verifique pop-ups ou tente novamente.');
      setIsLoading(false);
    },
  });

  // --- Login local (email/senha) ---
  const handleLocalLoginSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError(null);
      setIsLoading(true);
      if (!email || !password) {
        setError('Email e Senha são obrigatórios.');
        setIsLoading(false);
        return;
      }
      try {
        const backendResponse = await loginWithPassword(email, password);
        if (backendResponse?.token) {
          localStorage.setItem('userToken', backendResponse.token);
          localStorage.setItem('userData', JSON.stringify(backendResponse.user || {}));
          typeof onLoginSuccess === 'function' && onLoginSuccess();
        } else {
          throw new Error('Resposta inválida do servidor.');
        }
      } catch (err) {
        console.error('Erro Login Local:', err);
        setError(err.message || 'Falha no login local.');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, onLoginSuccess]
  );

  // --- Login Demo (opcional) ---
  const handleDemoLogin = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const backendResponse = await loginWithPassword(DEMO_EMAIL, DEMO_PASSWORD);
      if (backendResponse?.token) {
        localStorage.setItem('userToken', backendResponse.token);
        localStorage.setItem('userData', JSON.stringify(backendResponse.user || {}));
        typeof onLoginSuccess === 'function' && onLoginSuccess();
      } else {
        throw new Error('Resposta inválida do servidor no login de teste.');
      }
    } catch (err) {
      console.error('Erro Login Demo:', err);
      setError(err.message || 'Falha no login de demonstração.');
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
    } finally {
      setIsLoading(false);
    }
  }, [onLoginSuccess]);

  return (
    <div className="login-page">
      <div className="login-box">
        <img src={maluIcon} alt="Logo" style={{ height: '98px' }} />

        <form onSubmit={handleLocalLoginSubmit} className="local-login-form" noValidate>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              aria-invalid={!!error}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha:</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {/* Removido a classe genérica "button" para não herdar estilos globais */}
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="divider">
          <span>OU</span>
        </div>

        <div className="google-login-button-container">
          {/* Removido a classe genérica "button" aqui também */}
          <button
            type="button"
            onClick={() => googleLogin()}
            className="google-login-button"
            disabled={isLoading}
            aria-label="Entrar com Google"
          >
            <img
              src={googleIcon}
              alt="Google icon"
              width="20"
              height="20"
              style={{ marginRight: '10px', verticalAlign: 'middle' }}
            />
            Entrar com Google
          </button>
        </div>

        {/* Botão Demo (opcional). Se não quiser exibir, pode remover este bloco */}
        {/* <div className="demo-login-container">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="demo-button"
            disabled={isLoading}
          >
            Usar conta de demonstração
          </button>
        </div> */}

        {error && <p className="error-message">{error}</p>}
        {isLoading && <p style={{ marginTop: '1rem' }}>Processando...</p>}
      </div>
    </div>
  );
}

export default LoginPage;
