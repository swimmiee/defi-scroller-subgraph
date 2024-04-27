import { BigInt } from "@graphprotocol/graph-ts";
import { hex2Uint } from "../../../common/helpers/bigintHelper";

const MaxUint256 = hex2Uint(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
);

function mulDivQ128(x: BigInt, y: string): BigInt {
  return x.times(hex2Uint(y)).rightShift(128);
}
function checkBit(tick: BigInt, bit: i32): boolean {
  return tick.bitAnd(BigInt.fromI32(bit)).notEqual(BigInt.zero());
}

export function getSqrtRatioAtTick(tick: i32): BigInt {
  const absTick = tick < 0 ? BigInt.fromI32(tick).neg() : BigInt.fromI32(tick);

  let ratio = checkBit(absTick, 0x1)
    ? hex2Uint("0xfffcb933bd6fad37aa2d162d1a594001")
    : BigInt.fromI32(1).leftShift(128);

  if (checkBit(absTick, 0x2))
    ratio = mulDivQ128(ratio, "0xfff97272373d413259a46990580e213a");
  if (checkBit(absTick, 0x4))
    ratio = mulDivQ128(ratio, "0xfff2e50f5f656932ef12357cf3c7fdcc");
  if (checkBit(absTick, 0x8))
    ratio = mulDivQ128(ratio, "0xffe5caca7e10e4e61c3624eaa0941cd0");
  if (checkBit(absTick, 0x10))
    ratio = mulDivQ128(ratio, "0xffcb9843d60f6159c9db58835c926644");
  if (checkBit(absTick, 0x20))
    ratio = mulDivQ128(ratio, "0xff973b41fa98c081472e6896dfb254c0");
  if (checkBit(absTick, 0x40))
    ratio = mulDivQ128(ratio, "0xff2ea16466c96a3843ec78b326b52861");
  if (checkBit(absTick, 0x80))
    ratio = mulDivQ128(ratio, "0xfe5dee046a99a2a811c461f1969c3053");
  if (checkBit(absTick, 0x100))
    ratio = mulDivQ128(ratio, "0xfcbe86c7900a88aedcffc83b479aa3a4");
  if (checkBit(absTick, 0x200))
    ratio = mulDivQ128(ratio, "0xf987a7253ac413176f2b074cf7815e54");
  if (checkBit(absTick, 0x400))
    ratio = mulDivQ128(ratio, "0xf3392b0822b70005940c7a398e4b70f3");
  if (checkBit(absTick, 0x800))
    ratio = mulDivQ128(ratio, "0xe7159475a2c29b7443b29c7fa6e889d9");
  if (checkBit(absTick, 0x1000))
    ratio = mulDivQ128(ratio, "0xd097f3bdfd2022b8845ad8f792aa5825");
  if (checkBit(absTick, 0x2000))
    ratio = mulDivQ128(ratio, "0xa9f746462d870fdf8a65dc1f90e061e5");
  if (checkBit(absTick, 0x4000))
    ratio = mulDivQ128(ratio, "0x70d869a156d2a1b890bb3df62baf32f7");
  if (checkBit(absTick, 0x8000))
    ratio = mulDivQ128(ratio, "0x31be135f97d08fd981231505542fcfa6");
  if (checkBit(absTick, 0x10000))
    ratio = mulDivQ128(ratio, "0x09aa508b5b7a84e1c677de54f3e99bc9");
  if (checkBit(absTick, 0x20000))
    ratio = mulDivQ128(ratio, "0x005d6af8dedb81196699c329225ee604");
  if (checkBit(absTick, 0x40000))
    ratio = mulDivQ128(ratio, "0x00002216e584f5fa1ea926041bedfe98");
  if (checkBit(absTick, 0x80000))
    ratio = mulDivQ128(ratio, "0x00000000048a170391f7dc42444e8fa2");

  if (tick > 0) ratio = MaxUint256.div(ratio);

  // this divides by 1<<32 rounding up to go from a Q128.128 to a Q128.96.
  // we then downcast because we know the result always fits within 160 bits due to our tick input constraint
  // we round up in the division so getTickAtSqrtRatio of the output price is always consistent
  //   return uint160((ratio >> 32) + (ratio % (1 << 32) == 0 ? 0 : 1));
  return ratio
    .rightShift(32)
    .plus(
      ratio.mod(BigInt.fromI32(1).leftShift(32)).equals(BigInt.zero())
        ? BigInt.zero()
        : BigInt.fromI32(1)
    );
}
