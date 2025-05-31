const request = require("supertest");
const app = require("../index");
const db = require("../lib/db");
const utils = require("../lib/utils");

jest.mock("../lib/db");
jest.mock("../lib/utils");

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
});

describe("GET /pnl/:address", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return PnL and transactions if address is valid and has data", async () => {
    utils.is_valid_address.mockReturnValue(true);
    db.query
      .mockResolvedValueOnce({
        rows: [
          { pnl: '(100.00,50.00,150.00,"Realised gains, still holding")' },
        ],
      })
      .mockResolvedValueOnce({
        rowCount: 2,
        rows: [
          {
            transaction: '("2024-01-01",100.0,50.0,"buy",2.00,100.00)',
          },
          {
            transaction: '("2024-01-02",150.0,50.0,"sell",2.50,125.00)',
          },
        ],
      });

    utils.parse_pnl.mockReturnValue({
      realised_pnl: 100.0,
      unrealised_pnl: 50.0,
      total_pnl: 150.0,
      pnl_description: "Realised gains, still holding",
    });

    utils.parse_txns.mockReturnValue([
      {
        timestamp: "2024-01-01",
        balance: 100.0,
        balance_change: 50.0,
        trade_type: "buy",
        price_in_usd: 2.0,
        value_in_usd: 100.0,
        age: "1 day ago",
      },
    ]);

    const res = await request(app).get(
      "/pnl/0x1234567890abcdef1234567890abcdef12345678"
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.address).toBe("0x1234567890abcdef1234567890abcdef12345678");
    expect(res.body.pnl.realised_pnl).toBe(100.0);
    expect(Array.isArray(res.body.transactions)).toBe(true);
    expect(utils.is_valid_address).toHaveBeenCalledWith(
      "0x1234567890abcdef1234567890abcdef12345678"
    );
  });

  it("should return empty results if address is valid but no transactions", async () => {
    utils.is_valid_address.mockReturnValue(true);

    db.query
      .mockResolvedValueOnce({
        rows: [{ pnl: '(0,0,0,"Never held tokens")' }],
      })
      .mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      });

    utils.parse_pnl.mockReturnValue({});

    const res = await request(app).get(
      "/pnl/0x1234567890abcdef1234567890abcdef12345678"
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.address).toBe("0x1234567890abcdef1234567890abcdef12345678");
    expect(res.body.transactions).toEqual([]);
    expect(res.body.pnl).toEqual({});
  });

  it("should return error if address is invalid", async () => {
    utils.is_valid_address.mockReturnValue(false);

    const res = await request(app).get("/pnl/invalid");

    expect(res.statusCode).toBe(200);
    expect(res.body.error).toBe("Invalid address");
  });

  it("should handle server errors", async () => {
    utils.is_valid_address.mockReturnValue(true);
    db.query.mockRejectedValueOnce(new Error("Database failure"));

    const res = await request(app).get(
      "/pnl/0x1234567890abcdef1234567890abcdef12345678"
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Server error");
  });
});
