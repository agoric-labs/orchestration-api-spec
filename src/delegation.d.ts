import type { Coin } from '@cosmjs/amino';
import type { TimestampRecord } from '@agoric/time';
import type { ChainAddress } from './orchestration.js';

export type Delegation = {
  delegation: {
    delegator_address: ChainAddress;
    validator_address: ChainAddress;
    shares: number;
  };
  balance: Coin;
};

export type UnbodingDelegation = {
  delegator_address: ChainAddress;
  validator_address: ChainAddress;
  entries: {
    creation_height: bigint;
    completion_time: TimestampRecord;
    initial_balance: string;
    balance: string;
  }[];
};

export type RedelegationEntry = {
  redelegation_entry: {
    creation_height: bigint;
    completion_time: TimestampRecord;
    initial_balance: string;
    shares_dst: string;
  };
  balance: Coin;
};

export type Redelegation = {
  delegator_address: ChainAddress;
  validator_src_address: ChainAddress;
  validator_dst_address: ChainAddress;
  entries: RedelegationEntry[];
};
