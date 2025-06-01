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
    host: process.env.IS_DOCKER == "true" ? process.env.DB_CONTAINER_NAME : process.env.DB_HOST,
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
    host: process.env.IS_DOCKER == "true" ? process.env.DB_CONTAINER_NAME : process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: TEST_DB_NAME,
    port: process.env.DB_PORT,
  });

  // Ensure every new connection uses UTC timezone
  test_pool.on("connect", async (client) => {
    await client.query(`
      SET TIMEZONE TO 'UTC';
      CREATE TABLE IF NOT EXISTS token_prices (
        id SERIAL PRIMARY KEY,
        snapshot_date TIMESTAMPTZ NOT NULL,
        price_in_usd NUMERIC(65, 18) DEFAULT 0 NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS user_balances (
        id serial PRIMARY KEY,
        snapshot_date TIMESTAMPTZ NOT NULL,
        user_address VARCHAR(44) NOT NULL,
        balance NUMERIC NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE OR REPLACE FUNCTION get_user_transactions(p_user_address VARCHAR)
      RETURNS TABLE (
          snapshot_date TIMESTAMPTZ,
          balance NUMERIC(65, 18),
          balance_change NUMERIC(65, 18),
          trade_type TEXT,
          price_in_usd NUMERIC(65, 18),
          value_in_usd NUMERIC(65, 18)
      ) AS $$
      BEGIN
          RETURN QUERY
          WITH balance_changes AS (
              SELECT
                  ub.snapshot_date,
                  ub.balance,
                  ub.user_address,
                  ub.balance - COALESCE(
                      LAG(ub.balance) OVER (PARTITION BY ub.user_address ORDER BY ub.snapshot_date), 
                      0
                  ) AS balance_change
              FROM user_balances ub
              WHERE ub.user_address = p_user_address
          )
          SELECT
              bc.snapshot_date,
              bc.balance,
              bc.balance_change,
              CASE
                  WHEN bc.balance_change > 0 THEN 'buy'
                  WHEN bc.balance_change < 0 THEN 'sell'
              END AS trade_type,
              tp.price_in_usd,
              ROUND(bc.balance_change * tp.price_in_usd, 4) AS value_in_usd
          FROM balance_changes bc
          LEFT JOIN token_prices tp
            ON DATE_TRUNC('day', bc.snapshot_date) = DATE_TRUNC('day', tp.snapshot_date)
          WHERE bc.balance_change <> 0
          ORDER BY bc.snapshot_date DESC;
      END;
      $$ LANGUAGE plpgsql;
      CREATE OR REPLACE FUNCTION calculate_user_pnl(p_user VARCHAR(44))
      RETURNS TABLE (
        realised_pnl NUMERIC(65, 4),
        unrealised_pnl NUMERIC(65, 4),
        total_pnl NUMERIC(65, 4),
        pnl_description TEXT
      ) AS $$
      DECLARE
        avg_cost_basis NUMERIC(65, 4) := 0;
        total_cost NUMERIC(65, 18) := 0;
        total_quantity NUMERIC(65, 18) := 0;
        realised_pnl_accum NUMERIC(65, 18) := 0;
        prev_balance NUMERIC(65, 18) := 0;
        current_price NUMERIC(65, 18);
        current_balance NUMERIC(65, 18);
        r RECORD;
        has_held_tokens BOOLEAN;
        address_exists BOOLEAN;
        epsilon NUMERIC := 0.0001;
        r_pnl NUMERIC(65,4);
        u_pnl NUMERIC(65,4);
      BEGIN
        -- Check if the user has ever held tokens
        has_held_tokens := EXISTS (
          SELECT 1
          FROM user_balances
          WHERE user_address = p_user AND balance > 0
        );
  
        -- Check if the address exists in db or not
        address_exists := EXISTS (
          SELECT 1 FROM user_balances WHERE user_address = p_user
        );
  
        -- Get current token price
        SELECT price_in_usd INTO current_price
        FROM token_prices
        ORDER BY snapshot_date DESC
        LIMIT 1;
  
        -- Get current user balance
        SELECT balance INTO current_balance
        FROM user_balances
        WHERE user_address = p_user
        ORDER BY snapshot_date DESC
        LIMIT 1;
  
        -- Loop through user's balance history
        FOR r IN (
          SELECT
            ub.snapshot_date,
            ub.balance,
            tp.price_in_usd
          FROM user_balances ub
          JOIN token_prices tp ON ub.snapshot_date = tp.snapshot_date
          WHERE ub.user_address = p_user
          ORDER BY ub.snapshot_date
        ) LOOP
          IF r.balance > prev_balance THEN
            -- Buy
            total_cost := total_cost + ((r.balance - prev_balance) * r.price_in_usd);
            total_quantity := total_quantity + (r.balance - prev_balance);
          ELSIF r.balance < prev_balance THEN
            -- Sell
            DECLARE
              sell_qty NUMERIC := prev_balance - r.balance;
              avg_cost NUMERIC := CASE WHEN total_quantity > 0 THEN total_cost / total_quantity ELSE 0 END;
            BEGIN
              realised_pnl_accum := realised_pnl_accum + ((r.price_in_usd - avg_cost) * sell_qty);
              total_cost := total_cost - (avg_cost * sell_qty);
              total_quantity := total_quantity - sell_qty;
            END;
          END IF;
  
          prev_balance := r.balance;
        END LOOP;
  
        -- Final average cost basis
        avg_cost_basis := ROUND(
          CASE 
            WHEN total_quantity > 0 THEN total_cost / total_quantity
            ELSE 0
          END, 4);
  
        -- Round and zero-out small PnLs (epsilon tolerance)
        r_pnl := ROUND(realised_pnl_accum, 4);
        IF abs(r_pnl) < epsilon THEN r_pnl := 0; END IF;
  
        u_pnl := ROUND((current_price - avg_cost_basis) * current_balance, 4);
        IF abs(u_pnl) < epsilon THEN u_pnl := 0; END IF;
  
        realised_pnl := r_pnl;
        unrealised_pnl := u_pnl;
        total_pnl := ROUND(r_pnl + u_pnl, 4);
  
        pnl_description := CASE
          WHEN NOT address_exists THEN 'Address not found in database'
          WHEN NOT has_held_tokens THEN 'Never held tokens'
          WHEN has_held_tokens AND current_balance = 0 THEN 'Has held tokens but fully exited'
          WHEN r_pnl > 0 AND u_pnl > 0 THEN 'Realised and unrealised gains'
          WHEN r_pnl < 0 AND u_pnl < 0 THEN 'Realised and unrealised losses'
          WHEN r_pnl > 0 AND u_pnl <= 0 THEN 'Realised gains, still holding'
          WHEN r_pnl = 0 AND u_pnl > 0 THEN 'Unrealised gains'
          ELSE 'No significant PnL'
        END;
  
        RETURN NEXT;
      END;
      $$ LANGUAGE plpgsql;
    `);
  });

  return test_pool;
};

const delete_test_db = async () => {
  await test_pool.end();

  const admin_client = new Client({
    host: process.env.IS_DOCKER == "true" ? process.env.DB_CONTAINER_NAME : process.env.DB_HOST,
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
};
