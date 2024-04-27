import { BigInt, dataSource, ethereum } from "@graphprotocol/graph-ts";
import { PoolCreated } from "../../../generated/SyncSwapStable/SyncSwapFactory";
import { getProtocolId } from "../../common/helpers/investmentHelper";
import { Protocol } from "../../../generated/schema";
import { SYNCSWAP_PROTOCOL, SyncSwapHelper } from "./helper";

export function handlePoolCreated(event: PoolCreated): void {
  new SyncSwapHelper(event.params.pool).getOrCreateInvestment(event.block);
}

export function handleOnce(block: ethereum.Block): void {
  const protocolId = getProtocolId(SYNCSWAP_PROTOCOL);
  const protocol = new Protocol(protocolId);
  protocol.name = SYNCSWAP_PROTOCOL;
  protocol.chain = dataSource.network();
  protocol.meta = [];
  protocol.blockNumber = block.number;
  protocol._batchIterator = BigInt.fromI32(1);
  protocol.save();
}
