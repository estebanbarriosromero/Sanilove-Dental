const {
  bootstrapAdmin,
  database,
  requireUser,
  isConfigError,
  sendError
} = require("../_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return sendError(res, 405, "Método no permitido.");
  try {
    await bootstrapAdmin();
    const user = await requireUser(req, res, ["admin"]);
    if (!user) return;
    const query = database();
    const accounts = await query`SELECT dni, name, email, role, created_at
      FROM accounts ORDER BY created_at DESC`;
    return res.status(200).json({ accounts });
  } catch (error) {
    console.error("Account listing failed:", error.message);
    return sendError(
      res,
      isConfigError(error) ? 503 : 500,
      isConfigError(error) ? error.message : "No se pudieron cargar las cuentas."
    );
  }
};
