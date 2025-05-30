const { Pool } = require("pg");
const dotenv = require("dotenv");

// Load .env file contents into process.env
dotenv.config();

const isDocker = process.env.IS_DOCKER === "true";

const databasePool = new Pool({
  host: isDocker ? process.env.DB_CONTAINER_NAME : process.env.DB_HOST || "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

module.exports = databasePool;
