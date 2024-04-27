import { Address, Bytes } from "@graphprotocol/graph-ts";

export function getHolderId(investmentId: Bytes, owner: Address): Bytes {
  return investmentId.concat(owner);
}
