const ethers = require("ethers");
const dayjs = require("dayjs");
const relativeTime = require("dayjs/plugin/relativeTime");
dayjs.extend(relativeTime);

const is_valid_address = (address) => {
  return ethers.isAddress(address);
};

const parse_pnl = (raw_pnl) => {
  const raw = raw_pnl?.rows[0]?.pnl;
  const parts = raw.slice(1, -1).split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

  return {
    realised_pnl: parseFloat(parts[0]),
    unrealised_pnl: parseFloat(parts[1]),
    total_pnl: parseFloat(parts[2]),
    pnl_description: parts[3].replace(/^"|"$/g, ""),
  };
};

const parse_txns = (raw_txns) => {
  const raw = raw_txns?.rows;
  return raw
    .map(({ transaction }) => {
      const matches = transaction.match(
        /\("([^"]+)",([^,]+),([^,]+),([^,]+),([^,]+),([^,]+)\)/
      );

      if (!matches) return null;

      const [
        ,
        timestamp,
        balance,
        balance_change,
        trade_type,
        price_in_usd,
        value_in_usd,
      ] = matches;

      return {
        timestamp,
        balance: Number(balance),
        balance_change: Number(balance_change),
        trade_type,
        price_in_usd: Number(price_in_usd),
        value_in_usd: Number(value_in_usd),
        age: dayjs(timestamp).fromNow(),
      };
    })
    .filter(Boolean);
};

module.exports = {
  is_valid_address,
  parse_pnl,
  parse_txns,
};
