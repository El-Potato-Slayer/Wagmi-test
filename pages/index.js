import Head from 'next/head'
import { Inter } from 'next/font/google'
import styles from '@/styles/Home.module.css'
import { useEffect, useState } from 'react'
import { switchNetwork, waitForTransaction } from '@wagmi/core'
import { useContractWrite, usePrepareContractWrite } from 'wagmi'
import { Web3Button } from '@web3modal/react'
import abi from '../abi.json';
import abiUSDT from '../usdt_abi.json';
import abiBUSD from '../busd_abi.json';
import abiUSDC from '../usdt_abi.json';
import { CONTRACTS } from '@/constants'
import { ethers } from 'ethers'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  const [inputs, setInputs] = useState({ amount: null, selected_currency: 'usdt' });
  const [icoAddress, setICOAddress] = useState(CONTRACTS[inputs.selected_currency].ico_address);
  const [stableCoinAddress, setStableCoinAddress] = useState(CONTRACTS[inputs.selected_currency].stable_coin_address);
  const [stableCoinAbi, setStableCoinAbi] = useState(abiUSDT);

  /* Approve function set up */
  const { config: configApprove } = usePrepareContractWrite({
    address: stableCoinAddress,
    abi: stableCoinAbi,
    chainId: CONTRACTS[inputs.selected_currency].chain_id,
    functionName: 'approve',
    onSettled(data, error) {
      console.log('Settled approve', { data, error });
    },
    args: [icoAddress, ethers.utils.parseUnits(
      inputs.amount || "0",
      CONTRACTS[inputs.selected_currency].exponent
    ), {
        gasLimit: ethers.utils.hexlify(100000)
      }]
  })
  const { writeAsync: approve } = useContractWrite(configApprove)

  /* Buy set up */
  const { config: configBuy } = usePrepareContractWrite({
    address: icoAddress,
    abi: abi,
    chainId: CONTRACTS[inputs.selected_currency].chain_id,
    functionName: 'buyTokensWthStableCoin',
    onSettled(data, error) {
      console.log('Settled buy', { data, error });
    },
    args: [ethers.utils.parseUnits(
      inputs.amount || "0",
      CONTRACTS[inputs.selected_currency.toLowerCase()].exponent
    ), {
      gasLimit: ethers.utils.hexlify(100000)
    }]
  })
  const { writeAsync: buyLGCT } = useContractWrite(configBuy)

  /* Switch Networks */
  const handleNetworkSwitch = async (selectedCurrency) => {
    /* Switch networks based on selected currency */
    try {
      if (selectedCurrency === 'usdt') {
        /* Switch to Sepolia */
        await switchNetwork({ chainId: 11155111 })
        setStableCoinAbi(abiUSDT);
      } else if (selectedCurrency === 'usdc') {
        /* Switch to Goerli */
        await switchNetwork({ chainId: 5 })
        setStableCoinAbi(abiUSDC);
      } else if (selectedCurrency === 'busd') {
        /* Switch to BSC testnet */
        await switchNetwork({ chainId: 97 })
        setStableCoinAbi(abiBUSD);
      }
      setStableCoinAddress(CONTRACTS[inputs.selected_currency].stable_coin_address)
    } catch (error) {

    }
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    const temp = { ...inputs }
    temp[name] = value;
    setInputs({ ...temp });

    /* If selected currency is changed, switch networks */
    if (name === 'selected_currency') {
      handleNetworkSwitch(value)
    }
  }

  const purchaseTokens = async () => {
    try {
      const approvalReceipt = await approve();
      await waitForTransaction({
        hash: approvalReceipt.hash,
      })
      const finalReceipt = await buyLGCT();
      await waitForTransaction({
        hash: finalReceipt?.hash,
      })
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={`${styles.main} ${inter.className}`}>
        <Web3Button />
        <h2>Buy LGCT with one of the following currencies:</h2>
        <div className={`${styles['inputs-wrapper']}`}>
          <input
            placeholder='Amount'
            name='amount'
            value={inputs.amount || ''}
            onChange={handleInputChange}
          />
          <select
            name="selected_currency"
            value={inputs.selected_currency}
            onChange={handleInputChange}
          >
            <option value="usdt">USDT</option>
            <option value="usdc">USDC</option>
            <option value="busd">BUSD</option>
          </select>
        </div>
        <button onClick={purchaseTokens}>Purchase LGCT</button>
      </main>
    </>
  )
}
