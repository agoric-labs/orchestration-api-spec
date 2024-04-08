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
  allowMessages: TypeUrl[];
  allowQueries: TypeUrl[];
};

export type ChainInfo = CosmosChainInfo | EthChainInfo;

// marker interface
interface QueryResult { }

/**
 * An object for access the core functions of a remote chain.
 */
export interface Chain {
  getChainInfo: () => Promise<ChainInfo>;
  /**
   * Provide (get or make) an account on the chain. The account is a 
   * named account associated with the current orchestrator instance 
   * (typically associated with a specific seat). If an account for this `Chain`
   * with the provided `petName` already exists, it is returned, 
   * otherwise a new account is created on the remote Chain.
   * @param petName 
   * @returns the account that controls the 
   */
  provideAccount: (petName?: string) => Promise<OrchestrationAccount>;
  /* query external chain state */
  query: (queries: Proto3JSONMsg[]) => Promise<Iterable<QueryResult>>;

  // TODO we need a way to have multiple offers get the same orchestrator.
}

/**
 * An object that supports low-level queries and operations for an account on a remote chain.
 */
export interface ChainAccount {
  /**
   * @returns the address of the account on the chain
   */
  getAddress: () => ChainAddress;
  /**
   * Submit a transaction on behalf of the remote accoutn for execution on teh remote chain.
   * @param msgs - records for the transaction
   * @returns void
   */
  executeTx: (msgs: Proto3JSONMsg[]) => Promise<void>;
  /**
  * Submit a transaction on behalf of the remote accoutn for execution on teh remote chain.
  * @param msgs - records for the transaction
  * @returns void
  */
  executeEncodedTx: (msgs: EncodeObject[]) => Promise<void>;
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
  /** @returns an array of amounts for every balance in the account. */
  getBalances: () => Promise<Amount[]>;
  /** @returns the balance of a specific denom for the account. */
  getBalance: (denom: BrandOrDenom) => Promise<Amount | undefined>;

  getDenomTrace: (
    denom: string,
  ) => Promise<{ path: string; base_denom: string }>;
  /** 
   * @returns all active delegations from the account to any validator (or [] if none) 
   */
  getDelegations: () => Promise<Delegation[]>;
  /** 
   * @returns the active delegations from the account to a specific validator (or [] if none) 
   */
  getDelegation: (validator: ValidatorAddress) => Promise<Delegation[]>;
  /** 
   * @returns the unbonding delegations from the account to any validator (or [] if none) 
   */
  getUnbondingDelegations: () => Promise<UnbodingDelegation[]>;
  /** 
   * @returns the unbonding delegations from the account to a specific validator (or [] if none) 
   */
  getUnbondingDelegation: (validator: ValidatorAddress) => Promise<UnbodingDelegation>;
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
   * TODO: what if some of the delegations are not possible?
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
  transfer: (amount: Amount, destination: ChainAddress, memo?: string) => Promise<void>;
  /**
   * Transfer an amount to another account in multiple steps. The promise settles when 
   * the entire path of the transfer is complete.
   * @param amount - the amount to transfer
   * @param msg - the transfer message, including follow-up steps
   * @returns void
   */
  transferSteps: (amount: Amount, msg: TransferMsg) => Promise<void>;
}

export type TransferMsg = {
  toAccount: ChainAddress;
  timeout?: Timestamp;
  next?: TransferMsg;
};

// TODO how dp the additinoal argumens get encoded into the PFM message?

/**
 * Make a TransferMsg for a swap operation. 
 * @param denom - the currency to swap to
 * @param slippage - the maximum acceptable slippage
 */
export type SwapTransferFn = (denom: BrandOrDenom, slippage?: Ratio) => TransferMsg;
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