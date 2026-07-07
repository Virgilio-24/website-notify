const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const wa = require('../whatsapp/manager');

const EXPIRY = parseInt(process.env.OTP_EXPIRY_MINUTES || '5');

function gerarCodigo() {
  return String(crypto.randomInt(100000, 999999));
}

// POST /otp/send — gera e envia OTP por WhatsApp
router.post('/send', async (req, res) => {
  const { telefone } = req.body;
  if (!telefone) return res.status(400).json({ erro: 'telefone em falta' });

  try {
    // Invalida OTPs anteriores para este número
    await db.query(
      `UPDATE otps SET usado=true WHERE tenant_id=$1 AND telefone=$2 AND usado=false`,
      [req.tenant.id, telefone]
    );

    const codigo = gerarCodigo();
    const expira = new Date(Date.now() + EXPIRY * 60 * 1000);

    await db.query(
      `INSERT INTO otps (tenant_id, telefone, codigo, expira_em) VALUES ($1, $2, $3, $4)`,
      [req.tenant.id, telefone, codigo, expira]
    );

    const mensagem = `O teu código de acesso é: *${codigo}*\nVálido durante ${EXPIRY} minutos.`;
    await wa.sendMessage(req.tenant.id, telefone, mensagem);

    res.json({ ok: true, mensagem: 'Código enviado por WhatsApp' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /otp/verify — valida o código introduzido pelo utilizador
router.post('/verify', async (req, res) => {
  const { telefone, codigo } = req.body;
  if (!telefone || !codigo) return res.status(400).json({ erro: 'telefone e codigo são obrigatórios' });

  try {
    const result = await db.query(
      `SELECT id FROM otps
       WHERE tenant_id=$1 AND telefone=$2 AND codigo=$3
         AND usado=false AND expira_em > NOW()
       ORDER BY criado_em DESC LIMIT 1`,
      [req.tenant.id, telefone, codigo]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ ok: false, erro: 'Código inválido ou expirado' });
    }

    await db.query(`UPDATE otps SET usado=true WHERE id=$1`, [result.rows[0].id]);

    res.json({ ok: true, mensagem: 'Código validado com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
