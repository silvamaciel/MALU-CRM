// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Precisamos buscar o usuário associado ao token

const protect = async (req, res, next) => {
  let token;

  // Verifica se o token está no cabeçalho Authorization e começa com Bearer
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // 1. Extrai o token (remove o 'Bearer ')
      token = req.headers.authorization.split(' ')[1];

      // 2. Verifica e decodifica o token usando o segredo
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Encontra o usuário no DB pelo ID que está no token
      //    e anexa o usuário ao objeto req (sem a senha) para uso posterior nas rotas
      req.user = await User.findById(decoded.userId).select('-senha'); // Exclui a senha

      if (!req.user) {
          // Se o usuário associado ao token válido não existe mais no DB
         return res.status(401).json({ error: 'Usuário não encontrado/Token inválido.' });
      }

      next();

    } catch (error) {
      console.error('Erro na autenticação do token:', error.message);
       if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token inválido.' });
       }
       if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado.' });
       }
      res.status(401).json({ error: 'Não autorizado, falha no token.' });
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Não autorizado, token não fornecido.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.perfil)) {
      return res.status(403).json({ error: 'Acesso negado: permissão insuficiente.' }); // 403 Forbidden
    }
    next();
  };
};


module.exports = { protect, authorize }; 