import { Contract } from '@ethersproject/contracts';
// import { getAddress } from '@ethersproject/address'
import { AddressZero } from '@ethersproject/constants';
import { JsonRpcSigner, Web3Provider } from '@ethersproject/providers';
import { BigNumber } from '@ethersproject/bignumber';
import { abi as IntercroneswapV1Router02ABI } from '@intercroneswap/v2-periphery/build/IIswapV1Router02.json';
import { abi as ISwapV2StakingABI } from '@intercroneswap/v2-staking/build/IStakingRewards.json';
import { abi as ISwapV2ArbiABI } from '@intercroneswap/v2-abitragenft/build/AbiSwapICR.json';
import { abi as ISwapEarningABI } from '../hooks/Earnings.json';
import { ROUTER_ADDRESS } from '../constants';
import { ChainId, JSBI, Percent, Token, CurrencyAmount, Currency, ETHER } from '@intercroneswap/v2-sdk';
import { TokenAddressMap } from '../state/lists/hooks';
import { ethAddress, remove0xPrefix } from '@intercroneswap/java-tron-provider';
import { getAddress } from 'ethers/lib/utils';

// returns the checksummed address if the address is valid, otherwise returns false
export function isAddress(value: any): string | false {
  try {
    return getAddress(value);
  } catch {
    return false;
  }
}

const ETHERSCAN_PREFIXES: { [chainId in ChainId]: string } = {
  11111: '',
  1: 'shasta.',
  201910292: 'nile.',
};

export function getEtherscanLink(
  chainId: ChainId,
  data: string,
  type: 'transaction' | 'token' | 'address' | 'block' | 'contract',
): string {
  const prefix = `https://${ETHERSCAN_PREFIXES[chainId] || ETHERSCAN_PREFIXES[11111]}tronscan.org`;

  switch (type) {
    case 'transaction': {
      return `${prefix}/#/transaction/${remove0xPrefix(data)}`;
    }
    case 'token': {
      return `${prefix}/#/token20/${ethAddress.toTron(data)}`;
    }
    case 'contract': {
      return `${prefix}/#/contract/${ethAddress.toTron(data)}`;
    }
    case 'address':
    default: {
      return `${prefix}/#/address/${ethAddress.toTron(data)}`;
    }
  }
}

export function shortenAddress(address: string, chars = 4): string {
  const parsed = isAddress(address);
  if (!parsed) {
    throw Error(`Invalid 'address' parameter '${address}'.`);
  }
  const tronAddress = ethAddress.toTron(parsed);
  return `${tronAddress.substring(0, chars)}...${tronAddress.substr(-chars)}`;
}
// // shorten the checksummed version of the input address to have 0x + 4 characters at start and end
// export function shortenAddress(address: string, chars = 4): string {
//   // const parsed = isAddress(address)
//   const parsed = address
//   if (!parsed) {
//     throw Error(`Invalid 'address' parameter '${address}'.`)
//   }
//   return `${parsed.substring(0, chars + 2)}...${parsed.substring(34 - chars)}`
// }

// add 10%
export function calculateGasMargin(value: BigNumber): BigNumber {
  return value.mul(BigNumber.from(10000).add(BigNumber.from(1000))).div(BigNumber.from(10000));
}

// converts a basis points value to a sdk percent
export function basisPointsToPercent(num: number): Percent {
  return new Percent(JSBI.BigInt(num), JSBI.BigInt(10000));
}

export function calculateSlippageAmount(value: CurrencyAmount, slippage: number): [JSBI, JSBI] {
  if (slippage < 0 || slippage > 10000) {
    throw Error(`Unexpected slippage value: ${slippage}`);
  }
  return [
    JSBI.divide(JSBI.multiply(value.raw, JSBI.BigInt(10000 - slippage)), JSBI.BigInt(10000)),
    JSBI.divide(JSBI.multiply(value.raw, JSBI.BigInt(10000 + slippage)), JSBI.BigInt(10000)),
  ];
}

// account is not optional
export function getSigner(library: Web3Provider, account: string): JsonRpcSigner {
  return library.getSigner(account).connectUnchecked();
}

// account is optional
export function getProviderOrSigner(library: Web3Provider, account?: string): any {
  // return account ? library?.trx.sign : library?.trx
  return account ? getSigner(library, account) : library;
}

// account is optional
export function getContract(address: string, ABI: any, library: Web3Provider, account?: string): Contract {
  if (!isAddress(address) || address === AddressZero) {
    throw Error(`Invalid 'address' parameter '${address}'.`);
  }
  return new Contract(address, ABI, getProviderOrSigner(library, account) as any);
}

// account is optional
export function getRouterContract(_: number, library: any, account?: string): Contract {
  return getContract(ROUTER_ADDRESS, IntercroneswapV1Router02ABI, library, account);
}

export function getStakingContract(_: number, address: string, library: any, account?: string): Contract {
  return getContract(address, ISwapV2StakingABI, library, account);
}

export function getEarningContract(_: number, address: string, library: any, account?: string): Contract {
  return getContract(address, ISwapEarningABI, library, account);
}

export function getArbiMintContract(_: number, address: string, library: any, account?: string): Contract {
  return getContract(address, ISwapV2ArbiABI, library, account);
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function isTokenOnList(defaultTokens: TokenAddressMap, currency?: Currency): boolean {
  if (currency === ETHER) return true;
  return Boolean(currency instanceof Token && defaultTokens[currency.chainId]?.[currency.address]);
}

export const currencyFormatter = Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
