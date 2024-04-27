import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { PositionChange } from "../../generated/schema";
import { PositionChangeAction, getAction } from "./PositionChangeAction.enum";
import { savePositionSnapshot } from "./savePositionSnapshot";
import { PositionParams } from "./helpers/positionHelper";
import { InvestmentHelper } from "./helpers/investmentHelper";
/**
 * snapshot position every event for saving position change, snapshot position before record position change
 * @param event : event info
 * @param action : position change action
 * @param helper : investment helper for using util functions on investment
 * @param p : position params
 * @param dInputs : delta input amounts
 * @param dRewards : delta reward amounts (fees, rewards(etc. STG, CAKE))
 */
export function savePositionChange(
  event: ethereum.Event,
  action: PositionChangeAction,
  helper: InvestmentHelper,
  p: PositionParams,
  dInputs: BigInt[],
  dRewards: BigInt[]
): void {
  const position = savePositionSnapshot(event.block, helper, p);

  const pc = new PositionChange(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );

  pc.position = position.id;
  pc.blockNumber = event.block.number;
  pc.blockTimestamp = event.block.timestamp;
  pc.transactionHash = event.transaction.hash;
  pc.action = getAction(action);
  pc.dAmounts = dInputs.concat(dRewards);
  pc.afterAmounts = p.inputAmounts.concat(p.rewardAmounts);

  pc.save();
}
