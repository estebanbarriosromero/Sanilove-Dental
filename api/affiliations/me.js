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
    const user = await requireUser(req, res);
    if (!user) return;
    const query = database();

    if (req.method === "GET") {
      const rows = await query`SELECT a.policy_number AS pol, a.insurer_id AS "insId",
        CASE a.insurer_id
          WHEN 'adeslas' THEN 'Adeslas'
          WHEN 'sanitas' THEN 'Sanitas'
          WHEN 'dkv' THEN 'DKV'
        END AS ins
        FROM affiliations a WHERE a.dni = ${user.dni}`;
      return res.status(200).json({ affiliation: rows[0] || null });
    }

    if (req.method === "POST") {
      const { policyNumber, insurerId } = req.body || {};
      if (!validPolicyNumber(policyNumber) || !INSURERS.has(insurerId)) {
        return sendError(res, 400, "La póliza debe tener 8 dígitos y una aseguradora válida.");
      }
      const policy = await query`SELECT is_demo FROM policies
        WHERE policy_number = ${policyNumber.trim()} AND insurer_id = ${insurerId} AND active = TRUE`;
      if (!policy[0]) return sendError(res, 422, "No encontramos una póliza activa con esos datos.");
      await query`INSERT INTO affiliations (dni, policy_number, insurer_id)
        VALUES (${user.dni}, ${policyNumber.trim()}, ${insurerId})
        ON CONFLICT (dni) DO UPDATE SET policy_number = EXCLUDED.policy_number,
          insurer_id = EXCLUDED.insurer_id, created_at = NOW()`;
      return res.status(200).json({
        affiliation: {
          pol: policyNumber.trim(),
          insId: insurerId,
          ins: insurerId === "dkv" ? "DKV" : insurerId[0].toUpperCase() + insurerId.slice(1),
          isDemo: policy[0].is_demo
        }
      });
    }

    if (req.method === "DELETE") {
      await query`DELETE FROM affiliations WHERE dni = ${user.dni}`;
      return res.status(200).json({ ok: true });
    }

    return sendError(res, 405, "Método no permitido.");
  } catch (error) {
    console.error("Affiliation request failed:", error.message);
    return sendError(res, 500, "No se pudo guardar la afiliación.");
  }
};
