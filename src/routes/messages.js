const express = require('express');
const router = express.Router();
const db = require('../db');
const wa = require('../whatsapp/manager');

// POST /messages/send — envia mensagem livre
router.post('/send', async (req, res) => {
  const { telefone, mensagem } = req.body;
  if (!telefone || !mensagem) return res.status(400).json({ erro: 'telefone e mensagem são obrigatórios' });

  try {
    await wa.sendMessage(req.tenant.id, telefone, mensagem);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /messages — histórico de mensagens do tenant
router.get('/', async (req, res) => {
  const limite = parseInt(req.query.limite || '50');
  const pagina = parseInt(req.query.pagina || '1');
  const offset = (pagina - 1) * limite;

  try {
    const result = await db.query(
      `SELECT telefone, mensagem, tipo, status, enviado_em
       FROM mensagens WHERE tenant_id=$1
       ORDER BY enviado_em DESC LIMIT $2 OFFSET $3`,
      [req.tenant.id, limite, offset]
    );

    const total = await db.query(
      `SELECT COUNT(*) as total FROM mensagens WHERE tenant_id=$1`,
      [req.tenant.id]
    );

    res.json({
      mensagens: result.rows,
      total: parseInt(total.rows[0].total),
      pagina,
      limite,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
