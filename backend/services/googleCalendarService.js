const AgendaEvento = require('../models/AgendaEvento');
const { google } = require('googleapis');

/**
 * Salva ou atualiza um evento no Mongo, vinculando company e user.
 * @param {object} googleEvent Evento retornado pelo Google Calendar API
 * @param {object} user Objeto user com _id e company
 */
const saveOrUpdateEvento = async (googleEvent, user) => {
  const filtro = {
    googleEventId: googleEvent.id,
    userId: user._id,
    companyId: user.company,
  };

  const dados = {
    companyId: user.company,
    userId: user._id,
    titulo: googleEvent.summary || '(Sem título)',
    descricao: googleEvent.description || '',
    dataInicio: new Date(googleEvent.start.dateTime || googleEvent.start.date),
    dataFim: new Date(googleEvent.end.dateTime || googleEvent.end.date),
    origem: 'google',
    googleEventId: googleEvent.id,
  };

  return await AgendaEvento.findOneAndUpdate(filtro, dados, { upsert: true, new: true });
};

/**
 * Busca eventos do Google Calendar para o usuário usando refresh token.
 * @param {object} user Objeto user com googleRefreshToken
 * @returns {Promise<Array>} Lista de eventos do Google Calendar
 */
const buscarEventosGoogleDoUsuario = async (user) => {
  if (!user.googleRefreshToken) throw new Error('Usuário não possui refresh token Google.');

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oAuth2Client.setCredentials({ refresh_token: user.googleRefreshToken });

  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  // Exemplo: pega eventos dos próximos 30 dias
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 2500,
  });

  return res.data.items || [];
};

/**
 * Sincroniza todos eventos do Google do usuário para o banco local.
 * @param {object} user Objeto user
 */
const sincronizarEventosGoogle = async (user) => {
  const googleEvents = await buscarEventosGoogleDoUsuario(user);
  const promises = googleEvents.map(ev => saveOrUpdateEvento(ev, user));
  await Promise.all(promises);
  return googleEvents.length;
};

module.exports = {
  saveOrUpdateEvento,
  buscarEventosGoogleDoUsuario,
  sincronizarEventosGoogle,
};
