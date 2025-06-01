const { Pool } = require("pg");
const dotenv = require("dotenv");

// Load .env file contents into process.env
dotenv.config();

const databasePool = new Pool({
  host: process.env.IS_DOCKER === "true" ? process.env.DB_CONTAINER_NAME : process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

module.exports = databasePool;
