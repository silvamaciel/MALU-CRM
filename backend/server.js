//backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Conectar ao MongoDB
connectDB();

// --- Rotas Públicas (Autenticação) ---
app.use('/api/auth', require('./routes/authRoutes')); 


//app.use(require('./middleware/authMiddleware'));


app.use('/api/companies', require('./routes/companyRoutes')); 


// --rotas protegidas -- // 
app.use('/api/leads', require('./routes/leadRoutes'));
app.use('/api/leadStage', require('./routes/leadStageRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

app.use('/api/origens', require('./routes/OrigemRoutes'));

app.use('/api/motivosdescarte', require('./routes/discardReasonRoutes'));




const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
