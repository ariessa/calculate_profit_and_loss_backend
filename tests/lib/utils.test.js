const utils = require("../../lib/utils");

describe("function is_valid_address", () => {
  test("returns true when input is a valid address", () => {
    const valid_address = "0x1234567890abcdef1234567890abcdef12345678";

    expect(utils.is_valid_address(valid_address)).toBe(true);
  });

  test("returns false when input is an invalid address", () => {
    const invalid_address = "0xinvalidaddress";

    expect(utils.is_valid_address(invalid_address)).toBe(false);
  });
});
