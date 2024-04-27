import { Address, Bytes, dataSource } from "@graphprotocol/graph-ts";

export function getContextAddress(key: string): Address {
  return Address.fromBytes(
    Bytes.fromHexString(dataSource.context().getString(key))
  );
}
