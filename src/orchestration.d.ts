import { Timestamp } from '@agoric/time';

import { Delegation, Redelegation, UnbodingDelegation as UnbondingDelegation } from './delegation.js';

// XXX these types aren't resolving in this repo
// import type { Invitation } from '@agoric/zoe';
// import type { Amount, Brand, Payment, Purse } from '@agoric/ertp';

type Invitation = unknown;

export type KnownChains = {
  // these are all ChainInfo
  stride: null,
  cosmos: null,
  agoric: null,
  celestia: null,
};

// TODO figure out ERTP requirements
type Brand = unknown;
type Amount<T extends 'nat' = 'nat'> = { brand: Brand; value: bigint };
type Ratio = { numerator: Amount; denominator: Amount };
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
  getChain: (chainName: keyof KnownChains) => Promise<Chain>;
}

// orchestrate('LSTTia', { zcf }, async (orch, { zcf }, seat, offerArgs) => {...})
// export type OrchestrationHandlerMaker<Context> = 
export type OrchestrationHandlerMaker =
  (durableName: string,
    ctx: Context,
    fn: (Orchestrator, object, ...args) => object,
  ) => ((...args) => object);

/**
 * Info for an Ethereum-based chain.
 */
export type EthChainInfo = {
  chainId: string;
  allegedName: string;
};
/**
 * Info for a Cosmos-based chain.
 */
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
  /**
   * 
   */
  allowedMessages: TypeUrl[];
  allowedQueries: TypeUrl[];
};

export type ChainInfo = CosmosChainInfo | EthChainInfo;

// marker interface
interface QueryResult { }

/**
 * An object for access the core functions of a remote chain.
 * 
 * Note that "remote" can mean the agoric chain; it's just that 
 * accounts are treated as remote/arms length for consistency.
 */
export interface Chain {
  getChainInfo: () => Promise<ChainInfo>;

  /**
   * Make a new account on the remote chain. 
   * @param name - account name for logging and tracing purposes
   * @returns an object that controls a new remote account on Chain
   */
  makeAccount: (name?: string) => Promise<OrchestrationAccount>;
  // FUTURE supply optional port object; also fetch port object

  /**
   * query external chain state 
   */
  query: (queries: Proto3JSONMsg[]) => Promise<Iterable<QueryResult>>;

  // TODO we need a way to have multiple offers get the same orchestrator.
}

/**
 * An object that supports low-level queries and operations for an account on a remote chain.
 */
export interface ChainAccount {
  /**
   * @returns the address of the account on the remote chain
   */
  getAddress: () => ChainAddress;
  /**
   * Submit a transaction on behalf of the remote account for execution on the remote chain.
   * @param msgs - records for the transaction
   * @returns acknowledgement string
   */
  executeTx: (msgs: Proto3JSONMsg[]) => Promise<string>;
  /**
   * Submit a transaction on behalf of the remote account for execution on the remote chain.
   * @param msgs - records for the transaction
   * @returns acknowledge string
   */
  executeEncodedTx: (msgs: EncodeObject[]) => Promise<string>;
  /** deposit payment from zoe to the account*/
  deposit: (payment: Payment) => Promise<void>;
  /** get Purse for a brand to .withdraw() a Payment from the account */
  getPurse: (brand: Brand) => Promise<Purse>;
  /**
   * Close the remote account
   */
  close: () => Promise<void>;
  /* transfer account to new holder */
  prepareTransfer: () => Promise<Invitation>;
}

export type BrandOrDenom = Brand | Denom;

/**
 * An object that supports high-level operations for an account on a remote chain.
 */
export interface OrchestrationAccount {
  /** @returns the underlying low-level operation object. */
  getChainAcccount: () => Promise<ChainAccount>;
  /**
   * @returns the address of the account on the remote chain
   */
  getAddress: () => ChainAddress;
  /** @returns an array of amounts for every balance in the account. */
  getBalances: () => Promise<Amount[]>;
  /** @returns the balance of a specific denom for the account. */
  getBalance: (denom: BrandOrDenom) => Promise<Amount>;

