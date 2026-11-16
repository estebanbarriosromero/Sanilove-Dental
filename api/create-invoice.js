module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "STRIPE_SECRET_KEY no está configurada." });
  }

  const { amount, customerName, email, description, packName } = req.body || {};

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: "El importe es obligatorio." });
  }

  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const customer = await stripe.customers.create({
      email: email || "cliente@sanilove.dental.org",
      name: customerName || "Cliente Sanilove",
      metadata: {
        source: "sanilove-dental",
        packName: packName || ""
      }
    });

    await stripe.invoiceItems.create({
      customer: customer.id,
      amount: Number(amount),
      currency: "eur",
      description: description || packName || "Factura Sanilove Dental"
    });

    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: "send_invoice",
      days_until_due: 30,
      auto_advance: true,
      description: description || packName || "Factura Sanilove Dental",
      metadata: {
        source: "sanilove-dental",
        packName: packName || ""
      }
    });

    const sent = await stripe.invoices.sendInvoice(invoice.id);

    return res.status(200).json({
      invoiceId: sent.id,
      invoiceUrl: sent.hosted_invoice_url || null,
      hostedInvoiceUrl: sent.hosted_invoice_url || null
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "No se pudo crear la factura." });
  }
};
