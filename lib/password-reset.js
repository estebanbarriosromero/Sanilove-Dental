const { createHash, randomBytes } = require("node:crypto");

const emailCopy = {
  es: {
    subject: "Restablece tu contraseña de Sanilove Dental",
    intro: "Hemos recibido una solicitud para cambiar la contraseña de tu cuenta de Sanilove Dental.",
    link: "Restablecer contraseña",
    expiry: "El enlace caduca en 30 minutos. Si no solicitaste este cambio, ignora este correo."
  },
  en: {
    subject: "Reset your Sanilove Dental password",
    intro: "We received a request to change the password for your Sanilove Dental account.",
    link: "Reset password",
    expiry: "This link expires in 30 minutes. If you did not request this change, ignore this email."
  },
  zh: {
    subject: "重置 Sanilove Dental 密码",
    intro: "我们收到了更改您 Sanilove Dental 账户密码的请求。",
    link: "重置密码",
    expiry: "此链接将在 30 分钟后失效。如果您没有请求更改密码，请忽略此邮件。"
  }
};

function createResetToken() {
  return randomBytes(32).toString("base64url");
}

function hashResetToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function emailConfig() {
  const { RESEND_API_KEY: apiKey, EMAIL_FROM: from, APP_URL: appUrl } = process.env;
  if (!apiKey) throw new Error("RESEND_API_KEY no está configurada.");
  if (!from) throw new Error("EMAIL_FROM no está configurada.");
  if (!appUrl) throw new Error("APP_URL no está configurada.");

  let baseUrl;
  try {
    baseUrl = new URL(appUrl);
  } catch {
    throw new Error("APP_URL debe ser el origen HTTPS de la página.");
  }
  const localHost = ["localhost", "127.0.0.1", "[::1]"].includes(baseUrl.hostname);
  if (
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.pathname !== "/" ||
    baseUrl.search ||
    baseUrl.hash ||
    (baseUrl.protocol !== "https:" &&
      !(localHost && process.env.VERCEL !== "1" && baseUrl.protocol === "http:"))
  ) {
    throw new Error("APP_URL debe ser un origen HTTPS sin ruta ni parámetros.");
  }

  return { apiKey, from, baseUrl };
}

function buildResetUrl(token, locale = "es") {
  const { baseUrl } = emailConfig();
  const url = new URL(baseUrl);
  const language = ["en", "zh"].includes(locale) ? locale : "es";
  url.hash = `entrar?resetToken=${encodeURIComponent(token)}&locale=${language}`;
  return url.toString();
}

async function sendPasswordResetEmail(email, resetUrl, locale = "es") {
  const { apiKey, from } = emailConfig();
  const copy = emailCopy[locale] || emailCopy.es;
  const safeUrl = resetUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: copy.subject,
      html: `<p>${copy.intro}</p><p><a href="${safeUrl}">${copy.link}</a></p><p>${copy.expiry}</p>`,
      text: `${copy.intro}\n\n${copy.link}: ${resetUrl}\n\n${copy.expiry}`
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || `Resend respondió con HTTP ${response.status}.`);
  }
}

module.exports = {
  buildResetUrl,
  createResetToken,
  emailConfig,
  hashResetToken,
  sendPasswordResetEmail
};
