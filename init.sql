-- Create a database called pnl
CREATE DATABASE pnl;

-- Connect to pnl database
\c pnl

-- Create a table called tokens if it does not exist
CREATE TABLE IF NOT EXISTS tokens (
    id serial PRIMARY KEY,
    contract_address VARCHAR(44) NOT NULL,
    creation_tx_hash VARCHAR(88) NOT NULL,
    name VARCHAR(200) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    decimals INT NOT NULL,
    logo VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create a table called trades if it does not exist
CREATE TABLE IF NOT EXISTS trades (
    id serial PRIMARY KEY,
    tx_hash VARCHAR(64) NOT NULL,
    tx_timestamp TIMESTAMP NOT NULL,
    block_number BIGINT NOT NULL,
    from_address VARCHAR(44) NOT NULL,
    to_address VARCHAR(44) NOT NULL,
    amount DECIMAL(40, 0) NOT NULL,
    price_in_usd DECIMAL(65, 18) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add new token into table tokens
INSERT INTO tokens (contract_address, creation_tx_hash, name, symbol, decimals, logo) 
VALUES 
('0x698C34Bad17193AF7E1B4eb07d1309ff6C5e715e', '0x302978aff4665f557413f4dd8f26d2e765642582fc750a7d2ab5e06c6204c8b6', 'xAVAX', 'xAVAX', 18, 'xavax.png')
RETURNING *;
