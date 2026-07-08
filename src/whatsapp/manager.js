const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const db = require('../db');

// Mapa de clientes activos: tenantId -> { client, status, qr }
const sessions = new Map();

async function getOrCreateSession(tenantId) {
  if (sessions.has(tenantId)) return sessions.get(tenantId);

  const session = { client: null, status: 'desligado', qr: null };
  sessions.set(tenantId, session);

  const puppeteerOpts = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
    ],
  };

  // Em Windows usa Chrome do sistema via variável de ambiente
  if (process.env.CHROME_PATH) {
    puppeteerOpts.executablePath = process.env.CHROME_PATH;
  }

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: tenantId }),
    puppeteer: puppeteerOpts,
  });

  session.client = client;

  client.on('qr', async (qr) => {
    session.status = 'aguarda_qr';
    session.qr = await qrcode.toDataURL(qr);
    await db.query(
      `INSERT INTO wa_sessions (tenant_id, ligado, ultimo_qr, atualizado_em)
       VALUES ($1, false, $2, NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET ligado=false, ultimo_qr=$2, atualizado_em=NOW()`,
      [tenantId, session.qr]
    );
    console.log(`[WA:${tenantId}] QR gerado`);
  });

  client.on('ready', async () => {
    session.status = 'ligado';
    session.qr = null;
    const numero = client.info?.wid?.user || null;
    await db.query(
      `INSERT INTO wa_sessions (tenant_id, ligado, numero, ultimo_qr, atualizado_em)
       VALUES ($1, true, $2, null, NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET ligado=true, numero=$2, ultimo_qr=null, atualizado_em=NOW()`,
      [tenantId, numero]
    );
    console.log(`[WA:${tenantId}] Ligado — número: ${numero}`);
  });

  client.on('disconnected', async () => {
    session.status = 'desligado';
    session.qr = null;
    await db.query(
      `UPDATE wa_sessions SET ligado=false, atualizado_em=NOW() WHERE tenant_id=$1`,
      [tenantId]
    );
    console.log(`[WA:${tenantId}] Desligado`);
  });

  client.initialize();
  return session;
}

async function sendMessage(tenantId, telefone, mensagem) {
  const session = sessions.get(tenantId);
  if (!session || session.status !== 'ligado') {
    throw new Error('Sessão WhatsApp não está ligada');
  }
  const chatId = telefone.replace(/\D/g, '') + '@c.us';
  await session.client.sendMessage(chatId, mensagem);

  await db.query(
    `INSERT INTO mensagens (tenant_id, telefone, mensagem, tipo, status, enviado_em)
     VALUES ($1, $2, $3, 'whatsapp', 'enviado', NOW())`,
    [tenantId, telefone, mensagem]
  );
}

async function getStatus(tenantId) {
  const session = sessions.get(tenantId);
  if (!session) {
    // Carrega do DB
    const res = await db.query(
      `SELECT ligado, numero, ultimo_qr FROM wa_sessions WHERE tenant_id=$1`,
      [tenantId]
    );
    if (res.rows.length === 0) return { status: 'desligado', qr: null, numero: null };
    const row = res.rows[0];
    return { status: row.ligado ? 'ligado' : 'desligado', qr: row.ultimo_qr, numero: row.numero };
  }
  return {
    status: session.status,
    qr: session.qr,
    numero: session.client?.info?.wid?.user || null,
  };
}

async function disconnect(tenantId) {
  const session = sessions.get(tenantId);
  if (session?.client) {
    await session.client.destroy();
    sessions.delete(tenantId);
  }
}

// Arranca sessões que estavam ligadas ao reiniciar
async function restoreActiveSessions() {
  const res = await db.query(`SELECT tenant_id FROM wa_sessions WHERE ligado=true`);
  for (const row of res.rows) {
    console.log(`[WA] A restaurar sessão: ${row.tenant_id}`);
    try {
      await getOrCreateSession(row.tenant_id);
    } catch (err) {
      console.error(`[WA] Falhou restaurar ${row.tenant_id}:`, err.message);
      await db.query(`UPDATE wa_sessions SET ligado=false WHERE tenant_id=$1`, [row.tenant_id]);
    }
  }
}

module.exports = { getOrCreateSession, sendMessage, getStatus, disconnect, restoreActiveSessions };
