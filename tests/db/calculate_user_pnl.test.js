const { setup_test_db, delete_test_db } = require("./db.setup");

let pool;

beforeAll(async () => {
  pool = await setup_test_db();

//   await pool.query(`
//     CREATE TABLE IF NOT EXISTS token_prices (
//       id SERIAL PRIMARY KEY,
//       snapshot_date TIMESTAMPTZ NOT NULL,
//       price_in_usd NUMERIC(65, 18) DEFAULT 0 NOT NULL,
//       created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
//       updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
//     );
//     CREATE TABLE IF NOT EXISTS user_balances (
//       id serial PRIMARY KEY,
//       snapshot_date TIMESTAMPTZ NOT NULL,
//       user_address VARCHAR(44) NOT NULL,
//       balance NUMERIC NOT NULL,
//       created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
//       updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
//     );
//     CREATE OR REPLACE FUNCTION calculate_user_pnl(p_user VARCHAR(44))
//     RETURNS TABLE (
//       realised_pnl NUMERIC(65, 4),
//       unrealised_pnl NUMERIC(65, 4),
//       total_pnl NUMERIC(65, 4),
//       pnl_description TEXT
//     ) AS $$
//     DECLARE
//       avg_cost_basis NUMERIC(65, 4) := 0;
//       total_cost NUMERIC(65, 18) := 0;
//       total_quantity NUMERIC(65, 18) := 0;
//       realised_pnl_accum NUMERIC(65, 18) := 0;
//       prev_balance NUMERIC(65, 18) := 0;
//       current_price NUMERIC(65, 18);
//       current_balance NUMERIC(65, 18);
//       r RECORD;
//       has_held_tokens BOOLEAN;
//       address_exists BOOLEAN;
//       epsilon NUMERIC := 0.0001;
//       r_pnl NUMERIC(65,4);
//       u_pnl NUMERIC(65,4);
//     BEGIN
//       -- Check if the user has ever held tokens
//       has_held_tokens := EXISTS (
//         SELECT 1
//         FROM user_balances
//         WHERE user_address = p_user AND balance > 0
//       );

//       -- Check if the address exists in db or not
//       address_exists := EXISTS (
//         SELECT 1 FROM user_balances WHERE user_address = p_user
//       );

//       -- Get current token price
//       SELECT price_in_usd INTO current_price
//       FROM token_prices
//       ORDER BY snapshot_date DESC
//       LIMIT 1;

//       -- Get current user balance
//       SELECT balance INTO current_balance
//       FROM user_balances
//       WHERE user_address = p_user
//       ORDER BY snapshot_date DESC
//       LIMIT 1;

//       -- Loop through user's balance history
//       FOR r IN (
//         SELECT
//           ub.snapshot_date,
//           ub.balance,
//           tp.price_in_usd
//         FROM user_balances ub
//         JOIN token_prices tp ON ub.snapshot_date = tp.snapshot_date
//         WHERE ub.user_address = p_user
//         ORDER BY ub.snapshot_date
//       ) LOOP
//         IF r.balance > prev_balance THEN
//           -- Buy
//           total_cost := total_cost + ((r.balance - prev_balance) * r.price_in_usd);
//           total_quantity := total_quantity + (r.balance - prev_balance);
//         ELSIF r.balance < prev_balance THEN
//           -- Sell
//           DECLARE
//             sell_qty NUMERIC := prev_balance - r.balance;
//             avg_cost NUMERIC := CASE WHEN total_quantity > 0 THEN total_cost / total_quantity ELSE 0 END;
//           BEGIN
//             realised_pnl_accum := realised_pnl_accum + ((r.price_in_usd - avg_cost) * sell_qty);
//             total_cost := total_cost - (avg_cost * sell_qty);
//             total_quantity := total_quantity - sell_qty;
//           END;
//         END IF;

//         prev_balance := r.balance;
//       END LOOP;

//       -- Final average cost basis
//       avg_cost_basis := ROUND(
//         CASE 
//           WHEN total_quantity > 0 THEN total_cost / total_quantity
//           ELSE 0
//         END, 4);

//       -- Round and zero-out small PnLs (epsilon tolerance)
//       r_pnl := ROUND(realised_pnl_accum, 4);
//       IF abs(r_pnl) < epsilon THEN r_pnl := 0; END IF;

//       u_pnl := ROUND((current_price - avg_cost_basis) * current_balance, 4);
//       IF abs(u_pnl) < epsilon THEN u_pnl := 0; END IF;

//       realised_pnl := r_pnl;
//       unrealised_pnl := u_pnl;
//       total_pnl := ROUND(r_pnl + u_pnl, 4);

//       pnl_description := CASE
//         WHEN NOT address_exists THEN 'Address not found in database'
//         WHEN NOT has_held_tokens THEN 'Never held tokens'
//         WHEN has_held_tokens AND current_balance = 0 THEN 'Has held tokens but fully exited'
//         WHEN r_pnl > 0 AND u_pnl > 0 THEN 'Realised and unrealised gains'
//         WHEN r_pnl < 0 AND u_pnl < 0 THEN 'Realised and unrealised losses'
//         WHEN r_pnl > 0 AND u_pnl <= 0 THEN 'Realised gains, still holding'
//         WHEN r_pnl = 0 AND u_pnl > 0 THEN 'Unrealised gains'
//         ELSE 'No significant PnL'
//       END;

//       RETURN NEXT;
//     END;
//     $$ LANGUAGE plpgsql;
//   `);
});

