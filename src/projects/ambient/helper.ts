import { AmbientQuery } from "./../../../generated/Ambient/AmbientQuery";
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  InvestmentHelper,
  InvestmentInfo,
} from "../../common/helpers/investmentHelper";
import { getContextAddress } from "../../common/helpers/contextHelper";
import { Investment } from "../../../generated/schema";
import {
  AmbientDetails,
  AmbientPrincipal,
  AmbientReward,
  AmbientSnapshot,
} from "./type";

export const AMBIENT_FINANCE = "ambient";

export class AmbientHelper extends InvestmentHelper {
  constructor(investmentAddress: Address, readonly details: AmbientDetails) {
    super(AMBIENT_FINANCE, investmentAddress, details.toTag());
    this.id = AmbientHelper.getAmbientInvestmentId(details.getPoolHash(), investmentAddress);
  }
  static readonly AMBIENT_POSITION: string = "0_0";
  // tag: {token0}_{token1}_{poolIdx}
  static getHelperFromInvestmentTag(
    tag: string,
    investmentAddress: Address
  ): AmbientHelper {
    const tagSplit = tag.split("_");
    const token0 = Address.fromString(tagSplit[0]);
    const token1 = Address.fromString(tagSplit[1]);
    const poolIdx = tagSplit[2];
    return new AmbientHelper(
      investmentAddress,
      new AmbientDetails(token0, token1, poolIdx)
    );
  }
  static getAmbientInvestmentId(
    poolHash: Bytes,
    investmentAddress: Address
  ): Bytes {
    return Bytes.fromUTF8(AMBIENT_FINANCE)
      .concat(investmentAddress)
      .concat(poolHash);
  }
  getProtocolMeta(): string[] {
    return [];
  }
  getInfo(_investmentAddress: Address): InvestmentInfo {
    const token0 = this.details.token0;
    const token1 = this.details.token1;
    return new InvestmentInfo(
      [token0, token1],
      [token0, token1],
      [this.details.poolIdx, this.details.getPoolHash().toHexString()]
    );
  }

  getOrCreateInvestment(block: ethereum.Block): Investment {
    let investment = Investment.load(this.id);
    if (!investment) {
      const protocol = this.getProtocol(block);
      const info = this.getInfo(this.investmentAddress);
      investment = new Investment(this.id);
      investment.protocol = protocol.id;
      investment.address = this.investmentAddress;
      investment.inputTokens = info.inputTokens.map<Bytes>((addr) =>
        Bytes.fromHexString(addr.toHexString())
      );
      investment.rewardTokens = info.rewardTokens.map<Bytes>((addr) =>
        Bytes.fromHexString(addr.toHexString())
      );
      investment.tag = this.tag;
      investment.meta = info.meta;
      investment.blockNumber = block.number;
      investment.blockTimestamp = block.timestamp;
      investment.save();
    }

    return investment as Investment;
  }
  getPrincipalInfo(owner: Address, tag: string): AmbientPrincipal {
    const query = AmbientQuery.bind(getContextAddress("ambientQuery"));
    const ticks = this.tagToTicks(tag);
    if (tag === AmbientHelper.AMBIENT_POSITION) {
      const principals = query.queryAmbientTokens(
        owner,
        this.details.token0,
        this.details.token1,
        BigInt.fromString(this.details.poolIdx)
      );
      return new AmbientPrincipal(
        principals.getBaseQty(),
        principals.getQuoteQty(),
        principals.getLiq()
      ); //amount0,amount1,liquidity,
    } else {
      const principals = query.queryRangeTokens(
        owner,
        this.details.token0,
        this.details.token1,
        BigInt.fromString(this.details.poolIdx),
        ticks[0],
        ticks[1]
      );
      return new AmbientPrincipal(
        principals.getBaseQty(),
        principals.getQuoteQty(),
        principals.getLiq()
      ); //amount0,amount1,liquidity,
    }
  }
  getRewardInfo(owner: Address, tag: string): AmbientReward {
    const query = AmbientQuery.bind(getContextAddress("ambientQuery"));

    if (tag === AmbientHelper.AMBIENT_POSITION) {
      return new AmbientReward(BigInt.zero(), BigInt.zero()); //amount0,amount1
    } else {
      const ticks = this.tagToTicks(tag);
      const rewards = query.queryConcRewards(
        owner,
        this.details.token0,
        this.details.token1,
        BigInt.fromString(this.details.poolIdx),
        ticks[0],
        ticks[1]
      );
      return new AmbientReward(
        rewards.getBaseRewards(),
        rewards.getQuoteRewards()
      ); //amount0,amount1
    }
  }

  getPositionFromSnapshot(block: ethereum.Block, tag: string): AmbientSnapshot {
    const investment = this.getOrCreateInvestment(block);
    const positions = investment.positions.load();
    for (let i = 0; i < positions.length; i++) {
      if (positions[i].tag == tag) {
        return new AmbientSnapshot(
          new AmbientPrincipal(
            positions[i].amounts[0],
            positions[i].amounts[1],
            positions[i].liquidity
          ),
          new AmbientReward(positions[i].amounts[2], positions[i].amounts[3])
        );
      }
    }
    return new AmbientSnapshot(
      new AmbientPrincipal(
        BigInt.fromI32(0),
        BigInt.fromI32(0),
        BigInt.fromI32(0)
      ),
      new AmbientReward(BigInt.fromI32(0), BigInt.fromI32(0))
    );
  }
  tickToPositionTag(tickLower: i32, tickUpper: i32): string {
    return tickLower.toString() + "_" + tickUpper.toString();
  }
  tagToTicks(tag: string): i32[] {
    return tag.split("_").map<i32>((x) => BigInt.fromString(x).toI32());
  }
}
