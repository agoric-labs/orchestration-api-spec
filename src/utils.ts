import type { Amount, Brand } from '@agoric/ertp/exported.js';
import type { TransferMsg, ChainAddress } from './orchestration';

type AfterAction = { destChain: string; destAddress: ChainAddress };
type SwapExact = { amountIn: Amount; amountOut: Amount };
type SwapMaxSlippage = { amountIn: Amount; brandOut: Brand; slippage: number };
export type OsmosisSwapArgs = (SwapExact | SwapMaxSlippage) &
  (AfterAction | Record<string, never>);

export const orcUtils = {
  /**
   * unwinds denom with PFM, if necessary
   */
  makeTransferMsg: (_args: Omit<TransferMsg, 'memo'>) => {
    // XXX mocked, so typescript is happy
    return {
      toAccount: { chainId: 'osmosis-test', address: 'osmo1234' },
    } as TransferMsg;
  },
  /**
   * SwapExact or SwapMaxSlippage, with optional AfterAction
   */
  makeOsmosisSwap(_args: OsmosisSwapArgs) {
    // XXX mocked, so typescript is happy
    return {
      toAccount: { chainId: 'osmosis-test', address: 'osmo1234' },
    } as TransferMsg;
  },
};
