import { BigInt } from "@graphprotocol/graph-ts";

export function getAmountsForLiquidity(
  priceC: BigInt,
  priceL: BigInt,
  priceU: BigInt,
  liquidity: BigInt
): BigInt[] {
  if (priceL.gt(priceU)) throw new Error("priceL > priceU");
  if (liquidity.equals(BigInt.fromI32(0)))
    return [BigInt.fromI32(0), BigInt.fromI32(0)];

  let amount0: BigInt, amount1: BigInt;
  if (priceC.le(priceL)) {
    amount0 = getAmount0ForLiquidity(priceL, priceU, liquidity);
    amount1 = BigInt.zero();
  } else if (priceC.lt(priceU)) {
    amount0 = getAmount0ForLiquidity(priceC, priceU, liquidity);
    amount1 = getAmount1ForLiquidity(priceL, priceC, liquidity);
  } else {
    amount0 = BigInt.zero();
    amount1 = getAmount1ForLiquidity(priceL, priceU, liquidity);
  }
  return [amount0, amount1];
}

function getAmount0ForLiquidity(
  priceC: BigInt,
  priceU: BigInt,
  liquidity: BigInt
): BigInt {
  if (priceC.gt(priceU)) throw new Error("priceC > priceU");
  return liquidity
    .leftShift(96)
    .times(priceU.minus(priceC))
    .div(priceC)
    .div(priceU);
}

const getAmount1ForLiquidity = (
  priceL: BigInt,
  priceC: BigInt,
  liquidity: BigInt
): BigInt => {
  if (priceL.gt(priceC)) throw new Error("priceL > priceC");
  return liquidity.times(priceC.minus(priceL)).rightShift(96);
};
