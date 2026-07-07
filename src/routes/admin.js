const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

// Middleware de autenticação admin por secret no header
function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ erro: 'Não autorizado' });
  }
  next();
}

// GET /admin/tenants — lista todos os tenants
router.get('/tenants', adminAuth, async (req, res) => {
  const result = await db.query(
    `SELECT t.id, t.nome, t.api_key, t.ativo, t.criado_em,
            w.ligado, w.numero,
            (SELECT COUNT(*) FROM mensagens m WHERE m.tenant_id=t.id) as total_mensagens
     FROM tenants t
     LEFT JOIN wa_sessions w ON w.tenant_id=t.id
     ORDER BY t.criado_em DESC`
  );
  res.json(result.rows);
});

// POST /admin/tenants — cria novo tenant
router.post('/tenants', adminAuth, async (req, res) => {
  const { nome } = req.body;
  if (!nome) return res.status(400).json({ erro: 'nome é obrigatório' });

  const api_key = crypto.randomBytes(32).toString('hex');
  const result = await db.query(
    `INSERT INTO tenants (nome, api_key) VALUES ($1, $2) RETURNING id, nome, api_key`,
    [nome, api_key]
  );
  res.json(result.rows[0]);
});

// PATCH /admin/tenants/:id — activa/desactiva tenant
router.patch('/tenants/:id', adminAuth, async (req, res) => {
  const { ativo } = req.body;
  await db.query(`UPDATE tenants SET ativo=$1 WHERE id=$2`, [ativo, req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
