import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { upsertPosition } from "./upsertPosition";
import { Position, PositionSnapshot } from "../../generated/schema";
import { PositionParams } from "./helpers/positionHelper";
import { InvestmentHelper } from "./helpers/investmentHelper";
/**
 * @dev snapshot position every block 
 * @param block : block info
 * @param helper : investment helper for using util functions on investment
 * @param p : position params
 * @returns position entity (entity at ../schema.graphql)
 */
export function savePositionSnapshot(
  block: ethereum.Block,
  helper: InvestmentHelper,
  p: PositionParams
): Position {
  const position = upsertPosition(block, helper, p);

  const snapshotId = position.id.concat(
    Bytes.fromHexString("0x"+block.number.toHexString().slice(2).padStart(16, "0"))
  );

  // if (PositionSnapshot.loadInBlock(snapshotId)) return position;

  const snapshot = new PositionSnapshot(snapshotId);

  snapshot.position = position.id;
  snapshot.amounts = p.inputAmounts.concat(p.rewardAmounts);

  
  snapshot.blockNumber = block.number;
  snapshot.blockTimestamp = block.timestamp;
  snapshot.save();

  return position;
}
