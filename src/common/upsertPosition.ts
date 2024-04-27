import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { Holder, Position } from "../../generated/schema";
import { getHolderId } from "./helpers/holderHelper";
import { getPosType } from "./PositionType.enum";
import { PositionParams } from "./helpers/positionHelper";
import { InvestmentHelper } from "./helpers/investmentHelper";

export function upsertPosition(
  block: ethereum.Block,
  helper: InvestmentHelper,
  p: PositionParams
): Position {
  const investment = helper.getOrCreateInvestment(block);
  const positionId = helper.getPositionId(p.owner, p.tag);

  let position = Position.load(positionId);

  if (!position) {
    position = new Position(positionId);
    position.investment = investment.id;
    position.owner = p.owner;
    position.tag = p.tag;
    position.type = getPosType(p.type);
    position.initAmounts = p.inputAmounts.concat(p.rewardAmounts);
  }

  position.amounts = p.inputAmounts.concat(p.rewardAmounts);
  position.liquidity = p.liquidity;
  position.meta = p.meta;

  let closed = true;
  for (let i = 0; i < position.amounts.length; i++) {
    if (position.amounts[i].gt(BigInt.zero())) {
      closed = false;
      break;
    }
  }
  position.closed = closed;
  position.save();

  const holderId = getHolderId(investment.id, p.owner);
  let holder = Holder.load(holderId);
  if (!holder) {
    holder = new Holder(holderId);
    holder.investment = investment.id;
    holder.address = p.owner;
    holder.createdAt = block.timestamp;
    holder.createdAtBlock = block.number;
  }

  holder.save();

  return position;
}
