const pool = require("../config/db");

async function createTicket(req, res) {
  try {
    const b = req.body || {};
    const required = [
      "senderid",
      "sendername",
      "Sendertype",
      "store_id",
      "store_name",
      "issuetype",
      "phoneno",
      "status",
      "question",
      "answer",
      "disputed_party_name",
    ];
    const missing = required.filter((k) => !b[k] && b[k] !== 0);
    if (missing.length) {
      return res.json({
        error: true,
        message: `Missing: ${missing.join(", ")}`,
      });
    }

    const row = {
      senderid: b.senderid,
      sendername: b.sendername,
      Sendertype: b.Sendertype,
      store_id: b.store_id,
      store_name: b.store_name,
      issuetype: b.issuetype,
      phoneno: b.phoneno,
      status: b.status,
      question: b.question,
      answer: b.answer,
      disputed_party_name: b.disputed_party_name,
      ticket_type_1: b.ticket_type_1 ?? null,
      ticket_type_2: b.ticket_type_2 ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await pool.query("INSERT INTO ticketing SET ?", [row]);
    return res.json({ error: false, message: "Added Successfully" });
  } catch (err) {
    console.error("createTicket error:", err);
    return res.json({ error: true, message: err.message });
  }
}

async function listTickets(_req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM ticketing ORDER BY id ASC");
    return res.json(rows);
  } catch (err) {
    console.error("listTickets error:", err);
    return res.json({ error: true, message: err.message, data: [] });
  }
}

async function listTicketTypes(_req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM ticket_types ORDER BY id ASC"
    );
    if (rows.length) {
      return res.status(200).json({ status: "success", message: rows });
    }
    return res.status(200).json({ status: "error", message: [] });
  } catch (err) {
    console.error("listTicketTypes error:", err);
    return res.json({ status: "error", message: [] });
  }
}

module.exports = {
  createTicket,
  listTickets,
  listTicketTypes,
};
