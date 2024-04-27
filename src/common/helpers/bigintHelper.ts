import { BigInt, Bytes, ByteArray } from "@graphprotocol/graph-ts";

export const hex2Uint = (str: string): BigInt => {
  return BigInt.fromUnsignedBytes(
    ByteArray.fromHexString(str).reverse() as ByteArray
  );
};

export const hex2Int = (str: string): BigInt => {
  return BigInt.fromSignedBytes(
    ByteArray.fromHexString(str).reverse() as Bytes
  );
};

export const bytes2Int = (b: Bytes): BigInt => {
  return hex2Int(b.toHexString());
};


export function mulDiv(a: BigInt, b: BigInt, denominator: BigInt): BigInt {
  // Check if the denominator is zero
  if (denominator.isZero()) {
    throw new Error('Denominator cannot be zero.');
  }

  // Multiplication of a and b. Since both are BigInt, the result is also a BigInt, ensuring full precision.
  let product: BigInt = a.times(b);

  // Division of the product by the denominator, maintaining full precision.
  let result: BigInt = product.div(denominator);

  return result;
}