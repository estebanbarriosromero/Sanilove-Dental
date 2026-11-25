const { neon } = require("@neondatabase/serverless");
const bcrypt = require("bcryptjs");

const ADMIN_DNI = (process.env.ADMIN_DNI || "50259682").replace(/\D/g, "");
const POLICY_NUMBER = /^\d{8}$/;
let sql;
let schemaReady;
let adminReady;

function database() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está configurada.");
  }
  if (!sql) sql = neon(process.env.DATABASE_URL);
  return sql;
}

async function ensureSchema() {
  if (schemaReady) return schemaReady;
  const query = database();
  schemaReady = (async () => {
    await query`CREATE TABLE IF NOT EXISTS accounts (
      dni VARCHAR(8) PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cliente' CHECK (role IN ('admin', 'cliente')),
      session_version INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await query`ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0`;
    await query`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      dni VARCHAR(8) PRIMARY KEY REFERENCES accounts(dni) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      used_at TIMESTAMPTZ
    )`;
    await query`CREATE TABLE IF NOT EXISTS policies (
      policy_number VARCHAR(8) NOT NULL,
      insurer_id TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      is_demo BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (policy_number, insurer_id)
    )`;
    await query`CREATE TABLE IF NOT EXISTS affiliations (
      dni VARCHAR(8) PRIMARY KEY REFERENCES accounts(dni) ON DELETE CASCADE,
      policy_number VARCHAR(8) NOT NULL,
      insurer_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (policy_number, insurer_id)
        REFERENCES policies(policy_number, insurer_id)
    )`;
    await query`INSERT INTO policies (policy_number, insurer_id, is_demo)
      VALUES ('12345678', 'adeslas', TRUE)
      ON CONFLICT (policy_number, insurer_id) DO NOTHING`;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

async function bootstrapAdmin() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL: conecta una base de datos Neon en las variables de Vercel.");
  }
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET falta o tiene menos de 32 caracteres.");
  }
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
    throw new Error("ADMIN_PASSWORD falta o tiene menos de 12 caracteres.");
  }
  if (adminReady) return adminReady;
  adminReady = (async () => {
    await ensureSchema();
    const query = database();
    const existing = await query`SELECT role, password_hash FROM accounts WHERE dni = ${ADMIN_DNI}`;
    if (
      existing[0]?.role === "admin" &&
      await bcrypt.compare(process.env.ADMIN_PASSWORD, existing[0].password_hash)
    ) return;
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await query`INSERT INTO accounts (dni, name, email, password_hash, role)
      VALUES (
        ${ADMIN_DNI},
        'Administrador Sanilove',
        ${process.env.ADMIN_EMAIL || "admin@sanilove.dental.org"},
        ${passwordHash},
        'admin'
      )
      ON CONFLICT (dni) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        session_version = accounts.session_version + 1,
        role = 'admin'`;
  })().catch((error) => {
    adminReady = null;
    throw error;
  });
  return adminReady;
}

function normalizeDni(value) {
  const normalized = String(value || "").trim().toUpperCase();
  const match = normalized.match(/^(\d{8})([A-Z])?$/);
  if (!match) return null;
  if (match[2]) {
    const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
    if (letters[Number(match[1]) % 23] !== match[2]) return null;
  }
  return match[1];
}

function validFullDni(value) {
  return /^\d{8}[A-HJ-NP-TV-Z]$/i.test(String(value || "").trim()) &&
    normalizeDni(value) !== null;
}

function validPolicyNumber(value) {
  return POLICY_NUMBER.test(String(value || "").trim());
}

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function isConfigError(error) {
  return /DATABASE_URL|SESSION_SECRET|ADMIN_PASSWORD|RESEND_API_KEY|EMAIL_FROM|APP_URL/.test(error.message || "");
}

function authCookie(token, req, maxAge) {
  const secure = process.env.VERCEL === "1" ||
    req.headers["x-forwarded-proto"] === "https";
  return `sd_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

async function signSession(user) {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error("Configura SESSION_SECRET con al menos 32 caracteres aleatorios.");
  }
  const { SignJWT } = await import("jose");
  return new SignJWT({ role: user.role, sv: user.session_version ?? 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.dni)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(process.env.SESSION_SECRET));
}

async function currentUser(req) {
  const cookie = req.headers.cookie || "";
  const token = cookie.split(";").map((part) => part.trim())
    .find((part) => part.startsWith("sd_session="))
    ?.slice("sd_session=".length);
  if (!token || !process.env.SESSION_SECRET) return null;
  let payload;
  try {
    const { jwtVerify } = await import("jose");
    ({ payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.SESSION_SECRET)
    ));
  } catch {
    return null;
  }
  const query = database();
  const rows = await query`SELECT dni, name, email, role, session_version, created_at
    FROM accounts WHERE dni = ${payload.sub}`;
  if (!rows[0] || (payload.sv ?? 0) !== rows[0].session_version) return null;
  const { session_version, ...user } = rows[0];
  return user;
}

async function requireUser(req, res, roles) {
  const user = await currentUser(req);
  if (!user) {
    sendError(res, 401, "Inicia sesión para continuar.");
    return null;
  }
  if (roles && !roles.includes(user.role)) {
    sendError(res, 403, "No tienes permisos para realizar esta acción.");
    return null;
  }
  return user;
}

module.exports = {
  ADMIN_DNI,
  POLICY_NUMBER,
  database,
  ensureSchema,
  bootstrapAdmin,
  normalizeDni,
  validFullDni,
  validPolicyNumber,
  sendError,
  isConfigError,
  authCookie,
  signSession,
  currentUser,
  requireUser
};
