import { dataSource, BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import { UniswapV3PositionManager } from "../../../generated/UniswapV3/UniswapV3PositionManager";
import {
  InvestmentHelper,
  InvestmentInfo,
} from "../../common/helpers/investmentHelper";
import { UniswapV3Pool } from "../../../generated/UniswapV3/UniswapV3Pool";
import { Position } from "../../../generated/schema";
import { getContextAddress } from "../../common/helpers/contextHelper";

export const UNISWAP_V3_PROTOCOL = "UniswapV3";

export class UniswapV3Helper extends InvestmentHelper {
  static getUniV3PosId(tokenId: BigInt): Bytes {
    return Bytes.fromUTF8(UNISWAP_V3_PROTOCOL)
      .concat(
        Bytes.fromHexString(dataSource.context().getString("positionManager"))
      )
      .concat(Bytes.fromI32(tokenId.toI32()));
  }

  static findNft(tokenId: BigInt): Position | null {
    const positionId = UniswapV3Helper.getUniV3PosId(tokenId);
    return Position.load(positionId);
  }

  constructor(readonly investmentAddress: Address) {
    super(UNISWAP_V3_PROTOCOL, investmentAddress, "");
  }
  getProtocolMeta(): string[] {
    const totalSupply = UniswapV3PositionManager.bind(
      getContextAddress("positionManager")
    ).totalSupply();

    return [totalSupply.toString()];
  }

  // the way how to get the position id is different from other protocols
  getPositionId(_owner: Address, tag: string): Bytes {
    return UniswapV3Helper.getUniV3PosId(BigInt.fromString(tag));
  }

  findNftPosition(tokenId: BigInt): Position | null {
    // since `getPositionId` don't use owner
    // pass just Address.zero() as owner
    return this.findPosition(Address.zero(), tokenId.toString()); // id: {ZeroAddress}{tokenId}
  }

  getInfo(investmentAddress: Address): InvestmentInfo {
    const pool = UniswapV3Pool.bind(investmentAddress);
    const token0 = pool.token0();
    const token1 = pool.token1();

    return new InvestmentInfo(
      [token0, token1],
      [token0, token1],
      [pool.fee().toString()]
    );
  }
}
