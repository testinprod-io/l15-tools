import { ethers } from 'hardhat'
import { config } from 'dotenv'
import { BigNumberish } from 'ethers'
config()

const utils = ethers.utils

const main = async () => {
  const l1Provider = new ethers.providers.JsonRpcProvider(process.env.L1_RPC)
  const l2Provider = new ethers.providers.JsonRpcProvider(process.env.L2_RPC)
  const l1Wallet = new ethers.Wallet(
    process.env.PRIVATE_KEY as string,
    l1Provider
  )
  const l2Wallet = new ethers.Wallet(
    process.env.PRIVATE_KEY as string,
    l2Provider
  )

  const nativeToken = await ethers.getContractAt(
    'IERC20Mintable',
    process.env.NATIVE_TOKEN_ADDR as string
  )

  /*
   * 1. Check wallet's balance from L1 and L2.
   */
  const l1Balance = utils.formatEther(
    await nativeToken.connect(l1Wallet).balanceOf(l1Wallet.address)
  )
  if (l1Balance === '0.0') {
    console.log('[L1] Insufficient balance. Deposit first!')
    process.exit()
  }
  console.log(`[L1] Balance: ${l1Balance}`)

  const l2Balance = utils.formatEther(
    await l2Provider.getBalance(l2Wallet.address)
  )
  console.log(`[L2] Balance: ${l2Balance}`)

  /*
   * 2. Execute withdrawEth() function of ArbSys precompiled contract. It will trigger L2->L1 withdraw.
   */
  process.stdout.write('[L2] Execute ArbSys.withdrawEth... ')
  const arbSys = await ethers.getContractAt(
    'ArbSys',
    '0x0000000000000000000000000000000000000064'
  )
  await (
    await arbSys.connect(l2Wallet).withdrawEth(l2Wallet.address, {
      value: utils.parseEther('1.0'),
      gasLimit: 10000000,
    })
  ).wait()
  process.stdout.write('done\n')
  const startTs = Date.now()

  /*
   * 3. After rollup confirmation(~10 minutes in dev server), withdraw request is arrived at outbox and OutboxEntryCreated event is emitted.
   */
  const outbox = await ethers.getContractAt(
    'IOutbox',
    process.env.OUTBOX_ADDR as string
  )
  let outboxEntryCreated: Record<string, BigNumberish> = {}
  outbox
    .connect(l1Provider)
    .on(
      outbox.filters.OutboxEntryCreated(),
      (batchNum, outboxEntryIndex, outputRoot, numInBatch) => {
        outboxEntryCreated = {
          batchNum,
          outboxEntryIndex,
          outputRoot,
          numInBatch,
        }
      }
    )
  while (Object.keys(outboxEntryCreated).length === 0) {
    await new Promise(f => setTimeout(f, 1000))
    process.stdout.write(
      `[L1] Waiting outboxEntry... ${(Date.now() - startTs) / 1000}s\r`
    )
  }
  console.log('[L1] done')

  /*
   * 4. Then we have to prepare data to execute outbox request. We can get it from L2 NodeInterface.
   */
  process.stdout.write('[L2] Lookup MessageBatchProof... ')
  const nodeInterface = await ethers.getContractAt(
    'INodeInterface',
    '0x00000000000000000000000000000000000000C8'
  )
  const res = await nodeInterface
    .connect(l2Wallet)
    .lookupMessageBatchProof(outboxEntryCreated.batchNum, 0)
  process.stdout.write('done\n')

  /*
   * 5. Execute outbox request and then withdraw will be done.
   */
  process.stdout.write('[L1] Execute Outbox Transaction... ')
  await (
    await outbox
      .connect(l1Wallet)
      .executeTransaction(
        outboxEntryCreated.batchNum,
        res.proof,
        0,
        res.l2Sender,
        res.l1Dest,
        res.l2Block,
        res.l1Block,
        res.timestamp,
        res.amount,
        res.calldataForL1,
        { gasLimit: 1000000 }
      )
  ).wait()
  process.stdout.write(`done\n`)

  console.log(
    `[L1] Balance: ${utils.formatEther(
      await nativeToken.connect(l1Wallet).balanceOf(l1Wallet.address)
    )}`
  )

  console.log(
    `[L2] Balance: ${utils.formatEther(
      await l2Provider.getBalance(l2Wallet.address)
    )}`
  )
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
