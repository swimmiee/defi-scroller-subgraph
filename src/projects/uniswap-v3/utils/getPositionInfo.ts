import { Address, ethereum } from "@graphprotocol/graph-ts";
import { LogData, filterAndDecodeLogs } from "../../../common/filterEventLogs";
import { bytes2Int } from "../../../common/helpers/bigintHelper";

export class PositionInfo {
  constructor(readonly tl: i32, readonly tu: i32, readonly pool: Address) {}
}

export function getLog<E extends ethereum.Event>(
  event: E,
  topic: string,
  dataAbi: string,
  isTargetLog: (log: LogData, event: E) => boolean
): LogData | null {
  const logs = filterAndDecodeLogs(event, topic, dataAbi);
  let targetLogIdx = 0;
  for (; targetLogIdx < logs.length; targetLogIdx++) {
    if (isTargetLog(logs[targetLogIdx], event)) break;
  }

  return targetLogIdx == logs.length ? null : logs[targetLogIdx];
}

export function getPositionInfo(log: LogData): PositionInfo {
  const tickLower = bytes2Int(log.topics[2]).toI32();
  const tickUpper = bytes2Int(log.topics[3]).toI32();
  const pool = log.address;

  return new PositionInfo(tickLower, tickUpper, pool);
}
