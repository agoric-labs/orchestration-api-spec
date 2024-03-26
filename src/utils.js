/** @type {import('./index').OrcUtils} */
export const orcUtils = {
  /**
   * @param {Omit<import('./index').TransferMsg, 'memo'>} _args
   * @returns {import('./index').TransferMsg}
   */
  makeTransferMsg: (_args) => {
    // XXX unwind denoms
    return {};
  },
  /**
   * @param {import('./index').OsmosisSwapArgs} _args
   * @returns {import('./index').TransferMsg}
   */
  makeOsmosisSwap(_args) {
    // XXX unwind denoms
    // XXX swap msg
    return {};
  },
};
