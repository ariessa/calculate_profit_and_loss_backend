const express = require("express");
const app = express();
const ethers = require("ethers");
const utils = require("./lib/utils");
const db = require("./lib/db");
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');

dayjs.extend(relativeTime);

app.use(express.json());

function parsePnlString(pnlString) {
  // Remove the surrounding parentheses
  const trimmed = pnlString.trim().slice(1, -1);

  // Use regex to capture value, percentage, and description (quoted)
  const match = trimmed.match(/^([^,]*),([^,]*),"(.*)"$/);

  if (!match) {
    throw new Error("Invalid pnl string format");
  }

  let [, valueStr, percentageStr, description] = match;

  console.log("valueStr: ", valueStr);
  console.log("percentageStr: ", percentageStr);

  // Parse numeric values, default to 0 if empty or invalid
  const value = parseFloat(valueStr) || 0.00;
  const percentage = parseFloat(percentageStr) || 0.00;

  return {
    value,
    percentage,
    description,
  };
}

app.get("/pnl/:address", async (req, res) => {
  let address = req.params.address;

  // TODO
  // Determine if the address ahs ever held xAVAX
  // Calculate the PnL over time (e.g. if i bought xAVAX two months ago for 1$ and now it is 0.5%, my PnL is -50%)
  // If the user bought 1000 xAVAX and then sold 1000 xAVAX (their balance is 0, PnL is 0) (optional: you can show as asset history their result, did they lose money or win)
  // Keep in mind that a user can constantly buy/sell, think how that could affect the PnL
  try {
    // Check if address is a valid address or not
    if (utils.is_valid_address(address)) {
      const raw_user_pnl = await db.query(
        "SELECT calculate_user_pnl($1) AS pnl",
        [address]
      );
      const raw_user_txns = await db.query(
        "SELECT get_user_transactions($1) AS transaction",
        [address]
      );

      // console.log(user_pnl);
      // console.log(user_txns);

      if (raw_user_txns?.rowCount > 0) {
        // Parse each string into an object
        const user_pnl = parsePnlString(raw_user_pnl?.rows[0]?.pnl);
        // Parse each string into an object
        const user_txns = raw_user_txns?.rows
          .map(({ transaction }) => {
            // Remove parentheses, then split by commas, handling quoted strings
            const matches = transaction.match(
              /\("([^"]+)",([^,]+),([^,]+),(\w+)\)/
            );

            if (!matches) return null; // handle parse failure

            const [, timestamp, balance, balance_change, trade_type, price_in_usd, value_in_usd] = matches;

            return {
              timestamp,
              balance: Number(balance),
              balance_change: Number(balance_change),
              trade_type,
              price_in_usd,
              value_in_usd,
              age: dayjs(timestamp).fromNow(),
            };
          })
          .filter(Boolean);

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

//

let port = process.env.APP_PORT || 4000;

// Start the server
app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);
});
