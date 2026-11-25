const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  buildResetUrl,
  createResetToken,
  hashResetToken,
  sendPasswordResetEmail
} = require("../lib/password-reset");

const configNames = ["APP_URL", "EMAIL_FROM", "RESEND_API_KEY"];

function withEmailConfig(callback, appUrl = "https://example.test") {
  const previous = Object.fromEntries(configNames.map((name) => [name, process.env[name]]));
  process.env.APP_URL = appUrl;
  process.env.EMAIL_FROM = "Sanilove <noreply@example.test>";
  process.env.RESEND_API_KEY = "test-api-key";
  try {
    callback();
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

test("recovery tokens are random URL-safe values stored as SHA-256 digests", () => {
  const first = createResetToken();
  const second = createResetToken();
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first, second);
  assert.equal(hashResetToken(first).length, 64);
  assert.notEqual(hashResetToken(first), first);
  assert.equal(hashResetToken(first), hashResetToken(first));
});

test("reset links use the configured HTTPS origin", () => {
  withEmailConfig(() => {
    const url = new URL(buildResetUrl("a".repeat(43)));
    assert.equal(url.origin, "https://example.test");
    assert.equal(url.search, "");
    const params = new URLSearchParams(url.hash.split("?")[1]);
    assert.equal(params.get("resetToken"), "a".repeat(43));
    assert.equal(params.get("locale"), "es");
  });
});

test("reset links reject non-local HTTP origins and paths", () => {
  withEmailConfig(
    () => assert.throws(() => buildResetUrl("a".repeat(43)), /APP_URL/),
    "http://example.test"
  );
  withEmailConfig(
    () => assert.throws(() => buildResetUrl("a".repeat(43)), /APP_URL/),
    "https://example.test/path"
  );
});

test("recovery email sends through the configured Resend API", async () => {
  const previous = Object.fromEntries(configNames.map((name) => [name, process.env[name]]));
  const originalFetch = global.fetch;
  process.env.APP_URL = "https://example.test";
  process.env.EMAIL_FROM = "Sanilove <noreply@example.test>";
  process.env.RESEND_API_KEY = "test-api-key";
  const messages = [];
  global.fetch = async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(options.headers.Authorization, "Bearer test-api-key");
    const body = JSON.parse(options.body);
    assert.equal(body.to[0], "patient@example.test");
    assert.match(body.text, /https:\/\/example\.test\/#entrar\?resetToken=/);
    messages.push(body);
    return { ok: true, status: 200, json: async () => ({ id: "email-id" }) };
  };
  try {
    await sendPasswordResetEmail(
      "patient@example.test",
      buildResetUrl("a".repeat(43), "en"),
      "en"
    );
    await sendPasswordResetEmail(
      "patient@example.test",
      buildResetUrl("b".repeat(43), "zh"),
      "zh"
    );
    assert.equal(messages[0].subject, "Reset your Sanilove Dental password");
    assert.equal(messages[1].subject, "重置 Sanilove Dental 密码");
  } finally {
    global.fetch = originalFetch;
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
