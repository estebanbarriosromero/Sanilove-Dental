const {
  bootstrapAdmin,
  database,
  requireUser,
  validPolicyNumber,
  sendError
} = require("../_lib");

const INSURERS = new Set(["adeslas", "sanitas", "dkv"]);

module.exports = async function handler(req, res) {
  try {
    await bootstrapAdmin();
    const user = await requireUser(req, res, ["admin"]);
    if (!user) return;
    const query = database();

    if (req.method === "GET") {
      const policies = await query`SELECT policy_number, insurer_id, active, is_demo, created_at
        FROM policies ORDER BY created_at DESC`;
      return res.status(200).json({ policies });
    }

    if (req.method === "POST") {
      const { policyNumber, insurerId } = req.body || {};
      if (!validPolicyNumber(policyNumber) || !INSURERS.has(insurerId)) {
        return sendError(res, 400, "La póliza debe tener 8 dígitos y corresponder a una aseguradora conocida.");
      }
      const rows = await query`INSERT INTO policies (policy_number, insurer_id, active, is_demo)
        VALUES (${policyNumber.trim()}, ${insurerId}, TRUE, FALSE)
        ON CONFLICT (policy_number, insurer_id)
        DO UPDATE SET active = TRUE, is_demo = FALSE
        RETURNING policy_number, insurer_id, active, is_demo, created_at`;
      return res.status(201).json({ policy: rows[0] });
    }

    if (req.method === "PATCH") {
      const { policyNumber, insurerId, active } = req.body || {};
      if (!validPolicyNumber(policyNumber) || !INSURERS.has(insurerId) || typeof active !== "boolean") {
        return sendError(res, 400, "Datos de póliza no válidos.");
      }
      const rows = await query`UPDATE policies SET active = ${active}
        WHERE policy_number = ${policyNumber.trim()} AND insurer_id = ${insurerId}
        RETURNING policy_number, insurer_id, active, is_demo, created_at`;
      if (!rows[0]) return sendError(res, 404, "No se encontró esa póliza.");
      return res.status(200).json({ policy: rows[0] });
    }

    return sendError(res, 405, "Método no permitido.");
  } catch (error) {
    console.error("Policy administration failed:", error.message);
    return sendError(res, 500, "No se pudo actualizar el registro de pólizas.");
  }
};
