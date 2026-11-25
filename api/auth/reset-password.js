const bcrypt = require("bcryptjs");
const {
  authCookie,
  bootstrapAdmin,
  database,
  isConfigError,
  sendError
} = require("../_lib");
const { hashResetToken } = require("../../lib/password-reset");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendError(res, 405, "Método no permitido.");
  const { token, password } = req.body || {};
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return sendError(res, 400, "Este enlace de recuperación no es válido o ha caducado. Solicita uno nuevo.");
  }
  if (typeof password !== "string" || password.length < 12 || password.length > 200) {
    return sendError(res, 400, "La contraseña debe tener entre 12 y 200 caracteres.");
  }

  try {
    await bootstrapAdmin();
    const passwordHash = await bcrypt.hash(password, 12);
    const query = database();
    const updated = await query`WITH valid_reset AS (
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE token_hash = ${hashResetToken(token)}
        AND used_at IS NULL
        AND expires_at > NOW()
      RETURNING dni
    )
    UPDATE accounts
    SET password_hash = ${passwordHash},
        session_version = session_version + 1
    FROM valid_reset
    WHERE accounts.dni = valid_reset.dni
    RETURNING accounts.dni`;
    if (!updated.length) {
      return sendError(res, 400, "Este enlace de recuperación no es válido o ha caducado. Solicita uno nuevo.");
    }

    res.setHeader("Set-Cookie", authCookie("", req, 0));
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Password reset failed:", error.message);
    return sendError(
      res,
      isConfigError(error) ? 503 : 500,
      isConfigError(error)
        ? error.message
        : "No se pudo restablecer la contraseña. Inténtalo más tarde."
    );
  }
};
