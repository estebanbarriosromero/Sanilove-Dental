const {
  bootstrapAdmin,
  database,
  isConfigError,
  normalizeDni,
  sendError
} = require("../_lib");
const {
  buildResetUrl,
  createResetToken,
  emailConfig,
  hashResetToken,
  sendPasswordResetEmail
} = require("../../lib/password-reset");

const genericResponse = { ok: true };

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendError(res, 405, "Método no permitido.");
  const { dni: inputDni, email: inputEmail, locale: inputLocale } = req.body || {};
  const dni = normalizeDni(inputDni);
  const email = typeof inputEmail === "string" ? inputEmail.trim().toLowerCase() : "";
  if (!dni || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return sendError(res, 400, "Introduce un DNI y un correo electrónico válidos.");
  }

  try {
    await bootstrapAdmin();
    emailConfig();
    const query = database();
    const accounts = await query`SELECT dni, email FROM accounts
      WHERE dni = ${dni} AND LOWER(email) = ${email} AND role = 'cliente'`;
    if (!accounts[0]) return res.status(200).json(genericResponse);

    const token = createResetToken();
    const tokenHash = hashResetToken(token);
    const inserted = await query`INSERT INTO password_reset_tokens
      (dni, token_hash, expires_at, requested_at)
      VALUES (${dni}, ${tokenHash}, NOW() + INTERVAL '30 minutes', NOW())
      ON CONFLICT (dni) DO UPDATE SET
        token_hash = EXCLUDED.token_hash,
        expires_at = EXCLUDED.expires_at,
        requested_at = EXCLUDED.requested_at,
        used_at = NULL
      WHERE password_reset_tokens.requested_at <= NOW() - INTERVAL '1 minute'
      RETURNING dni`;
    if (!inserted.length) return res.status(200).json(genericResponse);

    try {
      const locale = ["en", "zh"].includes(inputLocale) ? inputLocale : "es";
      await sendPasswordResetEmail(accounts[0].email, buildResetUrl(token, locale), locale);
    } catch (error) {
      try {
        await query`DELETE FROM password_reset_tokens
          WHERE dni = ${dni} AND token_hash = ${tokenHash}`;
      } catch (cleanupError) {
        console.error("Password reset token cleanup failed:", cleanupError.message);
      }
      throw error;
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error("Password reset request failed:", error.message);
    return sendError(
      res,
      503,
      isConfigError(error)
        ? error.message
        : "No se pudo enviar el correo de recuperación. Inténtalo más tarde o contacta con recepción."
    );
  }
};
