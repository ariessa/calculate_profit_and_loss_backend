const { setup_test_db, delete_test_db } = require("./db.setup");

let pool;

beforeAll(async () => {
  pool = await setup_test_db();

  // Insert dummy data
  await pool.query(`
      INSERT INTO token_prices (snapshot_date, price_in_usd)
      VALUES
        ('2024-01-01 00:00:00+00', 1.00),
        ('2024-01-02 00:00:00+00', 2.00),
        ('2024-01-03 00:00:00+00', 1.50),
        ('2024-01-04 00:00:00+00', 2.50),
        ('2024-01-05 00:00:00+00', 1.00);
      INSERT INTO user_balances (user_address, snapshot_date, balance)
      VALUES 
        ('0x1234567890abcdef1234567890abcdef12345678', '2024-01-01 00:00:00.000 UTC', 0),
        ('0x1234567890abcdef1234567890abcdef12345678', '2024-01-02 00:00:00.000 UTC', 100),
        ('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', '2024-01-02 00:00:00.000 UTC', 0),
        ('0x1234567890abcdef1234567890abcdef12345678', '2024-01-03 00:00:00.000 UTC', 50),
        ('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', '2024-01-03 00:00:00.000 UTC', 0),
        ('0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', '2024-01-03 00:00:00.000 UTC', 100);
  `);
});

afterAll(async () => {
  await delete_test_db();
});

describe("function get_user_transactions", () => {
  const user_address = "0x1234567890abcdef1234567890abcdef12345678";
  const user_address_2 = "0xabcdef1234567890abcdef1234567890abcdef12";
  const user_address_3 = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
  const user_address_4 = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

  test("returns buy and sell transactions for user with multiple balance changes", async () => {
    const query = "SELECT * FROM get_user_transactions($1)";
    const { rows } = await pool.query(query, [user_address]);
    const expected_result = [
      {
        balance: "50",
        balance_change: "-50",
        trade_type: "sell",
        price_in_usd: "1.500000000000000000",
        value_in_usd: "-75.0000",
      },
      {
        balance: "100",
        balance_change: "100",
        trade_type: "buy",
        price_in_usd: "2.000000000000000000",
        value_in_usd: "200.0000",
      },
    ];

    expect(rows.length).toBe(2);
    expect(rows).toMatchObject(expected_result);
  });

  test("returns empty array for user with no balance records", async () => {
    const query = "SELECT * FROM get_user_transactions($1)";
    const { rows } = await pool.query(query, [user_address_2]);
    const expected_result = [];

    expect(rows.length).toBe(0);
    expect(rows).toMatchObject(expected_result);
  });

  test("returns empty array for user with only unchanged balances", async () => {
    const query = "SELECT * FROM get_user_transactions($1)";
    const { rows } = await pool.query(query, [user_address_3]);
    const expected_result = [];

    expect(rows.length).toBe(0);
    expect(rows).toMatchObject(expected_result);
  });

  test("returns a single buy transaction for user with one balance event", async () => {
    const query = "SELECT * FROM get_user_transactions($1)";
    const { rows } = await pool.query(query, [user_address_4]);
    const expected_result = [
      {
        balance: "100",
        balance_change: "100",
        trade_type: "buy",
        price_in_usd: "1.500000000000000000",
        value_in_usd: "150.0000",
      },
    ];

    expect(rows.length).toBe(1);
    expect(rows).toMatchObject(expected_result);
  });
});
