# Deposit L2 Native Token

A sample script to deposit L2 native token from L1 to L2.

## How it works
L15 chain's native token can be any ERC20 token in L1(Ethereum). It makes users can pay gas for L2 interacts with the native token.

To deposit native token from L1 to L2, just one transaction is needed in L1. `Inbox.depositNativeToken`. After few minutes later from this transaction, deposit is applied to L2 automatically.

## Settings
Create `.env` file and fill the settings to run the script.
- `L1_RPC`: L1 RPC endpoint (e.g. Ropsten Infura endpoint for dev server)
- `L2_RPC`: L2 RPC endpoint
- `PRIVATE_KEY`: Ethereum wallet private key
- `NATIVE_TOKEN_ADDR`: L1 ERC20 contract address of L2 native token
- `INBOX_ADDR`: L1 Inbox contract address

## Run
```bash
yarn deposit
```
