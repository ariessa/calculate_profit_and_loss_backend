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
      INSERT INTO user_balances (user_address, snapshot_date, balance)
      VALUES 
        ('0x1234567890abcdef1234567890abcdef12345678', '2024-01-01 00:00:00.000 UTC', 0),
        ('0x1234567890abcdef1234567890abcdef12345678', '2024-01-02 00:00:00.000 UTC', 100),
        ('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', '2024-01-02 00:00:00.000 UTC', 0),
        ('0x1234567890abcdef1234567890abcdef12345678', '2024-01-03 00:00:00.000 UTC', 50),
        ('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', '2024-01-03 00:00:00.000 UTC', 0),
        ('0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', '2024-01-03 00:00:00.000 UTC', 100);
        ;
    `);
});

afterEach(async () => {
  // Clear the table
  await pool.query(`DELETE FROM user_balances`);
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
      },
      {
        balance: "100",
        balance_change: "100",
        trade_type: "buy",
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
      },
    ];

    expect(rows.length).toBe(1);
    expect(rows).toMatchObject(expected_result);
  });
});