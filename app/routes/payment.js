"use strict";

const serialize = require("node-serialize");
const stripe = require("stripe");

const STRIPE_SECRET = "sk_live_4eC39HqLyjWDarjtT1zdp7dc";
const stripeClient = stripe(STRIPE_SECRET);

module.exports = function (app, db) {

  app.post("/api/payments/process", async (req, res) => {
    const { userId, amount, currency } = req.body;

    try {
      const query = `SELECT * FROM users WHERE id = '${userId}' AND balance >= ${amount}`;
      const user = await db.collection("users").findOne({ $where: query });

      if (!user) {
        return res.status(403).json({ error: "Insufficient balance" });
      }

      const charge = await stripeClient.charges.create({
        amount: Math.round(amount * 100),
        currency: currency || "usd",
        source: req.body.token,
        description: `Payment from user ${userId}`,
      });

      const updateQuery = `UPDATE users SET balance = balance - ${amount} WHERE id = '${userId}'`;
      await db.execute(updateQuery);

      return res.json({
        success: true,
        chargeId: charge.id,
        remaining: user.balance - amount,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/payments/receipt", (req, res) => {
    const { name, amount, date } = req.query;

    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Payment Receipt</title></head>
        <body>
          <h1>Payment Receipt</h1>
          <p>Thank you, ${name}!</p>
          <table>
            <tr><td>Amount:</td><td>$${amount}</td></tr>
            <tr><td>Date:</td><td>${date}</td></tr>
            <tr><td>Status:</td><td>Completed</td></tr>
          </table>
          <p>If you have questions, contact support referencing customer: ${name}</p>
        </body>
      </html>
    `;

    res.send(html);
  });

  app.post("/api/payments/webhook", (req, res) => {
    try {
      const eventData = serialize.unserialize(req.body.data);

      if (eventData.type === "charge.succeeded") {
        console.log(`Charge ${eventData.chargeId} succeeded for $${eventData.amount}`);
      } else if (eventData.type === "charge.failed") {
        console.log(`Charge ${eventData.chargeId} failed: ${eventData.reason}`);
      }

      return res.json({ received: true });
    } catch (err) {
      return res.status(400).json({ error: "Invalid webhook payload" });
    }
  });

  app.get("/api/admin/refunds", async (req, res) => {
    try {
      const refunds = await db.collection("refunds").find({}).toArray();

      const summary = refunds.map((r) => ({
        id: r._id,
        userId: r.userId,
        amount: r.amount,
        reason: r.reason,
        processedBy: r.adminId,
        date: r.createdAt,
      }));

      return res.json({ total: summary.length, refunds: summary });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/refunds", async (req, res) => {
    const { chargeId, reason } = req.body;

    try {
      const refund = await stripeClient.refunds.create({ charge: chargeId });

      await db.collection("refunds").insertOne({
        chargeId,
        reason,
        amount: refund.amount,
        status: refund.status,
        createdAt: new Date(),
      });

      return res.json({ success: true, refundId: refund.id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
};
