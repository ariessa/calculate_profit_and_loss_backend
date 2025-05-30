-- Create a database called pnl
CREATE DATABASE pnl;

-- Connect to pnl database
\c pnl

-- Set timezone to UTC
SET TIMEZONE TO 'UTC';

-- Create a table called token_prices if it does not exist
CREATE TABLE IF NOT EXISTS token_prices (
    id SERIAL PRIMARY KEY,
    snapshot_date TIMESTAMPTZ NOT NULL,
    price_in_usd NUMERIC(65, 18) DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create a table called user_balances if it does not exist
CREATE TABLE IF NOT EXISTS user_balances (
    id serial PRIMARY KEY,
    snapshot_date TIMESTAMPTZ NOT NULL,
    user_address VARCHAR(44) NOT NULL,
    balance NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed data into table token_prices
COPY token_prices(snapshot_date, price_in_usd)
FROM '/docker-entrypoint-initdb.d/data/token_prices.csv'
DELIMITER ','
CSV HEADER;

-- Seed data into table user_balances
COPY user_balances(snapshot_date, user_address, balance)
FROM '/docker-entrypoint-initdb.d/data/user_balances.csv'
DELIMITER ','
CSV HEADER;

-- Create a function to calculate current profit and loss of xAVAX token for an address
CREATE OR REPLACE FUNCTION calculate_user_pnl(p_user VARCHAR(44))
RETURNS TABLE (
    pnl_value NUMERIC(65, 18),
    pnl_percentage NUMERIC(65, 18),
    pnl_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_price AS (
        SELECT tp.price_in_usd
        FROM token_prices tp
        ORDER BY tp.snapshot_date DESC
        LIMIT 1
    ),
    latest_balance AS (
        SELECT ub.balance
        FROM user_balances ub
        WHERE ub.user_address = p_user
        ORDER BY ub.snapshot_date DESC
        LIMIT 1
    ),
    initial_balance AS (
        SELECT ub.balance AS initial_balance
        FROM user_balances ub
        WHERE ub.user_address = p_user
        ORDER BY ub.snapshot_date ASC
        LIMIT 1
    )
    SELECT
        (lb.balance * lp.price_in_usd) - (ib.initial_balance * 1) AS pnl_value,
        ROUND(
            CASE
                WHEN ib.initial_balance = 0 THEN NULL
                ELSE ((lb.balance * lp.price_in_usd) - (ib.initial_balance * 1)) / (ib.initial_balance * 1) * 100
            END, 2
        ) AS pnl_percentage,
        CASE
            WHEN lb.balance = 0 AND lp.price_in_usd > 0 THEN 'User exited (sold all)'
            WHEN lb.balance > 0 AND lp.price_in_usd = 0 THEN 'Token worthless'
            WHEN lb.balance = 0 AND lp.price_in_usd = 0 THEN 'Zero balance + worthless token'
            ELSE 'Active holding'
        END AS pnl_description
    FROM latest_balance lb, initial_balance ib, latest_price lp;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get all transactions for an address with balance > 0
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
