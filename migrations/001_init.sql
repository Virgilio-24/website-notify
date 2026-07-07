-- website-notify: schema inicial
-- Corre este ficheiro uma vez na tua base de dados PostgreSQL

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tenants (um por cliente/site)
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        VARCHAR(255) NOT NULL,
  api_key     VARCHAR(64)  UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  ativo       BOOLEAN      DEFAULT true,
  criado_em   TIMESTAMPTZ  DEFAULT NOW()
);

-- Sessões WhatsApp (uma por tenant)
CREATE TABLE wa_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  numero        VARCHAR(20),
  ligado        BOOLEAN     DEFAULT false,
  ultimo_qr     TEXT,
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- OTPs gerados
CREATE TABLE otps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
  telefone   VARCHAR(20)  NOT NULL,
  codigo     VARCHAR(10)  NOT NULL,
  usado      BOOLEAN      DEFAULT false,
  expira_em  TIMESTAMPTZ  NOT NULL,
  criado_em  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_otps_telefone ON otps(tenant_id, telefone, usado);

-- Log de mensagens enviadas
CREATE TABLE mensagens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
  telefone   VARCHAR(20) NOT NULL,
  mensagem   TEXT        NOT NULL,
  tipo       VARCHAR(50) DEFAULT 'texto',
  status     VARCHAR(20) DEFAULT 'enviado',
  enviado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mensagens_tenant ON mensagens(tenant_id, enviado_em DESC);
