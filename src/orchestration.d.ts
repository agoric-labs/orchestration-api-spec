import { Delegation, Redelegation, UnbodingDelegation } from './delegation.js';

// XXX these types aren't resolving in this repo
// import type { Invitation } from '@agoric/zoe';
// import type { Amount, Brand, Payment, Purse } from '@agoric/ertp';

type Invitation = unknown;

// TODO figure out ERTP requirements
type Brand = unknown;
type Amount<T extends 'nat' = 'nat'> = { brand: Brand; value: bigint };
type Payment = unknown;
type Purse = unknown;

export type TypeUrl = string;
export type Denom = string; // ibc/... or uist

export type Proto3JSONMsg = {
  '@type': TypeUrl;
  value: Record<string, unknown>;
};

export type EncodeObject = {
  typeUrl: TypeUrl;
  value: Uint8Array;
};

export type ChainAddress = {
  chainId: string; // 1 for ethereum, cosmoshub-4 for cosmos
  address: string; // can be bech32 or hex encoded
};

export type ValidatorAddress = {
  chainId: string; // 1 for ethereum, cosmoshub-4 for cosmos
  address: string; // can be bech32 or hex encoded //
};

/** @throws if not a syntactically valid address */
export declare function makeValidatorAddress(
  chainId: string,
  address: string,
): ValidatorAddress;

export interface OrchestrationGovernor {
  registerChain: (chainName: string, connection: string) => Promise<void>;
}

// chainName: managed like agoricNames. API consumers can make/provide their own
export interface Orchestrator {
  getChain: (chainName: string) => Promise<Chain>;
}

export type EthChainInfo = {
  chainId: string;
  allegedName: string;
};

export type CosmosChainInfo = {
  chainId: string;
  ibcConnectionInfo: {
    id: string; // e.g. connection-0
    client_id: string; // '07-tendermint-0'
    state: 'OPEN' | 'TRYOPEN' | 'INIT' | 'CLOSED';
    counterparty: {
      client_id: string;
      connection_id: string;
      prefix: {
        key_prefix: string;
      };
    };
    versions: { identifier: string; features: string[] }[];
    delay_period: bigint;
  };
  icaEnabled: boolean;
  icqEnabled: boolean;
  pfmEnabled: boolean;
  ibcHooksEnabled: boolean;
  allowMessages: TypeUrl[];
  allowQueries: TypeUrl[];
};

export type ChainInfo = CosmosChainInfo | EthChainInfo;

// marker interface
interface QueryResult {}

export interface Chain {
  getChainInfo: () => Promise<ChainInfo>;
  /* create a new ChainAccount Ownable */
  provideAccount: (petName?: string) => Promise<OrchestrationAccount>;
  /* query external chain state */
  query: (queries: Proto3JSONMsg[]) => Promise<Iterable<QueryResult>>;
}

export interface ChainAccount {
  getAddress: () => ChainAddress;
  executeTx: (msgs: Proto3JSONMsg[]) => Promise<void>;
  executeEncodedTx: (msgs: EncodeObject[]) => Promise<void>;
  /** deposit payment from zoe to the account*/
  deposit: (payment: Payment) => Promise<void>;
  /** get Purse for a brand to .withdraw() a Payment from the account */
  getPurse: (brand: Brand) => Promise<Purse>;
  /* close the account */
  close: () => Promise<void>;
  /* transfer account to new holder */
  prepareTransfer: () => Promise<Invitation>;
}

export type BrandOrDenom = Brand | Denom;

export interface OrchestrationAccount {
  getChainAcccount: () => Promise<ChainAccount>;
  getBalances: () => Promise<Amount[]>;
  getBalance: (denom: BrandOrDenom) => Promise<Amount | undefined>;
  getDenomTrace: (
    denom: string,
  ) => Promise<{ path: string; base_denom: string }>;
  getDelegations: () => Promise<Delegation[]>;
  getDelegation: (validator: ValidatorAddress) => Promise<Delegation[]>;
  getUnbondingDelegations: () => Promise<UnbodingDelegation[]>;
  getUnbondingDelegation: (
    validator: ValidatorAddress,
  ) => Promise<UnbodingDelegation>;
  getRedelegations: () => Promise<Redelegation[]>;
  getRedelegation: (
    srcValidator: ValidatorAddress,
    dstValidator?: ValidatorAddress,
  ) => Promise<Redelegation>;
  getRewards: () => Promise<Amount[]>;
  getReward: (validator: ValidatorAddress) => Promise<Amount[]>;
  send: (toAccount: ChainAddress, amount: Amount[]) => Promise<void>;
  delegate: (validator: ValidatorAddress, amount: Amount) => Promise<void>;
  redelegate: (
    srcValidator: ValidatorAddress,
    dstValidator: ValidatorAddress,
    amount: Amount,
  ) => Promise<void>;
  undelegate: (delegation: Delegation) => Promise<void>;
  undelegateAll: (delegations: Delegation[]) => Promise<void>;
  withdrawRewards: () => Promise<Amount[]>;
  withdrawReward: (validator: ValidatorAddress) => Promise<Amount[]>;
  transfer: (
    toAccount: ChainAddress,
    amount: Amount<'nat'>,
    memo?: string,
    timeoutTimestamp?: bigint,
  ) => Promise<void>;
}

export type TransferMsg = {
  toAccount: ChainAddress;
  amount: Amount<'nat'>;
  memo?: string;
  timeoutTimestamp?: bigint;
};

/** osmosis swap */
type AfterAction = { destChain: string; destAddress: ChainAddress };
type SwapExact = { amountIn: Amount; amountOut: Amount };
type SwapMaxSlippage = { amountIn: Amount; brandOut: Brand; slippage: number };
// SwapExact or SwapMaxSlippage, with optional AfterAction
export type OsmosisSwapArgs = (SwapExact | SwapMaxSlippage) &
  (AfterAction | Record<string, never>);

/** library that can be imported in a contract, not a vat or contract */
export type OrcUtils = {
  /* unwinds denom with PFM, if necessary */
  makeTransferMsg: (args: Omit<TransferMsg, 'memo'>) => TransferMsg;
  makeOsmosisSwap: (args: OsmosisSwapArgs) => TransferMsg;
};
