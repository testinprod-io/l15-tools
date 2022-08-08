import { ethers } from 'hardhat'
import { config } from 'dotenv'
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
   * 1. Check wallet's balance from L1 and L2 and mint native token if needed.
   */
  let l1Balance = utils.formatEther(
    await nativeToken.connect(l1Wallet).balanceOf(l1Wallet.address)
  )
  if (Number.parseFloat(l1Balance) < 100) {
    process.stdout.write('[L1] Insufficient balance. Mint Native token... ')
    await (
      await nativeToken
        .connect(l1Wallet)
        .mint(l1Wallet.address, utils.parseEther('1000'), { gasLimit: 1000000 })
    ).wait()
    l1Balance = utils.formatEther(
      await nativeToken.connect(l1Wallet).balanceOf(l1Wallet.address)
    )
    process.stdout.write('done\n')
  }
  console.log(`[L1] Balance: ${l1Balance}`)

  const l2Balance = utils.formatEther(
    await l2Provider.getBalance(l2Wallet.address)
  )
  console.log(`[L2] Balance: ${l2Balance}`)

  /*
   * 2. Execute `depositNativeToken()` function of L1 Inbox contract. It will trigger L1->L2 native token deposit.
   */
  process.stdout.write('[L1] Execute Inbox.depositNativeToken... ')
  const amount = utils.parseEther('100')
  const inbox = await ethers.getContractAt(
    'IInbox',
    process.env.INBOX_ADDR as string
  )
  await (
    await nativeToken
      .connect(l1Wallet)
      .approve(inbox.address, amount, { gasLimit: 1000000 })
  ).wait()
  await (
    await inbox.connect(l1Wallet).depositNativeToken(amount, 0, {
      gasLimit: 10000000,
    })
  ).wait()
  process.stdout.write('done\n')
  const startTs = Date.now()

  /*
   * 3. Check L2 balance to verify if deposit is done.
   */
  while (
    utils.formatEther(await l2Provider.getBalance(l2Wallet.address)) ===
    l2Balance
  ) {
    await new Promise(f => setTimeout(f, 1000))
    process.stdout.write(
      `[L2] Waiting deposit... ${(Date.now() - startTs) / 1000}s\r`
    )
  }
  process.stdout.write('\n[L2] done\n')
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
