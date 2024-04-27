import {
  Address,
  BigInt,
  Bytes,
  DataSourceContext,
  dataSource,
  ethereum,
} from "@graphprotocol/graph-ts";
import {
  InvestmentHelper,
  InvestmentInfo,
} from "../../common/helpers/investmentHelper";
import { SyncSwapPool } from "../../../generated/templates/SyncSwapPool/SyncSwapPool";
import { SyncSwapPool as SyncSwapPoolTemplate } from "../../../generated/templates";
import { Investment } from "../../../generated/schema";

export const SYNCSWAP_PROTOCOL = "SyncSwap";

export class SyncSwapHelper extends InvestmentHelper {
  constructor(investmentAddress: Address) {
    super(SYNCSWAP_PROTOCOL, investmentAddress);
  }
  getProtocolMeta(): string[] {
    return [];
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
      investment.meta = info.meta;
      investment.blockNumber = block.number;
      investment.blockTimestamp = block.timestamp;
      investment.save();

      // Create Template
      const context = new DataSourceContext();
      context.setString("router", dataSource.context().getString("router"));
      context.setI32(
        "snapshotBatch",
        dataSource.context().getI32("snapshotBatch")
      );
      SyncSwapPoolTemplate.createWithContext(this.investmentAddress, context);
    }

    return investment;
  }

  getInfo(investmentAddress: Address): InvestmentInfo {
    const pool = SyncSwapPool.bind(investmentAddress);
    const reserves = pool.getReserves();
    return new InvestmentInfo(
      [pool.token0(), pool.token1()],
      [],
      [
        "1", // batch iterator
        reserves.get_reserve0().toString(),
        reserves.get_reserve1().toString(),
        pool.totalSupply().toString(),
      ]
    );
  }

  getLiquidityInfo(block: ethereum.Block): LiquidityInfo {
    const investment = this.getOrCreateInvestment(block);
    const reserve0 = BigInt.fromString(investment.meta[1]);
    const reserve1 = BigInt.fromString(investment.meta[2]);
    const totalSupply = BigInt.fromString(investment.meta[3]);

    return new LiquidityInfo(investment, reserve0, reserve1, totalSupply);
  }
}

class LiquidityInfo {
  constructor(
    readonly investment: Investment,
    readonly reserve0: BigInt,
    readonly reserve1: BigInt,
    readonly totalSupply: BigInt
  ) {}

  saveTotalSupply(ts: BigInt): void {
    this.investment.meta[3] = ts.toString();
    this.investment.save();
  }
}
