const { Client } = require('pg');

const host = process.env.IS_DOCKER == "true" ? process.env.DB_CONTAINER_NAME : process.env.DB_HOST;
const port = process.env.DB_PORT;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_NAME;

const wait_for_db = async () => {
  const maxAttempts = 30;
  const delay = 1000;

  for (let i = 1; i <= maxAttempts; i++) {
    const client = new Client({ host, port, user, password, database });
    try {
      await client.connect();
      console.log('DB is ready');
      await client.end();
      return;
    } catch {
      console.log(`Waiting for DB (${i}/${maxAttempts})...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }

  console.error('Could not connect to DB after multiple attempts');
  process.exit(1);
};

wait_for_db();
