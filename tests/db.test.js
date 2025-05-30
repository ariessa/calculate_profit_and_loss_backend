const { setup_test_db, delete_test_db, get_test_pool } = require("./db.setup");

let pool;

beforeAll(async () => {
  pool = await setup_test_db();

  await pool.query(`
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
        balance NUMERIC,
        balance_change NUMERIC,
        trade_type TEXT
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
            END AS trade_type
        FROM balance_changes bc
        WHERE bc.balance_change <> 0
        ORDER BY bc.snapshot_date DESC;
    END;
    $$ LANGUAGE plpgsql;
  `);
});

afterAll(async () => {
  await delete_test_db();
});

beforeEach(async () => {
  // Insert dummy data
  await pool.query(`
      INSERT INTO user_balances (user_address, snapshot_date, balance)
      VALUES 
        ('0x1234567890abcdef1234567890abcdef12345678', '2024-01-01 00:00:00.000 UTC', 0),
        ('0x1234567890abcdef1234567890abcdef12345678', '2024-01-02 00:00:00.000 UTC', 100),
        ('0x1234567890abcdef1234567890abcdef12345678', '2024-01-03 00:00:00.000 UTC', 50);
    `);
});

afterEach(async () => {
  // Clear the table
  await pool.query(`DELETE FROM user_balances`);
});

describe("function get_user_transactions", () => {
  const user_address = "0x1234567890abcdef1234567890abcdef12345678";

  test("returns all transactions for a user that has balance change > 0", async () => {
    const query = "SELECT * FROM get_user_transactions($1)";
    const result = await pool.query(query, [user_address]);
    const expected_result = [
      {
        balance: "50",
        balance_change: "-50",
        trade_type: "sell",
      },
      {
        balance: "100",
        balance_change: "100",
        trade_type: "buy",
      },
    ];

    expect(result.rows).toBeDefined();
    expect(Array.isArray(result.rows)).toBe(true);
    expect(result.rows.length).toBe(2);
    expect(result.rows).toMatchObject(expected_result);
  });
});
