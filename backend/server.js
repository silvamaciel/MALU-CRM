//backend/server.js


console.log("--- INÍCIO VERIFICAÇÃO VARIÁVEIS DE AMBIENTE (server.js) ---");
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CLIENT_SECRET EXISTE?:", process.env.GOOGLE_CLIENT_SECRET ? 'Sim, configurado' : 'NÃO CONFIGURADO ou VAZIO');
console.log("GOOGLE_OAUTH_REDIRECT_URI:", process.env.GOOGLE_OAUTH_REDIRECT_URI);
console.log("FACEBOOK_APP_ID (do backend):", process.env.REACT_APP_FACEBOOK_APP_ID);
console.log("FB_APP_SECRET EXISTE?:", process.env.FB_APP_SECRET ? 'Sim, configurado' : 'NÃO CONFIGURADO ou VAZIO');
console.log("FB_VERIFY_TOKEN:", process.env.FB_VERIFY_TOKEN);
console.log("FB_WEBHOOK_RECEIVER_URL:", process.env.FB_WEBHOOK_RECEIVER_URL);
console.log("MONGODB_URI (Início):", process.env.MONGO_URI ? `${String(process.env.MONGO_URI).substring(0, 15)}... (existe)` : 'NÃO CONFIGURADO');
console.log("JWT_SECRET EXISTE?:", process.env.JWT_SECRET ? 'Sim, configurado' : 'NÃO CONFIGURADO ou VAZIO');
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("--- FIM VERIFICAÇÃO VARIÁVEIS DE AMBIENTE ---");


const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');


dotenv.config();
const app = express();

// Middlewares
const allowedOrigins = [

  process.env.FRONTEND_URL,
  'https://malucrm.vercel.app',
  'http://localhost:3000'     // A sua URL de desenvolvimento local
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem 'origin' (como apps mobile ou Postman/Insomnia)
    if (!origin) return callback(null, true);

    // Permite se a origem da requisição estiver na nossa lista de permitidos
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'A política de CORS para este site não permite acesso da origem especificada.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
};

app.use(cors(corsOptions));

app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true }));

// Conectar ao MongoDB
connectDB();

app.use(express.json());

// --- Rotas Públicas (Autenticação) ---
app.use('/api/auth', require('./routes/authRoutes'));


app.use('/api/companies', require('./routes/companyRoutes'));


app.use((req, res, next) => {
  console.log(`[SERVER GLOBAL LOG] Recebida Requisição: ${req.method} ${req.originalUrl}`);
  console.log("[SERVER GLOBAL LOG] req.body (após parsing inicial):", req.body);
  next();
});


// --rotas protegidas -- // 
app.use('/api/leads', require('./routes/leadRoutes'));
app.use('/api/leadstages', require('./routes/leadStageRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/origens', require('./routes/OrigemRoutes'));
app.use('/api/motivosdescarte', require('./routes/discardReasonRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/brokers', require('./routes/brokerContactRoutes'));
app.use('/api/integrations', require('./routes/integrationRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes'));

app.use('/api/empreendimentos', require('./routes/empreendimentoRoutes'));
app.use('/api/imoveis-avulsos', require('./routes/imovelAvulsoRoutes'));


app.use('/api/reservas', require('./routes/ReservaRoutes'));

app.use('/api/propostas-contratos', require('./routes/propostaContratoRoutes'));

app.use('/api/modelos-contrato', require('./routes/modeloContratoRoutes'));

app.use('/api/agenda', require('./routes/agendaRoutes'));


app.use('/api/integrations', require('./routes/integrationRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes'));

app.use('/api/chat', require('./routes/chatRoutes'));

app.use('/api/tasks', require('./routes/taskRoutes'));


app.use('/api/public', require('./routes/publicRoutes'));

app.use('/api', require('./routes/leadRequestRoutes'));

app.use('/api/financeiro', require('./routes/financeiroRoutes'));


const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('API rodando com sucesso ✅');
});
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
