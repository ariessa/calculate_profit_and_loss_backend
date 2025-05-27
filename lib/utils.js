const ethers = require("ethers");

const is_valid_address = (address) => {
  return ethers.isAddress(address);
};

module.exports = {
    is_valid_address,
};
