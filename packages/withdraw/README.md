# Withdraw L2 Native Token

A sample script to withdraw L2 native token from L2 to L1.

## How it works
To withdraw L2 native token from L2 to L1, users have to execute a transaction on each of L2 and L1.
1. `ArbSys.withdrawEth()` in L2: This will trigger withdrawal process.
2. After the withdrawal is triggered, we have to wait for rollup confirmation period. it will be ~10 minutes in dev server.
3. After the rollup confirmation period, user can get `OutboxEntryCreated` event in L1.
4. Finally user can execute `Outbox.exeucteTransaction()` to get the token.

## Settings
Create `.env` file and fill the settings to run the script.
- `L1_RPC`: L1 RPC endpoint (e.g. Ropsten Infura endpoint for dev server)
- `L2_RPC`: L2 RPC endpoint
- `PRIVATE_KEY`: Ethereum wallet private key
- `NATIVE_TOKEN_ADDR`: L1 ERC20 contract address of L2 native token
- `OUTBOX_ADDR`: L1 Outbox contract address

## Run
```bash
yarn withdraw
```
