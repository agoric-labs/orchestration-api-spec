// @ts-check
/* global harden */
import { Fail } from '@agoric/assert';
import { AmountMath, AmountShape } from '@agoric/ertp';
import { E, Far } from '@endo/far';
import { M } from '@endo/patterns';
import { orcUtils } from './utils';

/**
 * @param {ZCF} zcf
 * @param {{ orchestrator: import('@endo/far').ERef<import('./index').Orchestrator>}} privateArgs
 */
export const start = async (zcf, privateArgs) => {
  const { orchestrator } = privateArgs;

  const [celestia, agoric] = await Promise.all([
    E(orchestrator).getChain('celestia'),
    E(orchestrator).getChain('agoric'),
  ]);

  /** @type {import('@agoric/zoe').OfferHandler} */
  const swapAndStakeHandler = async (seat, offerArgs) => {
    const { give } = seat.getProposal();
    !AmountMath.isEmpty(give.USDC.value) || Fail`Must provide USDC.`;

    /** @typedef {import('./index').ChainAccount[]} */
    const [celestiaAccount, localAccount] = await Promise.all([
      E(celestia).provideAccount('main'),
      E(agoric).provideAccount('main'),
    ]);

    const tiaAddress = await celestiaAccount.getAddress();

    // deposit funds from user seat to LocalChainAccount
    const localAccountSeat = zcf.makeEmptySeatKit().zcfSeat;
    zcf.atomicRearrange(zcf, harden([[seat, localAccountSeat, give]]));
    // seat.exit() // exit user seat now, or later?
    const payment = await E(localAccountSeat).getPayout('USDC');
    await localAccount.deposit(payment);

    // build swap instructions with orcUtils library
    const transferMsg = orcUtils.makeOsmosisSwap({
      destChain: 'celestia',
      destAddress: tiaAddress,
      amountIn: give.USDC,
      brandOut: offerArgs.staked.brand,
      slippage: 0.03,
    });

    await E(localAccount)
      .transfer(transferMsg)
      .then((_txResult) =>
        E(celestiaAccount).delegate(offerArgs.validator, offerArgs.staked),
      )
      .catch((e) => console.error(e));

    // XXX close localAccount?
    return celestiaAccount; // should be continuing inv since this is an offer?
  };

  const makeSwapAndStakeInvitation = () =>
    zcf.makeInvitation(
      swapAndStakeHandler,
      'Swap for TIA and stake',
      undefined,
      harden({
        give: { USDC: AmountShape },
        want: {}, // XXX ChainAccount Ownable?
        exit: M.any(),
      }),
    );

  const publicFacet = Far('SwapAndStake Public Facet', {
    makeSwapAndStakeInvitation,
  });

  return harden({ publicFacet });
};
