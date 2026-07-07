const db = require('../db');

// Resolve tenant a partir do header: Authorization: Bearer <api_key>
async function tenantMiddleware(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const apiKey = auth.replace('Bearer ', '').trim();

  if (!apiKey) return res.status(401).json({ erro: 'API key em falta' });

  const result = await db.query(
    `SELECT id, nome FROM tenants WHERE api_key=$1 AND ativo=true`,
    [apiKey]
  );

  if (result.rows.length === 0) return res.status(401).json({ erro: 'API key inválida' });

  req.tenant = result.rows[0];
  next();
}

module.exports = tenantMiddleware;
