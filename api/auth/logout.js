const { authCookie, sendError } = require("../_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendError(res, 405, "Método no permitido.");
  res.setHeader("Set-Cookie", authCookie("", req, 0));
  return res.status(200).json({ ok: true });
};
