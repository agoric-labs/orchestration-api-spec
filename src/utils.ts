import '@agoric/zoe/exported.js';
import type { ChainAddress } from './orchestration';

// TODO figure out ERTP requirements
type Brand = unknown;
type Amount<T extends 'nat' = 'nat'> = { brand: Brand; value: bigint };

type AfterAction = { destChain: string; destAddress: ChainAddress };
type SwapExact = { amountIn: Amount; amountOut: Amount };
type SwapMaxSlippage = { amountIn: Amount; brandOut: Brand; slippage: number };
export type OsmosisSwapArgs = (SwapExact | SwapMaxSlippage) &
  (AfterAction | Record<string, never>);

export const orcUtils = {
  /**
   * unwinds denom with PFM, if necessary
   *
   * @param {Omit<import('./index').TransferMsg, 'memo'>} _args
   * @returns {import('./index').TransferMsg}
   */
  makeTransferMsg: (_args) => {
    // XXX unwind denoms
    return {};
  },
  /**
   * SwapExact or SwapMaxSlippage, with optional AfterAction
   * @param {import('./index').OsmosisSwapArgs} _args
   * @returns {import('./index').TransferMsg}
   */
  makeOsmosisSwap(_args) {
    // XXX unwind denoms
    // XXX swap msg
    return {};
  },
};
