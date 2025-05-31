# Calculate Profit and Loss - Backend

Calculate the profit and loss (PnL) of a wallet address that holds xAVAX tokens.

<br />

**Table of Contents**

- [Tech Stack](#tech-stack)
- [System Architecture Diagram](#system-architecture-diagram)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Low Fidelity Wireframes](#low-fidelity-wireframes)
- [Installation](#installation)
    - [Prerequisites](#prerequisites)
    - [Setup](#setup)
- [Tests](#tests)
    - [How to Run the Tests](#how-to-run-the-tests)
- [Database Functions](#)
    - [Calculate User's Profit and Loss](#)
    - [Get User's transactions](#)
- [API Endpoint](#api-endpoint)
    - [GET /pnl/:address](#get-pnladdress)
- [License](#license)

<br />

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Data Source:** Indexed data via Dune Analytics queries
- **Testing:** Jest
- **Infrastructure:** Docker, Bash Scripts
- **Tooling & Automation:** Makefile, jq, curl

<br />

## System Architecture Diagram

<img src="diagrams/system_architecture_diagram.png"/>

This project uses data pulled from Dune Analytics to seed the PostgreSQL database.

The script fetch_dune_query.sh is used to execute and fetch query results from Dune using the official API. Raw query results are stored in the query_results directory.

The files token_prices.csv and user_balances.csv are cleaned versions of the Dune outputs. These files are structured to match the database schema:

- `token_prices`: Stores token price snapshots with timestamps.
- `user_balances`: Stores user balances over time.

Header fields are updated to match the column names defined in the tables. Any `NULL` values in user balances are replaced with 0 to maintain data integrity and ensure smooth import.

<br />

## Entity Relationship Diagram

<img src="diagrams/entity_relationship_diagram.png"/>

<br />

## Low Fidelity Wireframes

<img src="wireframes/low_fidelity_wireframes.png"/>

<br />

## Installation

### Prerequisites

All installation instructions are geared for macOS Apple Silicon system. By default, all UNIX-based and Linux-based system are already installed with `make`.

For Windows system, `make` can be installed using 3 ways:

- Using Make for Windows
- Using chocolatey to install make
- Using Windows Subsystem for Linux (WSL2)

<br />

### Setup

- Clone the repository

- Create a `.env` file based on `.env.example` file

- Build and start Docker containers

```bash
make up
```

<br />

## Tests

### How to Run the Tests

Get a list of unit tests and their verbose results

```bash
make tests
```

<br />

## Database Functions

### Calculate User's Profit and Loss

<br />

### Get User's Transactions

<br />

## API Endpoint

### GET /pnl/:address

<br />

## License

Calculate Profit and Loss - Backend is licensed under the [GNU GPLv3 License](LICENSE).
