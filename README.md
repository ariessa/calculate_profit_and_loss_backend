# Calculate Profit and Loss

A backend service that accepts a wallet address and returns their PnL (Profit and Loss) for xAVAX token - a leveraged derivative of sAVAX with no liquidation risk.

<br />

**Table of Contents**

- [System Architecture Diagram](#system-architecture-diagram)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Installation](#installation)
    - [Prerequisites](#prerequisites)
    - [Setup](#setup)
- [How to run the tests](#how-to-run-the-tests)
- [License](#license)

<br />

## System Architecture Diagram

<img src="diagrams/system_architecture_diagram.png"/>

<br />

## Entity Relationship Diagram

<img src="diagrams/entity_relationship_diagram.png"/>

<br />

## Low Fidelity Wireframes

<img src="wireframes/low_fidelity_wireframes.png"/>

<br />

## Installation

### Prerequisites

All installation instructions are geared for macOS Apple Silicon system. By default, all UNIX-based and Linux-based system are already installed with make.

For Windows system, make can be installed using 3 ways:

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

## How to run the tests

Get a list of unit tests and their verbose results

```bash
make tests
```

<br />

## License

Calculate Profit and Loss is licensed under the [GNU GPLv3 License](LICENSE).
