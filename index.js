const cors = require("cors");
const express = require("express");
const app = express();
const utils = require("./lib/utils");
const db = require("./lib/db");
const dotenv = require("dotenv");

// Load .env file contents into process.env
dotenv.config();

const allowed_origin = process.env.FRONTEND_URL;

app.use(express.json());

// Restrict CORS
app.use(
  cors({
    origin: allowed_origin,
    methods: ["GET"],
    credentials: true,
  })
);

app.get("/pnl/:address", async (req, res) => {
  let address = req.params.address;

  try {
    if (utils.is_valid_address(address)) {
      const raw_user_pnl = await db.query(
        "SELECT calculate_user_pnl($1) AS pnl;",
        [address]
      );
      const raw_user_txns = await db.query(
        "SELECT get_user_transactions($1) AS transaction;",
        [address]
      );

      if (raw_user_txns?.rowCount > 0) {
        const user_pnl = utils.parse_pnl(raw_user_pnl);
        const user_txns = utils.parse_txns(raw_user_txns);

        res.json({
          address: address,
          pnl: user_pnl,
          transactions: user_txns,
        });
      } else {
        res.json({
          address: address,
          pnl: {},
          transactions: [],
        });
      }
    } else {
      res.json({ error: "Invalid address" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = app;
