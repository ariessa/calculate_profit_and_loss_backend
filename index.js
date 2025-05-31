const express = require("express");
const app = express();
const utils = require("./lib/utils");
const db = require("./lib/db");
const port = process.env.APP_PORT || 4000;

app.use(express.json());

app.get("/pnl/:address", async (req, res) => {
  let address = req.params.address;

  try {
    // Check if address is a valid address or not
    if (utils.is_valid_address(address)) {
      const raw_user_pnl = await db.query(
        "SELECT calculate_user_pnl($1) AS pnl;",
        [address]
      );
      const raw_user_txns = await db.query(
        "SELECT get_user_transactions($1) AS transaction;",
        [address]
      );

      console.log(raw_user_txns);

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
          pnl: 0,
          transactions: [],
        });
      }
    } else {
      res.json({ error: "Invalid address" });
    }
  } catch (error) {
    console.error(error);
  }
});

// Start the server
app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);
});
