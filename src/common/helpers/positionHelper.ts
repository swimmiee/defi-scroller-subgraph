import { Address, BigInt } from "@graphprotocol/graph-ts";
import { PositionType } from "../PositionType.enum";
export class PositionParams {
  constructor(
    readonly owner: Address,
    readonly tag: string,
    readonly type: PositionType,
    readonly inputAmounts: BigInt[],
    readonly rewardAmounts: BigInt[],
    readonly liquidity: BigInt,
    readonly meta: string[]
  ) {}
}
