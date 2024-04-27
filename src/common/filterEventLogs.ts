import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
export class LogData {
  constructor(
    readonly index: BigInt,
    readonly address: Address,
    readonly topics: Bytes[],
    readonly data: ethereum.Tuple
  ) {}
}

export function filterLogs(
  event: ethereum.Event,
  topic: string
): ethereum.Log[] {
  const logs: ethereum.Log[] = [];
  const receipt = event.receipt;
  if (receipt == null) throw new Error("Receipt is null");

  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    if (log.topics.length == 0) continue;
    if (log.topics[0].equals(Bytes.fromHexString(topic))) {
      logs.push(log);
    }
  }
  return logs;
}

export function filterAndDecodeLogs(
  event: ethereum.Event,
  topic: string,
  dataAbi: string // abi of event.receipt.log.data (except indexed parameters)
): LogData[] {
  const logs = filterLogs(event, topic);
  const logData: LogData[] = [];
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const decoded = ethereum.decode(dataAbi, log.data);
    logData.push(
      new LogData(
        log.logIndex,
        log.address,
        log.topics,
        decoded == null ? new ethereum.Tuple(0) : decoded.toTuple()
      )
    );
  }

  return logData;
}

export function logAt(logs: ethereum.Log[], address: Address): i32 {
  for (let i = 0; i < logs.length; i++) {
    if (logs[i].address.equals(address)) {
      return i;
    }
  }
  return -1;
}

export function logFindFirst(
  logs: ethereum.Log[],
  event: ethereum.Event,
  condition: (log: ethereum.Log, event: ethereum.Event) => boolean
): ethereum.Log | null {
  for (let i = 0; i < logs.length; i++) {
    if (condition(logs[i], event)) return logs[i];
  }
  return null;
}
