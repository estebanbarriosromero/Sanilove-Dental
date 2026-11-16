const bcrypt = require("bcryptjs");
const {
  ADMIN_DNI,
  database,
  bootstrapAdmin,
  normalizeDni,
  validFullDni,
  isConfigError,
  sendError,
  authCookie,
  signSession
} = require("../_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendError(res, 405, "Método no permitido.");
  try {
    await bootstrapAdmin();
    const { dni: inputDni, name, email, password } = req.body || {};
    const dni = normalizeDni(inputDni);
    if (!dni || dni === ADMIN_DNI || !validFullDni(inputDni)) {
      return sendError(res, 400, "Introduce un DNI completo válido, con sus 8 números y letra correcta.");
    }
    if (typeof name !== "string" || name.trim().length < 2 || name.length > 120) {
      return sendError(res, 400, "Introduce un nombre válido.");
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return sendError(res, 400, "Introduce un email válido.");
    }
    if (typeof password !== "string" || password.length < 12 || password.length > 200) {
      return sendError(res, 400, "La contraseña debe tener al menos 12 caracteres.");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const query = database();
    const rows = await query`INSERT INTO accounts (dni, name, email, password_hash, role)
      VALUES (${dni}, ${name.trim()}, ${email.trim().toLowerCase()}, ${passwordHash}, 'cliente')
      RETURNING dni, name, email, role`;
    const user = rows[0];
    const token = await signSession(user);
    res.setHeader("Set-Cookie", authCookie(token, req, 60 * 60 * 24 * 7));
    return res.status(201).json({ user });
  } catch (error) {
    if (error.code === "23505") return sendError(res, 409, "Ya existe una cuenta con ese DNI.");
    console.error("Register failed:", error.message);
    return sendError(
      res,
      isConfigError(error) ? 503 : 500,
      isConfigError(error) ? error.message : "No se pudo crear la cuenta. Comprueba la configuración de la base de datos."
    );
  }
};
