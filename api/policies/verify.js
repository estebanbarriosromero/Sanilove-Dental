const {
  bootstrapAdmin,
  database,
  requireUser,
  validPolicyNumber,
  isConfigError,
  sendError
} = require("../_lib");

const INSURERS = new Set(["adeslas", "sanitas", "dkv"]);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendError(res, 405, "Método no permitido.");
  try {
    await bootstrapAdmin();
    const user = await requireUser(req, res);
    if (!user) return;
    const { policyNumber, insurerId } = req.body || {};
    if (!validPolicyNumber(policyNumber) || !INSURERS.has(insurerId)) {
      return sendError(res, 400, "La póliza debe tener 8 dígitos y una aseguradora válida.");
    }
    const query = database();
    const rows = await query`SELECT policy_number, insurer_id, is_demo
      FROM policies
      WHERE policy_number = ${policyNumber.trim()} AND insurer_id = ${insurerId} AND active = TRUE`;
    if (!rows[0]) return res.status(200).json({ valid: false });
    return res.status(200).json({ valid: true, isDemo: rows[0].is_demo });
  } catch (error) {
    console.error("Policy verification failed:", error.message);
    return sendError(
      res,
      isConfigError(error) ? 503 : 500,
      isConfigError(error) ? error.message : "No se pudo verificar la póliza."
    );
  }
};
