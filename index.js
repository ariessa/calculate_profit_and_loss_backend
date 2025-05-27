const express = require("express");
const app = express();

app.get("/pnl/:address", async (req, res) => {
    let address = req.params.email;
    console.log("address: ", address);

    // TODO
    // Determine if the address ahs ever held xAVAX
    // Calculate the PnL over time (e.g. if i bought xAVAX two months ago for 1$ and now it is 0.5%, my PnL is -50%)
    // If the user bought 1000 xAVAX and then sold 1000 xAVAX (their balance is 0, PnL is 0) (optional: you can show as asset history their result, did they lose money or win)
    // Keep in mind that a user can constantly buy/sell, think how that could affect the PnL
    try {
        // Check if address is
        
    } catch (error) {
        console.error(error);
    }
});

let port = process.env.APP_PORT || 3000;

// Start the server
app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);
});
