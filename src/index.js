require('dotenv').config();
const express = require('express');
const app = express();

const tenantMiddleware = require('./middleware/tenant');
const wa = require('./whatsapp/manager');

app.use(express.json());

// Rotas admin (sem autenticação por tenant)
app.use('/admin', require('./routes/admin'));

// Rotas protegidas por api_key
app.use('/status',   tenantMiddleware, require('./routes/status'));
app.use('/otp',      tenantMiddleware, require('./routes/otp'));
app.use('/messages', tenantMiddleware, require('./routes/messages'));

// Health check
app.get('/', (req, res) => res.json({ servico: 'website-notify', status: 'ok' }));

const PORT = process.env.PORT || 3010;

app.listen(PORT, async () => {
  console.log(`[website-notify] A correr na porta ${PORT}`);
  // Restaura sessões WhatsApp que estavam ligadas antes de reiniciar
  try {
    await wa.restoreActiveSessions();
  } catch (err) {
    console.error('[WA] Erro ao restaurar sessões:', err.message);
  }
});