  getDenomTrace: (
    denom: string,
  ) => Promise<{ path: string; base_denom: string }>;
  /**
   * @returns all active delegations from the account to any validator (or [] if none)
   */
  getDelegations: () => Promise<Delegation[]>;
  /**
   * @returns the active delegation from the account to a specific validator. Return an 
   * empty Delegation if there is no delegation.
   * 
   * TODO what does it return if there's no delegation?
   */
  getDelegation: (validator: ValidatorAddress) => Promise<Delegation>;
  /**
   * @returns the unbonding delegations from the account to any validator (or [] if none)
   */
  getUnbondingDelegations: () => Promise<UnbondingDelegation[]>;
  /**
   * @returns the unbonding delegations from the account to a specific validator (or [] if none)
   */
  getUnbondingDelegation: (validator: ValidatorAddress) => Promise<UnbondingDelegation>;
  getRedelegations: () => Promise<Redelegation[]>;
  getRedelegation: (
    srcValidator: ValidatorAddress,
    dstValidator?: ValidatorAddress,
  ) => Promise<Redelegation>;
  /**
   * Get the pending rewards for the account.
   * @returns the amounts of the account's rewards pending from all validators
   */
  getRewards: () => Promise<Amount[]>;
  /**
   * Get the rewards pending with a specific validator.
   * @param validator - the validator address to query for
   * @returns the amount of the account's rewards pending from a specific validator
   */
  getReward: (validator: ValidatorAddress) => Promise<Amount[]>;
  /**
   * Transfer amount to another account on the same chain. The promise settles when the transfer is complete.
   * @param toAccount - the account to send the amount to. MUST be on the same chain
   * @param amount - the amount to send
   * @returns void
   */
  send: (toAccount: ChainAddress, amount: Amount) => Promise<void>;
  /**
   * Delegate an amount to a validator. The promise settles when the delegation is complete.
   * @param validator - the validator to delegate to
   * @param amount  - the amount to delegate
   * @returns void
   */
  delegate: (validator: ValidatorAddress, amount: Amount) => Promise<void>;
  /**
   * Redelegate from one delegator to another.
   * Settles when teh redelegation is established, not 21 days later.
   * @param srcValidator - the current validator for the delegation.
   * @param dstValidator - the validator that will receive the delegation.
   * @param amount - how much to redelegate.
   * @returns
   */
  redelegate: (
    srcValidator: ValidatorAddress,
    dstValidator: ValidatorAddress,
    amount: Amount,
  ) => Promise<void>;
  /**
   * Undelegate a delegation. The promise settles when the undelegation is complete.
   * @param delegation - the delegation to undelegate
   * @returns void
   */
  undelegate: (delegation: Delegation) => Promise<void>;
  /**
   * Undelegate multiple delegations (concurrently). The promise settles when all the delegations are undelegated.
   *
   * TODO: document error behavior in case some unbondings fail
   * @param delegations
   * @returns
   */
  undelegateAll: (delegations: Delegation[]) => Promise<void>;
  /**
   * Withdraw rewards from all validators. The promise settles when the rewards are withdrawn.
   * @returns The total amounts of rewards withdrawn
   */
  withdrawRewards: () => Promise<Amount[]>;
  /**
   * Withdraw rewards from a specific validator. The promise settles when the rewards are withdrawn.
   * @param validator - the validator to withdraw rewards from
   * @returns
   */
  withdrawReward: (validator: ValidatorAddress) => Promise<Amount[]>;
  /**
   * Transfer an amount to another account, typically on another chain.
   * The promise settles when the transfer is complete.
   * @param amount - the amount to transfer.
   * @param destination - the account to transfer the amount to.
   * @param memo - an optional memo to include with the transfer, which could drive custom PFM behavior
   * @returns void
   *
   * TODO document the mapping from the address to the destination chain.
   */
  transfer: (
    amount: Amount,
    destination: ChainAddress,
    memo?: string,
  ) => Promise<void>;
  /**
   * Transfer an amount to another account in multiple steps. The promise settles when
   * the entire path of the transfer is complete.
   * @param amount - the amount to transfer
   * @param msg - the transfer message, including follow-up steps
   * @returns void
   */
  transferSteps: (amount: Amount, msg: TransferMsg) => Promise<void>;

}

// TODO simplify the TransferMsg composition

export type TransferMsg = {
  toAccount: ChainAddress;
  timeout?: Timestamp;
  next?: TransferMsg;
  data?: object;
};

/**
 * Make a TransferMsg for a swap operation.
 * @param denom - the currency to swap to
 * @param slippage - the maximum acceptable slippage
 */
export type SwapTransferFn = (
  denom: BrandOrDenom,
  slippage?: Ratio,
) => TransferMsg;
/**
 * Make a TransferMsg for a sequence of transfer steps.
 * @param steps - the transfer steps
 */
export type SequenceTransferFn = (...steps: TransferMsg[]) => TransferMsg;
/**
 * Make a TransferMsg for a simple transfer to a destination account.
 * @param dest - the destination account
 */
export type SimpleTransferFn = (dest: ChainAddress) => TransferMsg;

/**
 * Examples
 * ```
 * const osmoSwap: SwapTransferFn = ...
 * const steps: SequenceTransferFn = ...
 * const to: SimpleTransferFn = ...
 */

// TODO use "denom" or "brand" as the parameter for the currency type

// TODO make it easy to extend /stride.stakeibc.MsgLiquidStake - turadg
//     so I can do `orch.getChain('stride').makeAccount().liquidStake(amount)`