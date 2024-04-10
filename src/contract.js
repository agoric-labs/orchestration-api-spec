// @ts-check
/* global harden */
import { Fail } from '@agoric/assert';
import { AmountMath, AmountShape } from '@agoric/ertp';
import { E, Far } from '@endo/far';
import { M } from '@endo/patterns';
import { orcUtils } from './utils';

/**
 * @param {ZCF} zcf
 * @param {{ orchestrator: import('./index').Orchestrator}} privateArgs
 */
export const start = async (zcf, privateArgs) => {
  const { orchestrator } = privateArgs;

  const [celestia, agoric] = await Promise.all([
    orchestrator.getChain('celestia'),
    orchestrator.getChain('agoric'),
  ]);

  /** @typedef {} HandlerMaker */

  /** @type {(any) => { HandlerMaker: import('./orchestration').OrchestrationHandlerMaker}} */
  const makeOrchestrator = (_ignore) => undefined;

  // is it an options bag
  // optional name mapping

  const orchestrate = makeOrchestrator({ zone, timerService, zcf, vstorage, vatOrchestration });

  // const swapAndStakeHandler = asyncFlow(zone, 'SwapTia', { zcf, orchestrator, celestia, agoric },
  //         async ({ zcf, celestia, agoric }, seat, offerArgs) => {

  // orchestrate - creates and instance that closes over the supplied seat.

  /** @type {import('@agoric/zoe').OfferHandler} */
  const unbondAndLiquidStake = orchestrate('LSTTia', { zcf },
    async (/** @type {import('./orchestration').Orchestrator} */ orch, { zcf }, seat, offerArgs) => {
      const { give } = seat.getProposal();
      !AmountMath.isEmpty(give.USDC.value) || Fail`Must provide USDC.`;

      // We would actually alreaady have the account from the orchestrator
      const celestia = await orch.getChain('celestia');
      const celestiaAccount = await celestia.makeAccount('main');

      const delegations = await celestiaAccount.getDelegations();
      await celestiaAccount.undelegateAll(delegations);

      const stride = await orch.getChain('stride');
      const strideAccount = await stride.makeAccount('LST');

      const tiaAmt = await celestiaAccount.getBalance('TIA');
      await celestiaAccount.transfer(tiaAmt, strideAccount.getAddress());

      await strideAccount.liquidStake(tiaAmt);

    },

  /** @type {import('@agoric/zoe').OfferHandler} */
  const swapAndStakeHandler = async (seat, offerArgs) => {
    const { give } = seat.getProposal();
    !AmountMath.isEmpty(give.USDC.value) || Fail`Must provide USDC.`;

    /** @typedef {import('./index').ChainAccount[]} */
    const [celestiaAccount, localAccount] = await Promise.all([
      celestia.makeAccount('main'),
      agoric.makeAccount('main'),
    ]);

    const tiaAddress = await celestiaAccount.getAddress();

    // deposit funds from user seat to LocalChainAccount
    const localAccountSeat = zcf.makeEmptySeatKit().zcfSeat;
    zcf.atomicRearrange(zcf, harden([[seat, localAccountSeat, give]]));
    // seat.exit() // exit user seat now, or later?
    const payment = await localAccountSeat.getPayout('USDC');
    await localAccount.deposit(payment);

    // build swap instructions with orcUtils library
    const transferMsg = orcUtils.makeOsmosisSwap({
      destChain: 'celestia',
      destAddress: tiaAddress,
      amountIn: give.USDC,
      brandOut: offerArgs.staked.brand,
      slippage: 0.03,
    });

    await localAccount
      .transfer(transferMsg)
      .then((_txResult) =>
        celestiaAccount.delegate(offerArgs.validator, offerArgs.staked),
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
