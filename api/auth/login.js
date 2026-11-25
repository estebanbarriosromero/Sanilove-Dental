const bcrypt = require("bcryptjs");
const {
  database,
  bootstrapAdmin,
  normalizeDni,
  isConfigError,
  sendError,
  authCookie,
  signSession
} = require("../_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendError(res, 405, "Método no permitido.");
  try {
    await bootstrapAdmin();
    const { dni: inputDni, password } = req.body || {};
    const dni = normalizeDni(inputDni);
    if (!dni || typeof password !== "string") {
      return sendError(res, 400, "DNI o contraseña incorrectos.");
    }
    const query = database();
    const rows = await query`SELECT dni, name, email, role, password_hash, session_version
      FROM accounts WHERE dni = ${dni}`;
    if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return sendError(res, 401, "DNI o contraseña incorrectos.");
    }
    const { password_hash, session_version, ...user } = rows[0];
    const token = await signSession({ ...user, session_version });
    res.setHeader("Set-Cookie", authCookie(token, req, 60 * 60 * 24 * 7));
    return res.status(200).json({ user });
  } catch (error) {
    console.error("Login failed:", error.message);
    return sendError(
      res,
      isConfigError(error) ? 503 : 500,
      isConfigError(error) ? error.message : "No se pudo iniciar sesión. Comprueba la configuración del servidor."
    );
  }
};
