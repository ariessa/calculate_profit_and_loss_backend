const { setup_test_db, delete_test_db } = require("./db.setup");

let pool;

beforeAll(async () => {
  pool = await setup_test_db();
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
