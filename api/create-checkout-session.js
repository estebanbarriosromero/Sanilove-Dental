const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "STRIPE_SECRET_KEY no está configurada." });
  }

  const { amount, name, email, description, metadata = {} } = req.body || {};

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: "El importe es obligatorio." });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: {
            name: description || "Sanilove Dental",
            description: description || "Pago de clínica dental"
          },
          unit_amount: Number(amount)
        },
        quantity: 1
      }],
      customer_email: email || undefined,
      success_url: `${req.headers.origin || "https://example.com"}/#cuenta`,
      cancel_url: `${req.headers.origin || "https://example.com"}/#seguros`,
      metadata: {
        ...metadata,
        customerName: name || "Cliente",
        source: "sanilove-dental"
      },
      payment_method_types: ["card", "paypal"]
    });

    return res.status(200).json({ id: session.id, url: session.url });
  } catch (error) {
    return res.status(500).json({ error: error.message || "No se pudo crear la sesión de Stripe." });
  }
};
