const express = require('express');
const router = express.Router();
const wa = require('../whatsapp/manager');
const db = require('../db');

// GET /status — estado da sessão WhatsApp do tenant
router.get('/', async (req, res) => {
  try {
    const status = await wa.getStatus(req.tenant.id);

    const hoje = await db.query(
      `SELECT COUNT(*) as total FROM mensagens
       WHERE tenant_id=$1 AND enviado_em >= CURRENT_DATE`,
      [req.tenant.id]
    );

    res.json({
      ...status,
      mensagens_hoje: parseInt(hoje.rows[0].total),
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /status/connect — arranca a sessão
router.post('/connect', async (req, res) => {
  try {
    await wa.getOrCreateSession(req.tenant.id);
    res.json({ ok: true, mensagem: 'Sessão a iniciar — aguarda o QR code' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /status/disconnect — termina a sessão
router.post('/disconnect', async (req, res) => {
  try {
    await wa.disconnect(req.tenant.id);
    res.json({ ok: true, mensagem: 'Sessão terminada' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