afterAll(async () => {
  await delete_test_db();
});

beforeEach(async () => {
  // Insert dummy data
  await pool.query(`
    INSERT INTO token_prices (snapshot_date, price_in_usd) VALUES
      ('2024-01-01 00:00:00+00', 1.00),
      ('2024-01-02 00:00:00+00', 2.00),
      ('2024-01-03 00:00:00+00', 1.50),
      ('2024-01-04 00:00:00+00', 2.50),
      ('2024-01-05 00:00:00+00', 1.00);

    INSERT INTO user_balances (user_address, snapshot_date, balance) VALUES
        -- Never held tokens
        ('0xneverheld00000000000000000000000000000', '2024-01-01 00:00:00+00', 0),
        ('0xneverheld00000000000000000000000000000', '2024-01-05 00:00:00+00', 0),

        -- Fully exited
        ('0xfullyexited0000000000000000000000000000', '2024-01-01 00:00:00+00', 100),
        ('0xfullyexited0000000000000000000000000000', '2024-01-05 00:00:00+00', 0),

        -- Realised + unrealised gains
        ('0xrealunrealgain0000000000000000000000000', '2024-01-01 00:00:00+00', 100),
        ('0xrealunrealgain0000000000000000000000000', '2024-01-03 00:00:00+00', 50),
        ('0xrealunrealgain0000000000000000000000000', '2024-01-05 00:00:00+00', 50),

        -- Realised + unrealised losses
        ('0xrealunrealloss0000000000000000000000000', '2024-01-02 00:00:00+00', 100),
        ('0xrealunrealloss0000000000000000000000000', '2024-01-03 00:00:00+00', 80),
        ('0xrealunrealloss0000000000000000000000000', '2024-01-05 00:00:00+00', 80),

        -- Realised gains still holding
        ('0xrealgainstillhold0000000000000000000000', '2024-01-01 00:00:00+00', 50),
        ('0xrealgainstillhold0000000000000000000000', '2024-01-04 00:00:00+00', 40),

        -- Unrealised gains only
        ('0xunrealgainonly0000000000000000000000000', '2024-01-01 00:00:00+00', 100),
        ('0xunrealgainonly0000000000000000000000000', '2024-01-04 00:00:00+00', 100),

        -- No significant PnL
        ('0xnosignificantpnl000000000000000000000000', '2024-01-01 00:00:00+00', 10),
        ('0xnosignificantpnl000000000000000000000000', '2024-01-05 00:00:00+00', 10);
  `);
});

afterEach(async () => {
  await pool.query("DELETE FROM user_balances;");
  await pool.query("DELETE FROM token_prices;");
});

describe("calculate_user_pnl function tests", () => {
  test("User never held tokens", async () => {
    const { rows } = await pool.query("SELECT * FROM calculate_user_pnl($1);", [
      "0xneverheld00000000000000000000000000000",
    ]);
    expect(rows[0].pnl_description).toBe("Never held tokens");
  });

  test("User has held tokens but fully exited", async () => {
    const { rows } = await pool.query("SELECT * FROM calculate_user_pnl($1);", [
      "0xfullyexited0000000000000000000000000000",
    ]);
    expect(rows[0].pnl_description).toBe("Has held tokens but fully exited");
  });

  test("User with realised and unrealised gains", async () => {
    // Adjust token price to trigger unrealised gains
    await pool.query(`UPDATE token_prices
            SET price_in_usd = 2.00
            WHERE snapshot_date = '2024-01-05 00:00:00+00';
        `);

    const { rows } = await pool.query("SELECT * FROM calculate_user_pnl($1);", [
      "0xrealunrealgain0000000000000000000000000",
    ]);
    expect(rows[0].pnl_description).toBe("Realised and unrealised gains");
  });

  test("User with realised and unrealised losses", async () => {
    const { rows } = await pool.query("SELECT * FROM calculate_user_pnl($1);", [
      "0xrealunrealloss0000000000000000000000000",
    ]);
    expect(rows[0].pnl_description).toBe("Realised and unrealised losses");
  });

  test("User with realised gains, still holding", async () => {
    const { rows } = await pool.query("SELECT * FROM calculate_user_pnl($1);", [
      "0xrealgainstillhold0000000000000000000000",
    ]);

    expect(rows[0].pnl_description).toBe("Realised gains, still holding");
  });

  test("User with unrealised gains only", async () => {
    // Adjust token price to trigger unrealised gains
    await pool.query(`UPDATE token_prices
        SET price_in_usd = 2.00
        WHERE snapshot_date = '2024-01-05 00:00:00+00';
    `);

    const { rows } = await pool.query("SELECT * FROM calculate_user_pnl($1);", [
      "0xunrealgainonly0000000000000000000000000",
    ]);
    expect(rows[0].pnl_description).toBe("Unrealised gains");
  });

  test("User with no significant PnL", async () => {
    const { rows } = await pool.query("SELECT * FROM calculate_user_pnl($1);", [
      "0xnosignificantpnl000000000000000000000000",
    ]);
    expect(rows[0].pnl_description).toBe("No significant PnL");
  });

  test("User not in database", async () => {
    const { rows } = await pool.query("SELECT * FROM calculate_user_pnl($1);", [
      "0xnotindb0000000000000000000000000000000000",
    ]);
    expect(rows[0].pnl_description).toBe("Address not found in database");
  });
});
