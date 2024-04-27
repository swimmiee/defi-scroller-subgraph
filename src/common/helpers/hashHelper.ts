import { Address, Bytes } from "@graphprotocol/graph-ts";

export function hash2Address(hash: Bytes): Address {
  return Address.fromBytes(
    Bytes.fromHexString("0x" + hash.toHexString().slice(-40))
  );
}
