const {
  bootstrapAdmin,
  currentUser,
  isConfigError,
  sendError
} = require("../_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return sendError(res, 405, "Método no permitido.");
  try {
    await bootstrapAdmin();
    const user = await currentUser(req);
    if (!user) return sendError(res, 401, "No hay una sesión activa.");
    return res.status(200).json({ user });
  } catch (error) {
    console.error("Session lookup failed:", error.message);
    return sendError(
      res,
      isConfigError(error) ? 503 : 500,
      isConfigError(error) ? error.message : "No se pudo validar la sesión."
    );
  }
};
