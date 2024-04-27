import { UNISWAP_V3_PROTOCOL } from ".";
import { PoolCreated } from "../../../generated/UniswapV3/UniswapV3Factory";
import { Investment } from "../../../generated/schema";
import { getInvestmentId } from "../../common/helpers/investmentHelper";
import { UniswapV3Pool as UniswapV3PoolContract } from "../../../generated/UniswapV3/UniswapV3Pool";
import { UniswapV3Helper } from "./helper";

export function handlePoolCreated(event: PoolCreated): void {
  const helper = new UniswapV3Helper(event.params.pool);
  const protocol = helper.getProtocol(event.block);

  const investmentId = getInvestmentId(UNISWAP_V3_PROTOCOL, event.params.pool);
  const i = new Investment(investmentId);

  i.protocol = protocol.id;
  i.address = event.params.pool;
  i.inputTokens = [event.params.token0, event.params.token1];
  i.rewardTokens = [event.params.token0, event.params.token1];

  const pool = UniswapV3PoolContract.bind(event.params.pool);
  i.meta = [pool.fee().toString()];
  i.blockNumber = event.block.number;
  i.blockTimestamp = event.block.timestamp;

  i.save();
}
