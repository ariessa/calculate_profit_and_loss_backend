const { Client, Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");

// Load .env file contents into process.env
dotenv.config();

const TEST_DB_NAME = `test_db_${uuidv4().replace(/-/g, "")}`;

let test_pool;

const setup_test_db = async () => {
  // Connect to default DB to create a new test DB
  const admin_client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: "postgres",
    port: process.env.DB_PORT,
  });

  await admin_client.connect();
  await admin_client.query(`CREATE DATABASE ${TEST_DB_NAME}`);
  await admin_client.end();

  // Connect to the new test DB using a pool
  test_pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: TEST_DB_NAME,
    port: process.env.DB_PORT,
  });

  // Ensure every new connection uses UTC timezone
  test_pool.on("connect", async (client) => {
    await client.query(`SET TIMEZONE TO 'UTC';`);
  });

  return test_pool;
};

const delete_test_db = async () => {
  await test_pool.end();

  const admin_client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: "postgres",
    port: process.env.DB_PORT,
  });

  await admin_client.connect();
  await admin_client.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
  await admin_client.end();
};

module.exports = {
  setup_test_db,
  delete_test_db,
  get_test_pool: () => test_pool,
};
