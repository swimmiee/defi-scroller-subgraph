import { BigInt } from "@graphprotocol/graph-ts";
import { getAmountsForLiquidity } from "./liquidityAmount";
import { UniswapV3PositionManager__positionsResult } from "../../../../generated/UniswapV3/UniswapV3PositionManager";
import { getSqrtRatioAtTick } from "./tickMath";
import { UniswapV3Pool } from "../../../../generated/UniswapV3/UniswapV3Pool";

export function principalOf(
  tickLower: i32,
  tickUpper: i32,
  liquidity: BigInt,
  sqrtPriceX96: BigInt
): BigInt[] {
  return getAmountsForLiquidity(
    sqrtPriceX96,
    getSqrtRatioAtTick(tickLower),
    getSqrtRatioAtTick(tickUpper),
    liquidity
  );
}

const MAX_UINT256 = BigInt.fromI32(1)
  .leftShift(u8(255))
  .minus(BigInt.fromI32(1))
  .times(BigInt.fromI32(2))
  .plus(BigInt.fromI32(1));

export function feesOf(
  position: UniswapV3PositionManager__positionsResult,
  poolContract: UniswapV3Pool,
  currentTick: i32
): BigInt[] {
  const liq = position.getLiquidity();
  const poolFeeInsides = getFeeGrowthInside(
    poolContract,
    currentTick,
    position.getTickLower(),
    position.getTickUpper()
    // feeGrowthInside0LastX128,
    // feeGrowthInside1LastX128
  );

  let sub0 = poolFeeInsides[0].minus(position.getFeeGrowthInside0LastX128());
  if (sub0.lt(BigInt.fromI32(0))) sub0 = sub0.plus(MAX_UINT256);

  const fee0 = position.getTokensOwed0().plus(sub0.times(liq).rightShift(128));

  let sub1 = poolFeeInsides[1].minus(position.getFeeGrowthInside1LastX128());
  if (sub1.lt(BigInt.fromI32(0))) sub1 = sub1.plus(MAX_UINT256);
  const fee1 = position.getTokensOwed1().plus(sub1.times(liq).rightShift(128));

  return [fee0, fee1];
}

function getFeeGrowthInside(
  poolContract: UniswapV3Pool,
  currentTick: i32,
  tickLower: i32,
  tickUpper: i32
  // feeGrowthGlobal0X128: BigInt,
  // feeGrowthGlobal1X128: BigInt
): BigInt[] {
  const tlInfo = poolContract.ticks(tickLower);
  const tuInfo = poolContract.ticks(tickUpper);

  const lowerFeeGrowthOutside0X128 = tlInfo.getFeeGrowthOutside0X128();
  const lowerFeeGrowthOutside1X128 = tlInfo.getFeeGrowthOutside1X128();
  const upperFeeGrowthOutside0X128 = tuInfo.getFeeGrowthOutside0X128();
  const upperFeeGrowthOutside1X128 = tuInfo.getFeeGrowthOutside1X128();

  let feeGrowthInside0X128: BigInt;
  let feeGrowthInside1X128: BigInt;

  if (currentTick < tickLower) {
    feeGrowthInside0X128 = lowerFeeGrowthOutside0X128.minus(
      upperFeeGrowthOutside0X128
    );
    feeGrowthInside1X128 = lowerFeeGrowthOutside1X128.minus(
      upperFeeGrowthOutside1X128
    );
  } else if (currentTick < tickUpper) {
    const feeGrowthGlobal0X128 = poolContract.feeGrowthGlobal0X128();
    const feeGrowthGlobal1X128 = poolContract.feeGrowthGlobal1X128();

    feeGrowthInside0X128 = feeGrowthGlobal0X128
      .minus(lowerFeeGrowthOutside0X128)
      .minus(upperFeeGrowthOutside0X128);
    feeGrowthInside1X128 = feeGrowthGlobal1X128
      .minus(lowerFeeGrowthOutside1X128)
      .minus(upperFeeGrowthOutside1X128);
  } else {
    feeGrowthInside0X128 = upperFeeGrowthOutside0X128.minus(
      lowerFeeGrowthOutside0X128
    );
    feeGrowthInside1X128 = upperFeeGrowthOutside1X128.minus(
      lowerFeeGrowthOutside1X128
    );
  }

  return [feeGrowthInside0X128, feeGrowthInside1X128];
}
