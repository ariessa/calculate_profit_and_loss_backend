const app = require("./index");
const dotenv = require("dotenv");

// Load .env file contents into process.env
dotenv.config();

const port = process.env.APP_PORT;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
